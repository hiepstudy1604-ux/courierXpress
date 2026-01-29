<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_assignment', function (Blueprint $table) {
            $table->id('assignment_id');
            $table->unsignedBigInteger('shipment_id');
            $table->string('assignment_type', 20);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('driver_id');
            $table->string('status', 30)->default('ASSIGNED');
            $table->string('assigned_by_type', 20)->default('SYSTEM');
            $table->unsignedBigInteger('assigned_by')->nullable();
            $table->dateTime('assigned_at');
            $table->dateTime('accepted_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->dateTime('eta_at')->nullable();
            $table->decimal('distance_km', 10, 2)->nullable();
            $table->text('note')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->foreign('driver_id')
                ->references('driver_id')
                ->on('driver')
                ->onDelete('cascade');
            
            $table->foreign('branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('set null');
            
            $table->index('shipment_id');
            $table->index('driver_id');
            $table->index('branch_id');
            $table->index('status');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_assignment');
    }
};
