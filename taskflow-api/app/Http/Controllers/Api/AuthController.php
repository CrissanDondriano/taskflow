<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        // 'role' is deliberately not mass-assignable (see User::$fillable);
        // users.role defaults to 'member', so self-registration can never
        // grant itself admin.
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        AuditLog::record('auth.register', $user, ['email' => $user->email], $user->id);

        $token = $user->createToken('taskflow')->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        $user = User::where('email', $credentials['email'])->firstOrFail();
        $token = $user->createToken('taskflow')->plainTextToken;

        AuditLog::record('auth.login', $user, ['email' => $user->email], $user->id);

        return response()->json(['user' => $user, 'token' => $token]);
    }

    public function logout(Request $request)
    {
        $token = $request->user()->currentAccessToken();

        // TransientToken (stateful/Sanctum-SPA auth) has no delete() — only
        // revoke actual personal access tokens.
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($request->user()->id)],
        ]);

        $user = $request->user();

        if ($user->email !== $data['email']) {
            // Reset links are keyed by email — retire the old ones so a stale
            // token can't linger on an address the account no longer owns.
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
        }

        $user->fill($data)->save();

        AuditLog::record('auth.profile_updated', $user, ['email' => $user->email], $user->id);

        // Same bare shape as `me` so the SPA can swap the user in directly.
        return response()->json($user);
    }

    public function destroy(Request $request)
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();
        $oldEmail = $user->email;

        DB::transaction(function () use ($user, $oldEmail) {
            // 1. Hand every team the user owns to a surviving member
            //    (preferring managers, then team leads). A team only the
            //    departing user belonged to goes with them.
            foreach (Team::where('owner_id', $user->id)->get() as $team) {
                $successor = $team->members()
                    ->where('users.id', '!=', $user->id)
                    ->orderByRaw("case users.role when 'admin' then 0 when 'manager' then 1 else 2 end")
                    ->orderByRaw("case team_user.role_in_team when 'lead' then 0 else 1 end")
                    ->orderBy('users.id')
                    ->value('users.id');

                if ($successor) {
                    $team->update(['owner_id' => $successor]);
                } else {
                    $team->delete();
                }
            }

            // 2. created_by/connected_by are NOT NULL cascade columns: before
            //    the delete, re-point shared rows to the surviving team owner
            //    so co-workers don't lose the team's projects, tasks, or
            //    integrations. Anything with no surviving owner is genuinely
            //    personal and cascades away with the account.
            foreach (DB::table('projects')->where('created_by', $user->id)->get() as $project) {
                $owner = $project->team_id ? DB::table('teams')->where('id', $project->team_id)->value('owner_id') : null;
                if ($owner && $owner != $user->id) {
                    DB::table('projects')->where('id', $project->id)->update(['created_by' => $owner]);
                }
            }

            foreach (DB::table('tasks')->where('created_by', $user->id)->get() as $task) {
                $creator = DB::table('projects')->where('id', $task->project_id)->value('created_by');
                if ($creator && $creator != $user->id) {
                    DB::table('tasks')->where('id', $task->id)->update(['created_by' => $creator]);
                }
            }

            foreach (DB::table('integrations')->where('connected_by', $user->id)->get() as $integration) {
                $owner = DB::table('teams')->where('id', $integration->team_id)->value('owner_id');
                if ($owner && $owner != $user->id) {
                    DB::table('integrations')->where('id', $integration->id)->update(['connected_by' => $owner]);
                }
            }

            // 3. Personal residue goes now: sessions, bearer tokens,
            //    notifications, and password-reset links.
            DB::table('sessions')->where('user_id', $user->id)->delete();
            DB::table('password_reset_tokens')->where('email', $oldEmail)->delete();
            DB::table('notifications')
                ->where('notifiable_type', $user->getMorphClass())
                ->where('notifiable_id', $user->id)
                ->delete();
            $user->tokens()->delete();

            // Recorded while the FK still resolves — audit_logs.user_id is
            // nullOnDelete, so the trail survives the delete (user_id nulled).
            AuditLog::record('auth.account_deleted', $user, ['email' => $oldEmail], $user->id);

            // 4. The delete itself cascades what remains: team memberships,
            //    sole-owner teams, and the user's personal projects/tasks.
            $user->delete();
        });

        return response()->json(['message' => 'Account deleted.']);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['message' => 'Reset link sent.']);
        }

        // Standard validation envelope so the SPA can map the error to the
        // email field (same shape as every other 422 in this API).
        throw ValidationException::withMessages([
            'email' => [$status === Password::INVALID_USER
                ? "We can't find a user with that email address."
                : 'Unable to send reset link. Please try again.'],
        ]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset($data, function ($user, $password) {
            $user->forceFill(['password' => Hash::make($password)])->save();
        });

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password reset.']);
        }

        throw ValidationException::withMessages([
            $status === Password::INVALID_TOKEN ? 'token' : 'email' => [$status === Password::INVALID_USER
                ? "We can't find a user with that email address."
                : 'This password reset token is invalid or has expired.'],
        ]);
    }
}
