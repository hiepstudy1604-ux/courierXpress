<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->string('agent_code', 20)->unique();
            $table->string('name', 120);
            $table->string('phone', 20);
            $table->string('email', 120)->nullable();
            $table->unsignedBigInteger('branch_id');
            $table->enum('status', ['ACTIVE', 'INACTIVE'])->default('ACTIVE');
            $table->string('raw_password', 255)->nullable();
            $table->timestamps();
            
            $table->foreign('branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('cascade');
            
            $table->index('branch_id');
            $table->index('agent_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agents');
    }
};
