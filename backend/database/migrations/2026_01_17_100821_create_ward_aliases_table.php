<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ward_alias', function (Blueprint $table) {
            $table->id('alias_id');
            $table->string('ward_code', 10);
            $table->string('alias_text', 160);
            $table->integer('priority')->default(100);
            $table->timestamps();
            
            $table->foreign('ward_code')
                ->references('ward_code')
                ->on('ward_master')
                ->onDelete('cascade');
            
            $table->index('alias_text');
            $table->index('ward_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ward_alias');
    }
};
