<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\AdminTask;
use App\Models\AdminTaskEvent;
use Illuminate\Database\Seeder;

class AdminTaskSeeder extends Seeder
{
    public function run(): void
    {
        $tasks = [];

        // Create tasks for pickup rescheduled shipments (closest replacement)
        $pickupFailedShipments = Shipment::where('shipment_status', 'PICKUP_RESCHEDULED')
            ->whereDoesntHave('adminTasks')
            ->get()
            ->take(1);

        foreach ($pickupFailedShipments as $shipment) {
            $task = AdminTask::create([
                'task_code' => 'TASK-' . now()->format('YmdHis') . '-' . $shipment->shipment_id,
                'task_type' => 'PICKUP_RESCHEDULED',
                'priority' => 100,
                'status' => 'PENDING',
                'shipment_id' => $shipment->shipment_id,
                'branch_id' => $shipment->assigned_branch_id,
                'title' => 'Xử lý đơn hàng đổi lịch lấy hàng',
                'description' => 'Đơn hàng ' . $shipment->shipment_id . ' đã đổi lịch lấy hàng, cần liên hệ xác nhận',
                'due_at' => now()->addHours(24),
            ]);

            AdminTaskEvent::create([
                'task_id' => $task->task_id,
                'event_type' => 'CREATED',
                'event_at' => now(),
                'actor_type' => 'SYSTEM',
                'old_status' => null,
                'new_status' => 'PENDING',
                'message' => 'Task created automatically',
            ]);

            $tasks[] = $task;
        }

        $this->command->info("✅ Created " . count($tasks) . " admin tasks");
    }
}
