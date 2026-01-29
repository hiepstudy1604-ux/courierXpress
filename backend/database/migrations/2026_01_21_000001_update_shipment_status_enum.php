<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Update legacy shipment_status values to the new ORDER_STATUS list.
     *
     * Notes for MySQL:
     * - We keep shipment_status as VARCHAR(30) (not a MySQL ENUM) to avoid lock-in
     *   and keep deployments safer across environments.
     * - MySQL 8+ CHECK constraints are optional; we skip adding one to avoid
     *   backwards-compat issues.
     */
    public function up(): void
    {
        // Ensure column length is sufficient for new values (it already is in schema, but keep idempotent)
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('shipment_status', 30)->change();
        });

        $map = [
            'CREATED' => 'BOOKED',
            'BOOKED' => 'BOOKED',
            'PRICE_ADJUSTMENT_PENDING' => 'ADJUSTED_PRICE',
            'PRICE_ESTIMATED' => 'PRICE_ESTIMATED',
            'BRANCH_ASSIGNED' => 'BRANCH_ASSIGNED',
            'PICKUP_SCHEDULED' => 'PICKUP_SCHEDULED',
            'PICKUP_RESCHEDULED' => 'PICKUP_RESCHEDULED',
            'DRIVER_ASSIGNED' => 'ON_THE_WAY_PICKUP',
            'ON_THE_WAY_PICKUP' => 'ON_THE_WAY_PICKUP',
            'PICKUP_FAILED_CONTACT' => 'PICKUP_RESCHEDULED',
            'WEIGHT_CONFIRMED' => 'VERIFIED_ITEM',
            'ADJUST_ITEM' => 'ADJUST_ITEM',
            'CONFIRMED_PRICE' => 'CONFIRMED_PRICE',
            'ADJUSTED_PRICE' => 'ADJUSTED_PRICE',
            'PENDING_PAYMENT' => 'PENDING_PAYMENT',
            'PAYMENT_CONFIRMED' => 'CONFIRM_PAYMENT',
            'CONFIRM_PAYMENT' => 'CONFIRM_PAYMENT',
            'PICKUP_COMPLETED' => 'PICKUP_COMPLETED',
            'PICKED_UP' => 'PICKUP_COMPLETED',
            'IN_ORIGIN_WAREHOUSE' => 'IN_ORIGIN_WAREHOUSE',
            'IN_TRANSIT' => 'IN_TRANSIT',
            'IN_DEST_WAREHOUSE' => 'IN_DEST_WAREHOUSE',
            'OUT_FOR_DELIVERY' => 'OUT_FOR_DELIVERY',
            'DELIVERY_FAILED' => 'DELIVERY_FAILED',
            'DELIVERED_SUCCESS' => 'DELIVERED_SUCCESS',
            'DELIVERED' => 'DELIVERED_SUCCESS',
            'RETURN_CREATED' => 'RETURN_CREATED',
            'RETURN_IN_TRANSIT' => 'RETURN_IN_TRANSIT',
            'RETURNED_TO_ORIGIN' => 'RETURNED_TO_ORIGIN',
            'RETURN_COMPLETED' => 'RETURN_COMPLETED',
            'DISPOSED' => 'DISPOSED',
            'CLOSED' => 'CLOSED',
            'CANCELLED' => 'DISPOSED', // best-effort terminal mapping
        ];

        DB::table('shipments')
            ->orderBy('shipment_id')
            ->chunkById(500, function ($chunk) use ($map) {
                foreach ($chunk as $row) {
                    $current = strtoupper($row->shipment_status ?? '');
                    $target = $map[$current] ?? null;
                    if ($target && $target !== $row->shipment_status) {
                        DB::table('shipments')
                            ->where('shipment_id', $row->shipment_id)
                            ->update(['shipment_status' => $target]);
                    }
                }
            }, 'shipment_id');
    }

    public function down(): void
    {
        // Best-effort reverse mapping for common cases
        $reverse = [
            'BOOKED' => 'BOOKED',
            'PRICE_ESTIMATED' => 'PRICE_ESTIMATED',
            'BRANCH_ASSIGNED' => 'BRANCH_ASSIGNED',
            'PICKUP_SCHEDULED' => 'PICKUP_SCHEDULED',
            'PICKUP_RESCHEDULED' => 'PICKUP_RESCHEDULED',
            'ON_THE_WAY_PICKUP' => 'ON_THE_WAY_PICKUP',
            'VERIFIED_ITEM' => 'WEIGHT_CONFIRMED',
            'ADJUST_ITEM' => 'ADJUST_ITEM',
            'CONFIRMED_PRICE' => 'CONFIRMED_PRICE',
            'ADJUSTED_PRICE' => 'ADJUSTED_PRICE',
            'PENDING_PAYMENT' => 'PENDING_PAYMENT',
            'CONFIRM_PAYMENT' => 'PAYMENT_CONFIRMED',
            'PICKUP_COMPLETED' => 'PICKUP_COMPLETED',
            'IN_ORIGIN_WAREHOUSE' => 'IN_ORIGIN_WAREHOUSE',
            'IN_TRANSIT' => 'IN_TRANSIT',
            'IN_DEST_WAREHOUSE' => 'IN_DEST_WAREHOUSE',
            'OUT_FOR_DELIVERY' => 'OUT_FOR_DELIVERY',
            'DELIVERY_FAILED' => 'DELIVERY_FAILED',
            'DELIVERED_SUCCESS' => 'DELIVERED_SUCCESS',
            'RETURN_CREATED' => 'RETURN_CREATED',
            'RETURN_IN_TRANSIT' => 'RETURN_IN_TRANSIT',
            'RETURNED_TO_ORIGIN' => 'RETURNED_TO_ORIGIN',
            'RETURN_COMPLETED' => 'RETURN_COMPLETED',
            'DISPOSED' => 'DISPOSED',
            'CLOSED' => 'CLOSED',
        ];

        DB::table('shipments')
            ->orderBy('shipment_id')
            ->chunkById(500, function ($chunk) use ($reverse) {
                foreach ($chunk as $row) {
                    $current = strtoupper($row->shipment_status ?? '');
                    $target = $reverse[$current] ?? null;
                    if ($target && $target !== $row->shipment_status) {
                        DB::table('shipments')
                            ->where('shipment_id', $row->shipment_id)
                            ->update(['shipment_status' => $target]);
                    }
                }
            }, 'shipment_id');
    }
};
