<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'key', 'name', 'max_members', 'max_projects',
        'max_imports_monthly', 'max_ai_messages_monthly',
        'stripe_price_monthly', 'stripe_price_yearly',
    ];

    /**
     * Find-or-create from config/billing.php so plans always exist — tests,
     * fresh installs and webhook handlers never hit a missing row.
     */
    public static function resolve(string $key): self
    {
        $config = config("billing.{$key}");
        if (! is_array($config)) {
            throw new \InvalidArgumentException("Unknown plan: {$key}.");
        }

        return static::firstOrCreate(
            ['key' => $key],
            [
                'name' => $config['name'],
                'max_members' => $config['max_members'],
                'max_projects' => $config['max_projects'],
                'max_imports_monthly' => $config['max_imports_monthly'],
                'max_ai_messages_monthly' => $config['max_ai_messages_monthly'],
                'stripe_price_monthly' => $config['stripe_price_monthly'] ?? null,
                'stripe_price_yearly' => $config['stripe_price_yearly'] ?? null,
            ]
        );
    }

    public static function free(): self
    {
        return static::resolve('free');
    }

    /** null limit = unlimited. */
    public function limitFor(string $metric): ?int
    {
        return match ($metric) {
            'members' => $this->max_members,
            'projects' => $this->max_projects,
            'plan_imports' => $this->max_imports_monthly,
            'ai_messages' => $this->max_ai_messages_monthly,
            default => null,
        };
    }

    /** Stripe price id → [plan, interval], or null when unmapped. */
    public static function fromStripePrice(?string $priceId): ?array
    {
        if (! $priceId) {
            return null;
        }
        foreach (config('billing.keys', []) as $key) {
            $config = config("billing.{$key}");
            foreach (['monthly', 'yearly'] as $interval) {
                if (($config["stripe_price_{$interval}"] ?? null) === $priceId) {
                    return [$key, $interval];
                }
            }
        }

        return null;
    }
}
