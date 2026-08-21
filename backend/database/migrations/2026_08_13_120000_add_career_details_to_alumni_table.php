<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alumni', function (Blueprint $table) {
            // Further study (kuliah) details.
            $table->string('study_institution')->nullable()->after('position');
            $table->string('study_program')->nullable()->after('study_institution');
            $table->integer('study_entry_year')->nullable()->after('study_program');
            // Entrepreneurship (wirausaha) details.
            $table->string('business_name')->nullable()->after('location');
            $table->index('study_entry_year');
        });
    }

    public function down(): void
    {
        Schema::table('alumni', function (Blueprint $table) {
            $table->dropIndex(['study_entry_year']);
            $table->dropColumn(['study_institution', 'study_program', 'study_entry_year', 'business_name']);
        });
    }
};
