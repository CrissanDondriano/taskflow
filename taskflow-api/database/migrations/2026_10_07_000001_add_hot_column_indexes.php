<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Indexes for columns that are sorted/filtered but were missed by the
     * first indexing pass: the admin audit-log feed (orderByDesc created_at),
     * report windows grouped on completed_at, and the kanban's orderBy
     * position.
     */
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $this->addIndexIfMissing($table, ['created_at']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $this->addIndexIfMissing($table, ['completed_at']);
            $this->addIndexIfMissing($table, ['position']);
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['completed_at']);
            $table->dropIndex(['position']);
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
