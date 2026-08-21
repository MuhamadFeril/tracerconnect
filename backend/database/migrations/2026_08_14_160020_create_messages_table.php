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
        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained('conversations')->cascadeOnDelete();
            // Nullable: system messages (e.g. "Connection accepted") have no sender.
            $table->foreignUuid('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type')->default('text'); // text | image | file | system
            $table->text('body')->nullable();
            $table->string('attachment_path')->nullable();
            $table->string('attachment_name')->nullable();
            $table->string('attachment_mime')->nullable();
            $table->unsignedBigInteger('attachment_size')->nullable();
            $table->timestamp('deleted_at')->nullable(); // sender deletes own message
            $table->timestamps();

            $table->index('conversation_id');
            $table->index(['conversation_id', 'created_at']);
            $table->index('sender_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
