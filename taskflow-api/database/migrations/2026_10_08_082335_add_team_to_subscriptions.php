<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cashier 16 keys subscriptions to users; TaskFlow bills teams, so
        // subscriptions carry a team link too (user_id holds the team owner
        // to satisfy Cashier's non-nullable column).
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->index(['team_id', 'stripe_status']);
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['team_id', 'stripe_status']);
            $table->dropForeign(['team_id']);
            $table->dropColumn('team_id');
        });
    }
};
