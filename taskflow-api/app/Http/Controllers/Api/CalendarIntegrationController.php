<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Integration;
use App\Models\Team;
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
            ->with(['access_type' => 'offline', 'prompt' => 'consent', 'state' => encrypt($team->id)])
            ->redirect()
            ->getTargetUrl();

        return response()->json(['redirect_url' => $url]);
    }

    public function handleGoogleCallback(Request $request)
    {
        $team = Team::findOrFail(decrypt($request->query('state')));

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
            ->with(['state' => encrypt($team->id)])
            ->redirect()
            ->getTargetUrl();

        return response()->json(['redirect_url' => $url]);
    }

    public function handleOutlookCallback(Request $request)
    {
        $team = Team::findOrFail(decrypt($request->query('state')));

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
}
