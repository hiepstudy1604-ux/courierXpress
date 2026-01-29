<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('couriers', function (Blueprint $table) {
            $table->id();

            // Identifiers
            $table->string('order_id')->unique();
            $table->string('tracking_id')->unique();

            // Relations
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('agent_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();

            // Sender information
            $table->string('sender_name');
            $table->string('sender_phone');
            $table->text('sender_address');
            $table->string('sender_ward')->nullable();
            $table->string('sender_district')->nullable();
            $table->string('sender_province')->nullable();

            // Receiver information
            $table->string('receiver_name');
            $table->string('receiver_phone');
            $table->text('receiver_address');
            $table->string('receiver_ward')->nullable();
            $table->string('receiver_district')->nullable();
            $table->string('receiver_province')->nullable();

            // Package / service details
            $table->string('package_type')->nullable();
            $table->decimal('weight', 10, 2)->default(0); // kg
            $table->string('dimensions')->nullable(); // e.g. LxWxH string or JSON
            $table->json('items')->nullable();
            $table->string('service_type', 30);
            $table->string('vehicle_type')->nullable();

            // Pricing
            $table->decimal('base_charge', 12, 2)->default(0);
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->decimal('estimated_fee', 12, 2)->default(0);
            $table->json('pricing_breakdown')->nullable();

            // Meta / snapshots
            $table->json('input_snapshot');
            $table->string('status', 30);
            $table->dateTime('booking_date');
            $table->date('pickup_date')->nullable();
            $table->string('pickup_slot')->nullable();
            $table->string('inspection_policy')->nullable();
            $table->string('payment_method')->nullable();
            $table->text('delivery_notes')->nullable();
            $table->dateTime('eta')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('user_id');
            $table->index('branch_id');
            $table->index('agent_id');
            $table->index('status');
            $table->index('booking_date');

            // Foreign keys
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            $table->foreign('agent_id')->references('id')->on('agents')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('couriers');
    }
};