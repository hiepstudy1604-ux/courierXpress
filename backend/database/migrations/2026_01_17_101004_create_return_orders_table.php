<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_order', function (Blueprint $table) {
            $table->id('return_order_id');
            $table->unsignedBigInteger('original_shipment_id');
            $table->unsignedBigInteger('return_shipment_id')->nullable();
            $table->string('reason_code', 30);
            $table->text('reason_note')->nullable();
            $table->string('service_type', 30)->nullable();
            $table->string('route_scope', 30)->nullable();
            $table->unsignedBigInteger('origin_branch_id');
            $table->unsignedBigInteger('dest_branch_id');
            $table->unsignedBigInteger('current_branch_id')->nullable();
            $table->string('status', 30);
            $table->string('created_by_type', 20)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            
            $table->foreign('original_shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->foreign('return_shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('set null');
            
            $table->foreign('origin_branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('cascade');
            
            $table->foreign('dest_branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('cascade');
            
            $table->foreign('current_branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('set null');
            
            $table->index('original_shipment_id');
            $table->index('return_shipment_id');
            $table->index('origin_branch_id');
            $table->index('dest_branch_id');
            $table->index('current_branch_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_order');
    }
};
