<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Integration;
use App\Models\Team;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

class CalendarIntegrationController extends Controller
{
    /**
     * GET /api/teams/{team}/integrations/google-calendar/redirect
     * Returns the URL the frontend should send the user to. We use
     * stateless() + a signed team_id query param instead of session state,
     * since this is an API consumed by a separate SPA.
     */
    public function redirectToGoogle(Request $request, Team $team)
    {
        $this->authorize('update', $team);

        $url = Socialite::driver('google')
            ->stateless()
            ->scopes(['https://www.googleapis.com/auth/calendar.events'])
            ->with(['access_type' => 'offline', 'prompt' => 'consent', 'state' => $this->stateFor($team)])
            ->redirect()
            ->getTargetUrl();

        return response()->json(['redirect_url' => $url]);
    }

    public function handleGoogleCallback(Request $request)
    {
        if ($request->query('error')) {
            return response()->json(['message' => 'Calendar connection was cancelled or denied.'], 400);
        }

        $team = $this->teamFromState($request);

        $googleUser = Socialite::driver('google')->stateless()->user();

        Integration::updateOrCreate(
            ['team_id' => $team->id, 'provider' => 'google_calendar'],
            [
                'connected_by' => $request->user()?->id ?? $team->owner_id,
                'credentials' => [
                    'access_token' => $googleUser->token,
                    'refresh_token' => $googleUser->refreshToken,
                    'expires_at' => now()->addSeconds($googleUser->expiresIn ?? 3600)->toIso8601String(),
                    'account_email' => $googleUser->getEmail(),
                ],
                'is_active' => true,
                'connected_at' => now(),
            ]
        );

        return response()->json(['message' => 'Google Calendar connected.']);
    }

    /**
     * GET /api/teams/{team}/integrations/outlook/redirect
     * Requires the socialiteproviders/microsoft-azure package (see README) —
     * Socialite doesn't ship a Microsoft driver out of the box.
     */
    public function redirectToOutlook(Request $request, Team $team)
    {
        $this->authorize('update', $team);

        $url = Socialite::driver('azure')
            ->stateless()
            ->scopes(['offline_access', 'Calendars.ReadWrite'])
            ->with(['state' => $this->stateFor($team)])
            ->redirect()
            ->getTargetUrl();

        return response()->json(['redirect_url' => $url]);
    }

    public function handleOutlookCallback(Request $request)
    {
        if ($request->query('error')) {
            return response()->json(['message' => 'Calendar connection was cancelled or denied.'], 400);
        }

        $team = $this->teamFromState($request);

        $msUser = Socialite::driver('azure')->stateless()->user();

        Integration::updateOrCreate(
            ['team_id' => $team->id, 'provider' => 'outlook'],
            [
                'connected_by' => $request->user()?->id ?? $team->owner_id,
                'credentials' => [
                    'access_token' => $msUser->token,
                    'refresh_token' => $msUser->refreshToken,
                    'expires_at' => now()->addSeconds($msUser->expiresIn ?? 3600)->toIso8601String(),
                    'account_email' => $msUser->getEmail(),
                ],
                'is_active' => true,
                'connected_at' => now(),
            ]
        );

        return response()->json(['message' => 'Outlook Calendar connected.']);
    }

    /**
     * Signed, expiring state for the OAuth round-trip. 15 minutes is plenty
     * for a human to finish consenting on Google/Microsoft's side, and stops
     * a captured callback URL from being replayed forever.
     */
    private function stateFor(Team $team): string
    {
        return encrypt(json_encode([
            'team_id' => $team->id,
            'exp' => now()->addMinutes(15)->getTimestamp(),
        ]));
    }

    /**
     * Resolve + validate the state param. A missing/corrupt/expired state
     * must return 400 JSON instead of a raw 500 from decrypt()/findOrFail().
     */
    private function teamFromState(Request $request): Team
    {
        $state = $request->query('state');

        if (! is_string($state) || $state === '') {
            abort(response()->json(['message' => 'Missing OAuth state parameter.'], 400));
        }

        try {
            $payload = decrypt($state);
        } catch (DecryptException) {
            abort(response()->json(['message' => 'Invalid OAuth state parameter.'], 400));
        }

        $teamId = is_array($payload) ? ($payload['team_id'] ?? null) : $payload;

        if (is_array($payload) && (int) ($payload['exp'] ?? 0) < now()->getTimestamp()) {
            abort(response()->json(['message' => 'OAuth state has expired. Please retry the connection.'], 400));
        }

        if (! is_numeric($teamId)) {
            abort(response()->json(['message' => 'Invalid OAuth state parameter.'], 400));
        }

        return Team::findOrFail($teamId);
    }
}
