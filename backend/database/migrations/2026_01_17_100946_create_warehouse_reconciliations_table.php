<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_reconciliation', function (Blueprint $table) {
            $table->id('reconciliation_id');
            $table->unsignedBigInteger('shipment_id');
            $table->unsignedBigInteger('branch_id');
            $table->string('warehouse_role', 20);
            $table->unsignedBigInteger('reconciled_by');
            $table->dateTime('reconciled_at');
            $table->string('goods_check_status', 30)->nullable();
            $table->string('waybill_check_status', 30)->nullable();
            $table->string('cash_check_status', 30)->nullable();
            $table->decimal('expected_cash_amount', 12, 2)->nullable();
            $table->decimal('received_cash_amount', 12, 2)->nullable();
            $table->text('discrepancy_note')->nullable();
            $table->string('final_status', 30);
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
            $table->index('reconciled_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_reconciliation');
    }
};
