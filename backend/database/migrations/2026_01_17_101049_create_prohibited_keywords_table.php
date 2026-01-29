<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prohibited_keywords', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('prohibited_category_id');
            $table->string('keyword', 100);
            $table->string('match_type', 20)->default('EXACT');
            $table->integer('risk_weight')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->nullable();
            
            $table->foreign('prohibited_category_id')
                ->references('id')
                ->on('prohibited_categories')
                ->onDelete('cascade');
            
            $table->index('prohibited_category_id');
            $table->index('keyword');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prohibited_keywords');
    }
};
