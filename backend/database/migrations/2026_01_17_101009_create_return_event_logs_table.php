<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_event_log', function (Blueprint $table) {
            $table->id('return_event_id');
            $table->unsignedBigInteger('return_order_id');
            $table->unsignedBigInteger('original_shipment_id');
            $table->string('event_type', 50);
            $table->string('old_status', 30)->nullable();
            $table->string('new_status', 30)->nullable();
            $table->dateTime('event_at');
            $table->string('actor_type', 20)->nullable();
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->text('message')->nullable();
            $table->text('raw_payload')->nullable();
            
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
            $table->index('event_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_event_log');
    }
};
