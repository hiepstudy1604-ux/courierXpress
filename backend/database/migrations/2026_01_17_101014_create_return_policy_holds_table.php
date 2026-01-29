<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_policy_hold', function (Blueprint $table) {
            $table->id('hold_id');
            $table->unsignedBigInteger('return_order_id');
            $table->unsignedBigInteger('original_shipment_id');
            $table->dateTime('hold_start_at');
            $table->dateTime('hold_until_at');
            $table->dateTime('pickup_by_customer_at')->nullable();
            $table->dateTime('disposed_at')->nullable();
            $table->string('final_action', 30)->nullable();
            $table->string('decided_by_type', 20)->nullable();
            $table->unsignedBigInteger('decided_by')->nullable();
            $table->text('note')->nullable();
            
            $table->foreign('return_order_id')
                ->references('return_order_id')
                ->on('return_order')
                ->onDelete('cascade');
            
            $table->foreign('original_shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->index('return_order_id');
            $table->index('original_shipment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_policy_hold');
    }
};
