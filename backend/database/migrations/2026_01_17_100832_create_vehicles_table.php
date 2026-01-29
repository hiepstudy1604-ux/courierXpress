<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id('vehicle_id');
            $table->string('vehicle_code', 30)->unique();
            $table->string('vehicle_type', 50);
            $table->decimal('max_load_kg', 10, 2);
            $table->decimal('max_length_cm', 10, 2)->nullable();
            $table->decimal('max_width_cm', 10, 2)->nullable();
            $table->decimal('max_height_cm', 10, 2)->nullable();
            $table->decimal('max_volume_m3', 10, 3)->nullable();
            $table->string('route_scope', 30)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('vehicle_code');
            $table->index('vehicle_type');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
