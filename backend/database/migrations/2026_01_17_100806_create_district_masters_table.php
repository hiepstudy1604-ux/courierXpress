<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('district_master', function (Blueprint $table) {
            $table->id('district_id');
            $table->string('district_code', 10)->unique();
            $table->string('province_code', 10);
            $table->string('district_name', 120);
            $table->string('district_name_raw', 120);
            $table->string('district_type', 30);
            $table->boolean('is_active')->default(true);
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->string('source_name', 80)->nullable();
            $table->string('source_ref', 120)->nullable();
            $table->timestamps();
            
            $table->foreign('province_code')
                ->references('province_code')
                ->on('province_master')
                ->onDelete('cascade');
            
            $table->index('province_code');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('district_master');
    }
};
