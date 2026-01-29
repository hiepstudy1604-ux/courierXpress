<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver', function (Blueprint $table) {
            $table->id('driver_id');
            $table->string('driver_code', 30)->unique();
            $table->string('full_name', 120);
            $table->string('phone_number', 20);
            $table->string('email', 120)->nullable();
            $table->unsignedBigInteger('branch_id');
            $table->string('home_province_code', 10);
            $table->string('working_region', 20);
            $table->string('vehicle_type', 30);
            $table->string('license_number', 30)->nullable();
            $table->string('driver_status', 30)->default('AVAILABLE');
            $table->decimal('current_lat', 10, 6)->nullable();
            $table->decimal('current_lng', 10, 6)->nullable();
            $table->dateTime('last_location_at')->nullable();
            $table->integer('max_active_orders')->default(3);
            $table->boolean('is_active')->default(true);
            $table->date('joined_at')->nullable();
            $table->timestamps();
            
            $table->foreign('branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('cascade');
            
            $table->foreign('home_province_code')
                ->references('province_code')
                ->on('province_master')
                ->onDelete('cascade');
            
            $table->index('branch_id');
            $table->index('driver_status');
            $table->index('is_active');
            $table->index('vehicle_type');
            $table->index('working_region');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver');
    }
};
