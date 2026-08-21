<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alumni', function (Blueprint $table) {
            if (! Schema::hasColumn('alumni', 'study_institution')) {
                $table->string('study_institution')->nullable()->after('position');
            }
            if (! Schema::hasColumn('alumni', 'study_program')) {
                $table->string('study_program')->nullable()->after('study_institution');
            }
            if (! Schema::hasColumn('alumni', 'study_entry_year')) {
                $table->integer('study_entry_year')->nullable()->after('study_program');
                $table->index('study_entry_year');
            }
            if (! Schema::hasColumn('alumni', 'business_name')) {
                $table->string('business_name')->nullable()->after('location');
            }
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
