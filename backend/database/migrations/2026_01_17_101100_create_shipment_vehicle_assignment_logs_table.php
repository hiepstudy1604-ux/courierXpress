<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipment_vehicle_assignment_logs', function (Blueprint $table) {
            $table->id('log_id');
            $table->unsignedBigInteger('shipment_id');
            $table->unsignedBigInteger('vehicle_id');
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('assigned_by')->nullable();
            $table->dateTime('assigned_at');
            $table->text('note')->nullable();
            $table->timestamps();
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->foreign('vehicle_id')
                ->references('vehicle_id')
                ->on('vehicles')
                ->onDelete('cascade');
            
            $table->foreign('branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('cascade');
            
            $table->index('shipment_id');
            $table->index('vehicle_id');
            $table->index('branch_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_vehicle_assignment_logs');
    }
};
