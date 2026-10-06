<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $this->addIndexIfMissing($table, ['assignee_id', 'status']);
            $this->addIndexIfMissing($table, ['status']);
            $this->addIndexIfMissing($table, ['due_date']);
            $this->addIndexIfMissing($table, ['parent_task_id']);
        });

        Schema::table('projects', function (Blueprint $table) {
            $this->addIndexIfMissing($table, ['status']);
            $this->addIndexIfMissing($table, ['team_id']);
            $this->addIndexIfMissing($table, ['created_by']);
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $this->addIndexIfMissing($table, ['user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['assignee_id', 'status']);
            $table->dropIndex(['status']);
            $table->dropIndex(['due_date']);
            $table->dropIndex(['parent_task_id']);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['team_id']);
            $table->dropIndex(['created_by']);
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });
    }

    /**
     * Add an index only if it doesn't already exist (guards against a
     * partially-applied run). Uses Schema::getIndexes so it works on
     * MySQL (production) and SQLite (tests).
     */
    private function addIndexIfMissing(Blueprint $table, array $columns): void
    {
        $expected = $table->getTable().'_'.implode('_', $columns).'_index';

        $existing = array_column(Schema::getIndexes($table->getTable()), 'name');

        if (! in_array($expected, $existing, true)) {
            $table->index($columns);
        }
    }
};
