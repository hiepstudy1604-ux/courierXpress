<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_task_event', function (Blueprint $table) {
            $table->id('task_event_id');
            $table->unsignedBigInteger('task_id');
            $table->string('event_type', 50);
            $table->dateTime('event_at');
            $table->string('actor_type', 20)->nullable();
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('old_status', 30)->nullable();
            $table->string('new_status', 30)->nullable();
            $table->text('message')->nullable();
            
            $table->foreign('task_id')
                ->references('task_id')
                ->on('admin_task')
                ->onDelete('cascade');
            
            $table->index('task_id');
            $table->index('event_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_task_event');
    }
};
