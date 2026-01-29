<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('province_alias', function (Blueprint $table) {
            $table->id('alias_id');
            $table->string('province_code', 10);
            $table->string('alias_text', 160);
            $table->integer('priority')->default(100);
            $table->timestamps();
            
            $table->foreign('province_code')
                ->references('province_code')
                ->on('province_master')
                ->onDelete('cascade');
            
            $table->index('alias_text');
            $table->index('province_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('province_alias');
    }
};
