<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\AdminTask;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Database\Seeders\SeedHelper;

class ComprehensiveAdminTaskSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding admin tasks...');

        $tasks = [];

        // Tasks for pickup reschedule (closest replacement for pickup contact failures)
        $failedContactShipments = Shipment::where('shipment_status', 'PICKUP_RESCHEDULED')
            ->get();

        foreach ($failedContactShipments as $shipment) {
            $createdAt = Carbon::parse($shipment->created_at);
            
            $tasks[] = [
                'task_code' => SeedHelper::generateTaskCode(),
                'task_type' => 'PICKUP_RESCHEDULED',
                'priority' => 80,
                'status' => rand(0, 100) < 70 ? 'PENDING' : 'RESOLVED',
                'shipment_id' => $shipment->shipment_id,
                'branch_id' => $shipment->assigned_branch_id,
                'driver_id' => null,
                'manifest_id' => null,
                'return_order_id' => null,
                'related_table' => 'shipments',
                'related_id' => $shipment->shipment_id,
                'title' => 'Pickup Rescheduled - Contact Customer',
                'description' => 'Pickup was rescheduled. Please contact customer and confirm pickup plan.',
                'due_at' => $createdAt->copy()->addHours(24),
                'assigned_to' => 1,
                'assigned_at' => $createdAt,
                'resolved_at' => rand(0, 100) < 70 ? null : $createdAt->copy()->addHours(rand(2, 12)),
                'resolution_code' => rand(0, 100) < 70 ? null : 'RESCHEDULED',
                'resolution_note' => rand(0, 100) < 70 ? null : 'Customer contacted, pickup rescheduled',
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];
        }

        // Tasks for payment issues
        $paymentIssueShipments = Shipment::whereHas('paymentIntents', function($q) {
            $q->where('status', 'EXPIRED');
        })->get();

        foreach ($paymentIssueShipments as $shipment) {
            $createdAt = Carbon::parse($shipment->created_at);
            
            $tasks[] = [
                'task_code' => SeedHelper::generateTaskCode(),
                'task_type' => 'PAYMENT_TIMEOUT',
                'priority' => 90,
                'status' => rand(0, 100) < 60 ? 'PENDING' : 'RESOLVED',
                'shipment_id' => $shipment->shipment_id,
                'branch_id' => $shipment->assigned_branch_id,
                'driver_id' => null,
                'manifest_id' => null,
                'return_order_id' => null,
                'related_table' => 'payment_intent',
                'related_id' => $shipment->paymentIntents->first()->payment_intent_id ?? null,
                'title' => 'Payment Timeout - Fallback Required',
                'description' => 'Online payment timed out. Please process cash payment fallback.',
                'due_at' => $createdAt->copy()->addHours(12),
                'assigned_to' => 1,
                'assigned_at' => $createdAt,
                'resolved_at' => rand(0, 100) < 60 ? null : $createdAt->copy()->addHours(rand(1, 6)),
                'resolution_code' => rand(0, 100) < 60 ? null : 'CASH_PAYMENT_CONFIRMED',
                'resolution_note' => rand(0, 100) < 60 ? null : 'Cash payment confirmed',
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];
        }

        // Tasks for delivery failed
        $deliveryFailedShipments = Shipment::where('shipment_status', 'DELIVERY_FAILED')
            ->get();

        foreach ($deliveryFailedShipments as $shipment) {
            $createdAt = Carbon::parse($shipment->created_at);
            
            $tasks[] = [
                'task_code' => SeedHelper::generateTaskCode(),
                'task_type' => 'DELIVERY_FAILED',
                'priority' => 85,
                'status' => rand(0, 100) < 50 ? 'PENDING' : 'RESOLVED',
                'shipment_id' => $shipment->shipment_id,
                'branch_id' => $shipment->assigned_branch_id,
                'driver_id' => null,
                'manifest_id' => null,
                'return_order_id' => null,
                'related_table' => 'shipments',
                'related_id' => $shipment->shipment_id,
                'title' => 'Delivery Failed - Retry Required',
                'description' => 'Delivery attempt failed. Please retry or initiate return.',
                'due_at' => $createdAt->copy()->addHours(48),
                'assigned_to' => 1,
                'assigned_at' => $createdAt,
                'resolved_at' => rand(0, 100) < 50 ? null : $createdAt->copy()->addHours(rand(12, 48)),
                'resolution_code' => rand(0, 100) < 50 ? null : 'RETRY_SCHEDULED',
                'resolution_note' => rand(0, 100) < 50 ? null : 'Retry scheduled for next day',
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];
        }

        if (!empty($tasks)) {
            DB::table('admin_task')->insert($tasks);
            $this->command->info("✅ Created " . count($tasks) . " admin tasks");
        } else {
            $this->command->info("✅ No admin tasks to create");
        }
    }
}
