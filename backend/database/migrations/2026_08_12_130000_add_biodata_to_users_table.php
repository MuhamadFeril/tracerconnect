<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Users without a linked alumni record (admins, operators, etc.) still
     * need an editable profile, so their biodata lives on the users table.
     * Alumni accounts keep using the alumni table columns instead.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('gender')->nullable()->after('avatar_path');
            $table->string('phone')->nullable()->after('gender');
            $table->date('birth_date')->nullable()->after('phone');
            $table->string('birthplace')->nullable()->after('birth_date');
            $table->string('birthplace_regency')->nullable()->after('birthplace');
            $table->string('birthplace_province')->nullable()->after('birthplace_regency');
            $table->string('address', 1000)->nullable()->after('birthplace_province');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'gender',
                'phone',
                'birth_date',
                'birthplace',
                'birthplace_regency',
                'birthplace_province',
                'address',
            ]);
        });
    }
};
