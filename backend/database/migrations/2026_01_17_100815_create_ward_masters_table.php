<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ward_master', function (Blueprint $table) {
            $table->id('ward_id');
            $table->string('ward_code', 10)->unique();
            $table->string('district_code', 10);
            $table->string('province_code', 10);
            $table->string('ward_name', 120);
            $table->string('ward_name_raw', 120);
            $table->string('ward_type', 30);
            $table->boolean('is_active')->default(true);
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->string('source_name', 80)->nullable();
            $table->string('source_ref', 120)->nullable();
            $table->timestamps();
            
            $table->foreign('district_code')
                ->references('district_code')
                ->on('district_master')
                ->onDelete('cascade');
            
            $table->foreign('province_code')
                ->references('province_code')
                ->on('province_master')
                ->onDelete('cascade');
            
            $table->index('district_code');
            $table->index('province_code');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ward_master');
    }
};
