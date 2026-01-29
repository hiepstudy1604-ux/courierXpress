<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_assignment_history', function (Blueprint $table) {
            $table->id('history_id');
            $table->unsignedBigInteger('assignment_id');
            $table->unsignedBigInteger('shipment_id');
            $table->string('assignment_type', 20);
            $table->unsignedBigInteger('old_driver_id')->nullable();
            $table->unsignedBigInteger('new_driver_id')->nullable();
            $table->string('old_status', 30)->nullable();
            $table->string('new_status', 30)->nullable();
            $table->string('change_action', 50);
            $table->string('changed_by_type', 20);
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->dateTime('changed_at');
            $table->text('note')->nullable();
            $table->timestamps();
            
            $table->foreign('assignment_id')
                ->references('assignment_id')
                ->on('driver_assignment')
                ->onDelete('cascade');
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->index('assignment_id');
            $table->index('shipment_id');
            $table->index('changed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_assignment_history');
    }
};
