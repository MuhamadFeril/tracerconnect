<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('job_vacancies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->string('title');
            $table->string('company_name');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->string('employment_type')->nullable(); // full_time | part_time | internship | contract | freelance
            $table->string('application_link')->nullable();
            $table->string('status')->default('draft'); // draft | published | closed
            $table->timestamp('posted_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('institution_id');
            $table->index(['status', 'employment_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_vacancies');
    }
};
