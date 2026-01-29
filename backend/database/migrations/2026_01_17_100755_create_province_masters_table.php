<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('province_master', function (Blueprint $table) {
            $table->string('province_code', 10)->primary();
            $table->string('province_name', 120);
            $table->string('province_type', 30);
            $table->string('region_code', 20)->nullable();
            $table->decimal('latitude', 10, 6)->nullable();
            $table->decimal('longitude', 10, 6)->nullable();
            $table->timestamps();
            
            $table->index('region_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('province_master');
    }
};
