<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Employer-created vacancies are published across all schools, so they
     * are not tied to a single institution. Staff-created vacancies remain
     * tenant-scoped.
     */
    public function up(): void
    {
        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->foreignUuid('institution_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->foreignUuid('institution_id')->nullable(false)->change();
        });
    }
};
