<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alumni', function (Blueprint $table) {
            // Shared career details (working & entrepreneur).
            $table->string('business_field')->nullable()->after('position');
            $table->integer('business_start_year')->nullable()->after('business_field');

            // Working location (provinsi & kota kerja).
            $table->string('work_province')->nullable()->after('location');
            $table->string('work_city')->nullable()->after('work_province');

            // Business location (provinsi & kota usaha).
            $table->string('business_province')->nullable()->after('business_address');
            $table->string('business_city')->nullable()->after('business_province');

            $table->index('business_start_year');
        });
    }

    public function down(): void
    {
        Schema::table('alumni', function (Blueprint $table) {
            $table->dropIndex(['business_start_year']);
            $table->dropColumn([
                'business_field',
                'business_start_year',
                'work_province',
                'work_city',
                'business_province',
                'business_city',
            ]);
        });
    }
};
