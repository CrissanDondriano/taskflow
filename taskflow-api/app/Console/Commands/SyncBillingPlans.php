<?php

namespace App\Console\Commands;

use App\Models\Plan;
use Illuminate\Console\Command;
use Laravel\Cashier\Cashier;

/**
 * Create Stripe test products + monthly/yearly prices for the paid plans
 * and print the .env lines to paste. TEST MODE ONLY — it refuses live keys.
 *
 * Usage:
 *   STRIPE_SECRET=sk_test_... php artisan billing:sync-plans
 *   # paste the printed STRIPE_PRICE_* lines into .env
 *   php artisan billing:sync-plans --refresh   # also writes the ids into plans rows
 */
class SyncBillingPlans extends Command
{
    protected $signature = 'billing:sync-plans {--refresh : Write the created price IDs back into the plans table}';

    protected $description = 'Create Stripe test products/prices for paid plans and print the .env lines';

    public function handle(): int
    {
        $secret = (string) config('cashier.secret', env('STRIPE_SECRET'));
        if ($secret === '') {
            $this->error('STRIPE_SECRET is not set. Nothing to sync against.');

            return self::FAILURE;
        }
        if (! str_starts_with($secret, 'sk_test_')) {
            $this->error('Refusing to run against a LIVE key. billing:sync-plans is test-mode only.');

            return self::FAILURE;
        }

        $stripe = Cashier::stripe();
        $lines = [];

        foreach (['pro', 'team'] as $key) {
            $config = config("billing.{$key}");
            $product = $stripe->products->create([
                'name' => "TaskFlow {$config['name']}",
                'metadata' => ['plan' => $key, 'env' => 'test'],
            ]);

            foreach (['monthly', 'yearly'] as $interval) {
                $months = $interval === 'monthly' ? 1 : 12;
                $price = $stripe->prices->create([
                    'product' => $product->id,
                    'unit_amount' => $config["amount_{$interval}"],
                    'currency' => 'usd',
                    'recurring' => ['interval' => $months === 1 ? 'month' : 'year'],
                    'metadata' => ['plan' => $key, 'interval' => $interval, 'env' => 'test'],
                ]);
                $envKey = 'STRIPE_PRICE_'.strtoupper($key).'_'.strtoupper($interval);
                $lines[] = "{$envKey}={$price->id}";
                $this->info("{$config['name']} {$interval}: {$price->id}");

                if ($this->option('refresh')) {
                    Plan::resolve($key)->forceFill(["stripe_price_{$interval}" => $price->id])->save();
                }
            }
        }

        $this->line('');
        $this->comment('Paste into .env:');
        foreach ($lines as $line) {
            $this->line($line);
        }

        return self::SUCCESS;
    }
}
