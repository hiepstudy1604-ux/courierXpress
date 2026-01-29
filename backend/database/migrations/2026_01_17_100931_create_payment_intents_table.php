<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_intent', function (Blueprint $table) {
            $table->id('payment_intent_id');
            $table->unsignedBigInteger('shipment_id');
            $table->unsignedBigInteger('pricing_adjustment_id')->nullable();
            $table->string('currency', 3)->default('VND');
            $table->string('method', 30);
            $table->string('provider', 50)->nullable();
            $table->string('status', 30);
            $table->decimal('amount', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->string('payer_role', 20)->nullable();
            $table->string('reference_code', 100)->nullable();
            $table->string('provider_txn_id', 200)->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->dateTime('failed_at')->nullable();
            $table->unsignedBigInteger('fallback_payment_intent_id')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->foreign('fallback_payment_intent_id')
                ->references('payment_intent_id')
                ->on('payment_intent')
                ->onDelete('set null');
            
            $table->index('shipment_id');
            $table->index('status');
            $table->index('method');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_intent');
    }
};
