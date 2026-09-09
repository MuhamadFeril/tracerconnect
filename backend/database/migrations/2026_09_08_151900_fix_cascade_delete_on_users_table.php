<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Change all cascadeOnDelete FKs pointing to users → nullOnDelete.
     *
     * cascadeOnDelete is incompatible with soft-deletes: if a user is ever
     * hard-deleted, all child rows get silently destroyed. nullOnDelete
     * preserves data by setting the FK to NULL instead.
     *
     * Columns that were NOT NULL are made nullable first (required by MySQL
     * for SET NULL / ON DELETE SET NULL).
     */
    public function up(): void
    {
        $foreignKeys = [
            'survey_responses'         => 'respondent_id',
            'connections'              => 'requester_id',
            'connections'              => 'receiver_id',
            'blocked_users'            => 'blocker_id',
            'blocked_users'            => 'blocked_id',
            'reports'                  => 'reporter_id',
            'reports'                  => 'reported_id',
            'conversation_participants'=> 'user_id',
            'message_reads'            => 'user_id',
            'conversation_reports'     => 'reporter_id',
            'job_applications'         => 'user_id',
            'job_bookmarks'            => 'user_id',
            'event_registrations'      => 'user_id',
            'fcm_tokens'               => 'user_id',
        ];

        // Group by table to avoid duplicate ALTER per table.
        $byTable = [];
        foreach ($foreignKeys as $table => $column) {
            $byTable[$table][] = $column;
        }

        foreach ($byTable as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            // 1) Drop old FKs.
            foreach ($columns as $column) {
                if (! Schema::hasColumn($table, $column)) {
                    continue;
                }
                $fkName = "{$table}_{$column}_foreign";
                try {
                    Schema::table($table, function (Blueprint $q) use ($fkName) {
                        $q->dropForeign($fkName);
                    });
                } catch (\Throwable $e) {
                    // FK doesn't exist — skip.
                }
            }

            // 2) Make columns nullable (MySQL requires this for ON DELETE SET NULL).
            foreach ($columns as $column) {
                if (! Schema::hasColumn($table, $column)) {
                    continue;
                }
                // Use raw ALTER for broad Laravel version compat.
                $colType = DB::select("SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?", [$table, $column]);
                $sqlType = $colType[0]->DATA_TYPE ?? 'varchar(255)';
                if (str_starts_with($sqlType, 'varchar')) {
                    $sqlType = str_replace(')', ', nullable)', $sqlType);
                } else {
                    $sqlType .= ' NULL';
                }
                DB::statement("ALTER TABLE `{$table}` MODIFY COLUMN `{$column}` {$sqlType} DEFAULT NULL");
            }

            // 3) Re-create FKs with nullOnDelete.
            foreach ($columns as $column) {
                if (! Schema::hasColumn($table, $column)) {
                    continue;
                }
                Schema::table($table, function (Blueprint $q) use ($column) {
                    $q->foreign($column)
                        ->references('id')
                        ->on('users')
                        ->nullOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        $foreignKeys = [
            'survey_responses'         => 'respondent_id',
            'connections'              => 'requester_id',
            'connections'              => 'receiver_id',
            'blocked_users'            => 'blocker_id',
            'blocked_users'            => 'blocked_id',
            'reports'                  => 'reporter_id',
            'reports'                  => 'reported_id',
            'conversation_participants'=> 'user_id',
            'message_reads'            => 'user_id',
            'conversation_reports'     => 'reporter_id',
            'job_applications'         => 'user_id',
            'job_bookmarks'            => 'user_id',
            'event_registrations'      => 'user_id',
            'fcm_tokens'               => 'user_id',
        ];

        $byTable = [];
        foreach ($foreignKeys as $table => $column) {
            $byTable[$table][] = $column;
        }

        foreach ($byTable as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            foreach ($columns as $column) {
                if (! Schema::hasColumn($table, $column)) {
                    continue;
                }
                $fkName = "{$table}_{$column}_foreign";
                try {
                    Schema::table($table, function (Blueprint $q) use ($fkName) {
                        $q->dropForeign($fkName);
                    });
                } catch (\Throwable $e) {
                    // skip
                }
            }

            foreach ($columns as $column) {
                if (! Schema::hasColumn($table, $column)) {
                    continue;
                }
                Schema::table($table, function (Blueprint $q) use ($column) {
                    $q->foreign($column)
                        ->references('id')
                        ->on('users')
                        ->cascadeOnDelete();
                });
            }
        }
    }
};
