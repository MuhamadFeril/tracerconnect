<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('villages', function (Blueprint $table) {
            $table->id();

            $table->foreignId('district_id')
                ->constrained('districts')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->string('code', 20)->unique();
            $table->string('name');

            $table->string('postal_code', 10)->nullable();

            $table->timestamps();

            $table->index('district_id');
            $table->index('postal_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('villages');
    }
};