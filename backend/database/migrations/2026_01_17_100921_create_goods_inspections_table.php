<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('goods_inspection', function (Blueprint $table) {
            $table->id('inspection_id');
            $table->unsignedBigInteger('shipment_id');
            $table->unsignedBigInteger('assignment_id')->nullable();
            $table->unsignedBigInteger('driver_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->dateTime('inspected_at');
            $table->decimal('actual_weight_kg', 10, 2);
            $table->decimal('actual_length_cm', 10, 2)->nullable();
            $table->decimal('actual_width_cm', 10, 2)->nullable();
            $table->decimal('actual_height_cm', 10, 2)->nullable();
            $table->decimal('actual_volume_m3', 10, 3)->nullable();
            $table->string('packaging_condition', 30)->nullable();
            $table->string('special_handling_flags', 100)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('created_at')->nullable();
            
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
        Schema::dropIfExists('goods_inspection');
    }
};
