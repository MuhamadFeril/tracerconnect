<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alumni', function (Blueprint $table) {
            if (! Schema::hasColumn('alumni', 'business_field')) {
                $table->string('business_field')->nullable()->after('position');
            }
            if (! Schema::hasColumn('alumni', 'business_start_year')) {
                $table->integer('business_start_year')->nullable()->after('business_field');
                $table->index('business_start_year');
            }
            if (! Schema::hasColumn('alumni', 'work_province')) {
                $table->string('work_province')->nullable()->after('location');
            }
            if (! Schema::hasColumn('alumni', 'work_city')) {
                $table->string('work_city')->nullable()->after('work_province');
            }
            if (! Schema::hasColumn('alumni', 'business_province')) {
                $table->string('business_province')->nullable()->after('business_address');
            }
            if (! Schema::hasColumn('alumni', 'business_city')) {
                $table->string('business_city')->nullable()->after('business_province');
            }
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
