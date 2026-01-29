<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pickup_schedule_history', function (Blueprint $table) {
            $table->id('history_id');
            $table->unsignedBigInteger('pickup_schedule_id');
            $table->unsignedBigInteger('shipment_id');
            $table->dateTime('old_start_at')->nullable();
            $table->dateTime('old_end_at')->nullable();
            $table->dateTime('new_start_at');
            $table->dateTime('new_end_at');
            $table->string('change_reason', 50);
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->dateTime('changed_at');
            $table->string('note', 255)->nullable();
            $table->timestamps();
            
            $table->foreign('pickup_schedule_id')
                ->references('pickup_schedule_id')
                ->on('pickup_schedule')
                ->onDelete('cascade');
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->index('shipment_id');
            $table->index('pickup_schedule_id');
            $table->index('changed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pickup_schedule_history');
    }
};
