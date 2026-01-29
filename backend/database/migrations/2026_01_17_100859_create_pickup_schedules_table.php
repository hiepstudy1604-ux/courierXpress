<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pickup_schedule', function (Blueprint $table) {
            $table->id('pickup_schedule_id');
            $table->unsignedBigInteger('shipment_id')->unique();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->dateTime('scheduled_start_at');
            $table->dateTime('scheduled_end_at');
            $table->dateTime('confirmed_at')->nullable();
            $table->unsignedBigInteger('confirmed_by')->nullable();
            $table->string('confirm_method', 30)->default('AGENT');
            $table->string('timezone', 40)->default('Asia/Ho_Chi_Minh');
            $table->string('status', 30)->default('SCHEDULED');
            $table->string('customer_note', 255)->nullable();
            $table->string('internal_note', 255)->nullable();
            $table->timestamps();
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->foreign('branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('set null');
            
            $table->index('branch_id');
            $table->index(['scheduled_start_at', 'scheduled_end_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pickup_schedule');
    }
};
