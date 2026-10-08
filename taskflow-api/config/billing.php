<?php

/**
 * Billing plans and limits. `plans` table rows are provisioned from here
 * (see Plan::resolve + PlanSeeder), so this file is the source of truth.
 * Amounts are Stripe minor units (cents). Yearly prices default to ~20% off.
 */
return [
    // Kill-switch: when false every /billing route answers 503.
    'enabled' => env('BILLING_ENABLED', true),

    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),

    'free' => [
        'name' => 'Free',
        'max_members' => 3,
        'max_projects' => 3,
        'max_imports_monthly' => 2,
        'max_ai_messages_monthly' => 50,
        'stripe_price_monthly' => null,
        'stripe_price_yearly' => null,
    ],

    'pro' => [
        'name' => 'Pro',
        'max_members' => 15,
        'max_projects' => 25,
        'max_imports_monthly' => 50,
        'max_ai_messages_monthly' => 1000,
        'amount_monthly' => 1400, // $14
        'amount_yearly' => 13440, // $134.40 (~20% off)
        'stripe_price_monthly' => env('STRIPE_PRICE_PRO_MONTHLY'),
        'stripe_price_yearly' => env('STRIPE_PRICE_PRO_YEARLY'),
    ],

    'team' => [
        'name' => 'Team',
        'max_members' => 50,
        'max_projects' => 100,
        'max_imports_monthly' => 200,
        'max_ai_messages_monthly' => 5000,
        'amount_monthly' => 2900, // $29
        'amount_yearly' => 27840, // $232.80 (~20% off)
        'stripe_price_monthly' => env('STRIPE_PRICE_TEAM_MONTHLY'),
        'stripe_price_yearly' => env('STRIPE_PRICE_TEAM_YEARLY'),
    ],

    'keys' => ['free', 'pro', 'team'],

    'metrics' => ['members', 'projects', 'plan_imports', 'ai_messages'],
];
