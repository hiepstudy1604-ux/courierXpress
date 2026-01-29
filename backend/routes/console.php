<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Artisan::command('debug:jwt {email : User email} {--guard=api : Auth guard name}', function () {
    $email = (string) $this->argument('email');
    $guard = (string) $this->option('guard');

    $user = \App\Models\User::where('email', $email)->first();
    if (!$user) {
        $this->error('User not found: ' . $email);
        return 1;
    }

    try {
        $token = auth($guard)->login($user);
    } catch (\Throwable $e) {
        $this->error('Failed to login with guard ' . $guard . ': ' . $e->getMessage());
        return 1;
    }

    if (!$token) {
        $this->error('No token returned. Check guard config.');
        return 1;
    }

    $this->line($token);
    return 0;
})->purpose('Print a JWT token for a user (development/debug only)');

Artisan::command('debug:shipment-id {status : Shipment status} {--branch_id=} {--limit=1}', function () {
    $status = strtoupper((string) $this->argument('status'));
    $branchId = $this->option('branch_id');
    $limit = (int) ($this->option('limit') ?? 1);

    $q = \App\Models\Shipment::query()->where('shipment_status', $status);
    if ($branchId !== null && $branchId !== '') {
        $q->where('assigned_branch_id', (int) $branchId);
    }

    $shipments = $q->orderByDesc('shipment_id')->limit(max(1, $limit))->get(['shipment_id']);

    if ($shipments->isEmpty()) {
        $this->error('No shipment found for status: ' . $status);
        return 1;
    }

    foreach ($shipments as $s) {
        $this->line((string) $s->shipment_id);
    }

    return 0;
})->purpose('Print one or more shipment_id values by shipment_status (development/debug only)');

Artisan::command('debug:shipment-check {id : shipment_id}', function () {
    $id = (int) $this->argument('id');

    $shipment = \App\Models\Shipment::with(['pickupSchedule', 'pickupSchedule', 'pickupSchedule', 'pickupSchedule'])->find($id);
    if (!$shipment) {
        $this->error('Shipment not found: ' . $id);
        return 1;
    }

    $pickupSchedule = \App\Models\PickupSchedule::where('shipment_id', $id)->first();
    $pickupHistoryCount = \App\Models\PickupScheduleHistory::where('shipment_id', $id)->count();

    $callLogCount = \App\Models\CallLog::where('shipment_id', $id)->count();
    $adminTaskCount = \App\Models\AdminTask::where('shipment_id', $id)->count();
    $adminTaskEventCount = \App\Models\AdminTaskEvent::whereIn('task_id', function ($q) use ($id) {
        $q->select('task_id')->from('admin_task')->where('shipment_id', $id);
    })->count();

    $notificationCount = \App\Models\Notification::where('related_type', 'shipment')->where('related_id', $id)->count();

    $this->line('shipment_id: ' . $id);
    $this->line('shipment_status: ' . ($shipment->shipment_status ?? '')); 
    $this->line('pickup_schedule: ' . ($pickupSchedule ? 'YES' : 'NO'));
    if ($pickupSchedule) {
        $this->line('  pickup_schedule_id: ' . $pickupSchedule->pickup_schedule_id);
        $this->line('  window: ' . ($pickupSchedule->scheduled_start_at?->toDateTimeString() ?? 'null') . ' -> ' . ($pickupSchedule->scheduled_end_at?->toDateTimeString() ?? 'null'));
        $this->line('  status: ' . ($pickupSchedule->status ?? ''));
    }
    $this->line('pickup_schedule_history_count: ' . $pickupHistoryCount);
    $this->line('call_log_count: ' . $callLogCount);
    $this->line('admin_task_count: ' . $adminTaskCount);
    $this->line('admin_task_event_count: ' . $adminTaskEventCount);
    $this->line('notification_count(shipment): ' . $notificationCount);

    return 0;
})->purpose('Check side-effects created for a shipment (pickup schedule/history, call logs, admin tasks, notifications)');
