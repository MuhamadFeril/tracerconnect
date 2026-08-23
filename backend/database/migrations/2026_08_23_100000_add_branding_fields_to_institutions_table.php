<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            $table->string('primary_color')->nullable()->after('logo_path'); // Brand primary color hex
            $table->string('favicon_path')->nullable()->after('primary_color');
            $table->string('cover_image_path')->nullable()->after('favicon_path');
            $table->text('report_header')->nullable(); // Custom header for PDF reports
            $table->text('report_footer')->nullable(); // Custom footer for PDF reports
            $table->text('custom_footer')->nullable(); // Custom footer text for landing/app
            $table->string('contact_email')->nullable()->after('custom_footer');
            $table->string('contact_phone')->nullable()->after('contact_email');
            $table->text('about')->nullable(); // About institution text
        });
    }

    public function down(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            $table->dropColumn([
                'primary_color',
                'favicon_path',
                'cover_image_path',
                'report_header',
                'report_footer',
                'custom_footer',
                'contact_email',
                'contact_phone',
                'about',
            ]);
        });
    }
};
