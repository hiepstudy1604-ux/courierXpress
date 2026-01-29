<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_scan', function (Blueprint $table) {
            $table->id('scan_id');
            $table->unsignedBigInteger('shipment_id');
            $table->unsignedBigInteger('branch_id');
            $table->string('warehouse_role', 20);
            $table->string('scan_type', 20);
            $table->string('scanned_by_role', 30);
            $table->unsignedBigInteger('scanned_by');
            $table->dateTime('scanned_at');
            $table->string('waybill_code', 50)->nullable();
            $table->integer('package_count')->default(1);
            $table->string('condition_status', 30)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('created_at')->nullable();
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->foreign('branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('cascade');
            
            $table->index('shipment_id');
            $table->index('branch_id');
            $table->index('scanned_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_scan');
    }
};
