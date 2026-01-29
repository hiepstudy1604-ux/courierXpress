<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->string('bill_number', 50)->unique();
            $table->unsignedBigInteger('courier_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->decimal('amount', 12, 2);
            $table->enum('status', ['PAID', 'UNPAID', 'REFUNDED'])->default('UNPAID');
            $table->dateTime('payment_date')->nullable();
            $table->timestamps();
            
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
            
            // NOTE: Couriers table migration timestamp is later than this bills migration.
            // Creating FK here can fail on fresh migrate due to table not existing yet.
            // Keep courier_id as nullable field; enforce relationship at application level.
            
            $table->index('user_id');
            $table->index('status');
            $table->index('bill_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bills');
    }
};
