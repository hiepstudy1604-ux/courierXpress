<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('district_alias', function (Blueprint $table) {
            $table->id('alias_id');
            $table->string('district_code', 10);
            $table->string('alias_text', 160);
            $table->integer('priority')->default(100);
            $table->timestamps();
            
            $table->foreign('district_code')
                ->references('district_code')
                ->on('district_master')
                ->onDelete('cascade');
            
            $table->index('alias_text');
            $table->index('district_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('district_alias');
    }
};
