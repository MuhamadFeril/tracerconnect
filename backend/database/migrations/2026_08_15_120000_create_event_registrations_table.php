<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_registrations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('alumni_id')->nullable()->constrained('alumni')->nullOnDelete();
            $table->boolean('attended')->default(false);
            $table->timestamp('registered_at')->useCurrent();
            $table->timestamps();

            $table->unique(['event_id', 'user_id']);
            $table->index(['event_id', 'attended']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_registrations');
    }
};
