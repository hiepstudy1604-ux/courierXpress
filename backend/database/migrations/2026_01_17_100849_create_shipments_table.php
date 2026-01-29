<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id('shipment_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->text('sender_address_text');
            $table->string('sender_province_code', 10)->nullable();
            $table->text('receiver_address_text');
            $table->string('receiver_province_code', 10)->nullable();
            $table->string('service_type', 30);
            $table->string('goods_type', 50);
            $table->decimal('declared_value', 12, 2)->default(0);
            $table->decimal('total_weight_kg', 10, 2);
            $table->decimal('total_volume_m3', 10, 3)->nullable();
            $table->decimal('parcel_length_cm', 10, 2)->nullable();
            $table->decimal('parcel_width_cm', 10, 2)->nullable();
            $table->decimal('parcel_height_cm', 10, 2)->nullable();
            $table->string('route_scope', 30);
            $table->unsignedBigInteger('assigned_branch_id')->nullable();
            $table->unsignedBigInteger('assigned_vehicle_id')->nullable();
            $table->string('shipment_status', 30);
            $table->unsignedBigInteger('assigned_by')->nullable();
            $table->dateTime('assigned_at')->nullable();
            $table->timestamps();
            
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
            
            $table->foreign('sender_province_code')
                ->references('province_code')
                ->on('province_master')
                ->onDelete('set null');
            
            $table->foreign('receiver_province_code')
                ->references('province_code')
                ->on('province_master')
                ->onDelete('set null');
            
            $table->foreign('assigned_branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('set null');
            
            $table->foreign('assigned_vehicle_id')
                ->references('vehicle_id')
                ->on('vehicles')
                ->onDelete('set null');
            
            $table->foreign('assigned_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
            
            $table->index('user_id');
            $table->index('sender_province_code');
            $table->index('receiver_province_code');
            $table->index('assigned_branch_id');
            $table->index('assigned_vehicle_id');
            $table->index('shipment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
