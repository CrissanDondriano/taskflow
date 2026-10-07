<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_email_links_to_the_frontend_reset_page(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('message', 'Reset link sent.');

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            $mail = $notification->toMail($user);

            return str_contains($mail->actionUrl, '/reset-password?token=')
                && str_contains($mail->actionUrl, 'email='.urlencode($user->email));
        });
    }

    public function test_forgot_password_unknown_email_returns_422(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/forgot-password', ['email' => 'nobody@example.com'])
            ->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors' => ['email']])
            ->assertJsonPath('message', "We can't find a user with that email address.");
    }

    public function test_reset_password_with_emailed_token_changes_the_password(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/forgot-password', ['email' => $user->email])->assertOk();

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user, &$token): bool {
            parse_str(parse_url($notification->toMail($user)->actionUrl, PHP_URL_QUERY) ?? '', $query);
            $token = $query['token'] ?? null;

            return $token !== null;
        });

        $this->postJson('/api/v1/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'brandnewpass123',
            'password_confirmation' => 'brandnewpass123',
        ])->assertOk()
            ->assertJsonPath('message', 'Password reset.');

        $this->assertTrue(Hash::check('brandnewpass123', $user->fresh()->password));
    }
}
