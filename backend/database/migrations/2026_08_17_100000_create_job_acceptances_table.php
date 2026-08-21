<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Hiring results ("hasil penerimaan lowongan"): recorded by the employer
     * when an application is accepted. Holds the offered position, contract
     * type, start date, salary, and notes that formalize the acceptance.
     */
    public function up(): void
    {
        Schema::create('job_acceptances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('job_application_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('job_vacancy_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('alumni_id')->nullable()->constrained('alumni')->nullOnDelete();
            $table->string('position_offered', 255)->nullable();
            // permanent|full_time|part_time|contract|internship
            $table->string('contract_type', 30)->nullable();
            $table->date('start_date')->nullable();
            $table->string('salary', 255)->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            // One acceptance result per application.
            $table->unique('job_application_id');
            $table->index(['job_vacancy_id', 'decided_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_acceptances');
    }
};
