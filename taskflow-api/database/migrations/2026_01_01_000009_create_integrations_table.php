<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Generic table so the same shape covers Slack, Discord, Zoom,
        // Google Drive, Dropbox, Google Calendar, and Outlook.
        Schema::create('integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('connected_by')->constrained('users')->cascadeOnDelete();
            $table->enum('provider', ['slack', 'discord', 'zoom', 'google_calendar', 'outlook', 'google_drive', 'dropbox']);
            $table->json('credentials'); // webhook url, oauth tokens, workspace/channel ids, etc.
            $table->boolean('is_active')->default(true);
            $table->timestamp('connected_at')->nullable();
            $table->timestamps();

            $table->unique(['team_id', 'provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integrations');
    }
};
