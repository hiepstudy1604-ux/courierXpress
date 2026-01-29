<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_load_tracking', function (Blueprint $table) {
            $table->unsignedBigInteger('vehicle_id')->primary();
            $table->decimal('current_load_kg', 10, 2)->default(0);
            $table->decimal('current_volume_m3', 10, 3)->default(0);
            $table->integer('current_order_count')->default(0);
            $table->timestamps();
            
            $table->foreign('vehicle_id')
                ->references('vehicle_id')
                ->on('vehicles')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_load_tracking');
    }
};
