<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_supported_goods', function (Blueprint $table) {
            $table->unsignedBigInteger('vehicle_id');
            $table->string('goods_type', 50);
            $table->timestamps();
            
            $table->primary(['vehicle_id', 'goods_type']);
            
            $table->foreign('vehicle_id')
                ->references('vehicle_id')
                ->on('vehicles')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_supported_goods');
    }
};
