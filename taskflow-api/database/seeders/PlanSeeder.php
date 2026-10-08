<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        foreach (config('billing.keys', []) as $key) {
            Plan::resolve($key);
        }
    }
}
