<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiInsight;
use App\Models\AuditLog;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * GET /api/v1/admin/stats
     * Platform overview for the admin dashboard header.
     */
    public function stats()
    {
        return response()->json([
            'users' => User::count(),
            'teams' => Team::count(),
            'projects' => Project::count(),
            'tasks' => Task::count(),
            'audit_events' => AuditLog::count(),
            'ai' => [
                'insights' => AiInsight::count(),
                'configured' => (bool) config('services.openai.key'),
                'model' => config('services.openai.model', 'gpt-4o-mini'),
            ],
        ]);
    }

    /**
     * GET /api/v1/admin/users
     * Paginated user directory with assigned-task counts.
     */
    public function users(Request $request)
    {
        $paginator = User::query()
            ->withCount('assignedTasks')
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 20));

        return response()->json([
            'data' => collect($paginator->items())->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'job_title' => $user->job_title,
                'avatar_url' => $user->avatar_url,
                'assigned_tasks_count' => (int) $user->assigned_tasks_count,
                'created_at' => $user->created_at?->toIso8601String(),
            ]),
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'last_page' => $paginator->lastPage(),
                'path' => $paginator->path(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * PATCH /api/v1/admin/users/{user}/role
     * Change a user's role. The one hard invariant: a change that would
     * leave the system with zero admins is refused (covers an admin trying
     * to demote themselves when they're the last one).
     */
    public function updateRole(Request $request, User $user)
    {
        $data = $request->validate([
            'role' => ['required', 'in:admin,manager,member'],
        ]);

        $actor = $request->user();

        // One transaction with a row lock: two concurrent demotions must not
        // both pass the "would this remove the last admin?" check.
        $allowed = DB::transaction(function () use ($user, $data, $actor) {
            $adminCount = User::where('role', 'admin')->lockForUpdate()->count();

            if ($user->role === 'admin' && $data['role'] !== 'admin' && $adminCount <= 1) {
                return false;
            }

            if ($user->role !== $data['role']) {
                $previousRole = $user->role;
                $user->forceFill(['role' => $data['role']])->save();
                AuditLog::record('user.role_changed', $user, [
                    'from' => $previousRole,
                    'to' => $data['role'],
                ], $actor->id);
            }

            return true;
        });

        if (! $allowed) {
            return response()->json([
                'message' => 'Cannot demote the last admin.',
            ], 422);
        }

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ]);
    }

    /**
     * GET /api/v1/admin/audit-logs
     * Recent security-relevant events (logins, registrations, role changes).
     */
    public function auditLogs(Request $request)
    {
        $paginator = AuditLog::with('user:id,name,email')
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 25));

        return response()->json([
            'data' => collect($paginator->items())->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                ] : null,
                'metadata' => $log->metadata,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at?->toIso8601String(),
            ]),
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'last_page' => $paginator->lastPage(),
                'path' => $paginator->path(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
