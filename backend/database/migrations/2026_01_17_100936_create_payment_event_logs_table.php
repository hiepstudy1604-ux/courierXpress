<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_event_log', function (Blueprint $table) {
            $table->id('payment_event_id');
            $table->unsignedBigInteger('payment_intent_id');
            $table->unsignedBigInteger('shipment_id');
            $table->string('event_type', 50);
            $table->dateTime('event_at');
            $table->string('actor_type', 20)->nullable();
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('old_status', 30)->nullable();
            $table->string('new_status', 30)->nullable();
            $table->text('message')->nullable();
            $table->text('raw_payload')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
            
            $table->foreign('payment_intent_id')
                ->references('payment_intent_id')
                ->on('payment_intent')
                ->onDelete('cascade');
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->index('payment_intent_id');
            $table->index('shipment_id');
            $table->index('event_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_event_log');
    }
};
