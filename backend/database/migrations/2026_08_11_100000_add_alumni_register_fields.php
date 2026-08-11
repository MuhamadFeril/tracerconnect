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
        Schema::table('alumni', function (Blueprint $table) {
            $table->string('nisn')->nullable()->after('nis_nim');
            $table->integer('entry_year')->nullable()->after('nisn');
            $table->string('birthplace')->nullable()->after('birth_date');
            $table->json('socials')->nullable()->after('location');
            $table->json('skills')->nullable()->after('socials');

            $table->index('entry_year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('alumni', function (Blueprint $table) {
            $table->dropIndex(['entry_year']);
            $table->dropColumn(['nisn', 'entry_year', 'birthplace', 'socials', 'skills']);
        });
    }
};
