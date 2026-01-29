<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_log', function (Blueprint $table) {
            $table->id('call_log_id');
            $table->unsignedBigInteger('shipment_id');
            $table->unsignedBigInteger('assignment_id')->nullable();
            $table->string('call_type', 30);
            $table->string('target_role', 30);
            $table->string('target_phone', 20);
            $table->unsignedBigInteger('driver_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->integer('attempt_no');
            $table->dateTime('call_started_at');
            $table->dateTime('call_ended_at')->nullable();
            $table->string('call_result', 30)->nullable();
            $table->integer('duration_seconds')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->foreign('assignment_id')
                ->references('assignment_id')
                ->on('driver_assignment')
                ->onDelete('set null');
            
            $table->foreign('driver_id')
                ->references('driver_id')
                ->on('driver')
                ->onDelete('set null');
            
            $table->foreign('branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('set null');
            
            $table->index('shipment_id');
            $table->index('assignment_id');
            $table->index('driver_id');
            $table->index('branch_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_log');
    }
};
