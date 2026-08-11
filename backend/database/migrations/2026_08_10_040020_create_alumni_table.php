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
        Schema::create('alumni', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nis_nim')->nullable();
            $table->string('name');
            $table->string('gender')->nullable(); // male | female
            $table->date('birth_date')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignUuid('graduation_year_id')->nullable()->constrained('graduation_years')->nullOnDelete();
            $table->string('employment_status')->nullable(); // working | unemployed | entrepreneur | continuing_study
            $table->string('company_name')->nullable();
            $table->string('position')->nullable();
            $table->string('location')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['institution_id', 'nis_nim']);
            $table->index('institution_id');
            $table->index('name');
            $table->index('department_id');
            $table->index('graduation_year_id');
            $table->index('employment_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alumni');
    }
};
