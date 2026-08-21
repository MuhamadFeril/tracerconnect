<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Repair drift: the job_applications table was originally migrated before
     * soft deletes were added to the migration, so existing databases are
     * missing `deleted_at` and every query touching job_applications fails
     * with "Unknown column". Fresh installs already have the column (guarded
     * below so this migration is a no-op there).
     */
    public function up(): void
    {
        if (Schema::hasTable('job_applications') && ! Schema::hasColumn('job_applications', 'deleted_at')) {
            Schema::table('job_applications', function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('job_applications', 'deleted_at')) {
            Schema::table('job_applications', function (Blueprint $table) {
                $table->dropColumn('deleted_at');
            });
        }
    }
};
