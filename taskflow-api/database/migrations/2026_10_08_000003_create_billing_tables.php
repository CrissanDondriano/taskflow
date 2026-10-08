<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->unsignedInteger('max_members')->nullable();
            $table->unsignedInteger('max_projects')->nullable();
            $table->unsignedInteger('max_imports_monthly')->nullable();
            $table->unsignedInteger('max_ai_messages_monthly')->nullable();
            $table->string('stripe_price_monthly')->nullable();
            $table->string('stripe_price_yearly')->nullable();
            $table->timestamps();
        });

        Schema::create('usage_counters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('metric');
            // Billing month as YYYY-MM — a new month is implicitly a fresh
            // quota, so no cron or reset job is needed.
            $table->string('period', 7);
            $table->unsignedInteger('count')->default(0);
            $table->timestamps();

            $table->unique(['team_id', 'metric', 'period']);
        });

        Schema::create('webhook_events', function (Blueprint $table) {
            // Stripe event id is the primary key: the insert-or-ignore in the
            // webhook controller makes redeliveries no-ops (idempotency).
            $table->string('id')->primary();
            $table->string('type');
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_events');
        Schema::dropIfExists('usage_counters');
        Schema::dropIfExists('plans');
    }
};
