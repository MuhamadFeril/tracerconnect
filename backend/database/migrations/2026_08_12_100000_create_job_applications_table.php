<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Career center: alumni applications to job vacancies.
     *
     * Tenant isolation is implicit — the row links to a job vacancy, which
     * links to an institution (see JobApplicationPolicy and the controller
     * queries that scope through the vacancy).
     */
    public function up(): void
    {
        Schema::create('job_applications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('job_vacancy_id')->constrained('job_vacancies')->cascadeOnDelete();
            $table->foreignUuid('applicant_id')->constrained('users')->cascadeOnDelete();
            $table->text('message')->nullable();
            $table->string('status')->default('pending'); // pending | reviewed | accepted | rejected | cancelled
            $table->timestamps();

            $table->unique(['job_vacancy_id', 'applicant_id']);
            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_applications');
    }
};
