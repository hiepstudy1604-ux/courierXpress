<?php

namespace App\Http\Controllers\Api;

use App\Enums\ShipmentStatus;
use App\Http\Controllers\Controller;
use App\Models\AdminTask;
use App\Models\AdminTaskEvent;
use App\Models\CallLog;
use App\Models\Driver;
use App\Models\DriverAssignment;
use App\Models\GoodsInspection;
use App\Models\Notification;
use App\Models\PickupSchedule;
use App\Models\PickupScheduleHistory;
use App\Models\Shipment;
use App\Models\PaymentIntent;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ShipmentController extends Controller
{
    /**
     * Get all shipments (for CourierManagement)
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();

            $query = Shipment::with([
                'assignedBranch',
                'assignedVehicle',
                'pickupSchedule',
                'paymentIntent',
                'goodsInspection',
            ]);

            if ($user->role === 'CUSTOMER') {
                // (optional) filter by user_id when shipments are properly linked
            } elseif ($user->role === 'AGENT') {
                if ($user->branch_id) {
                    $query->where('assigned_branch_id', $user->branch_id);
                }
            }

            if ($request->has('status') && !empty($request->status)) {
                $statuses = explode(',', $request->status);
                $statuses = array_map('trim', $statuses);
                if (count($statuses) > 1) {
                    $query->whereIn('shipment_status', $statuses);
                } else {
                    $query->where('shipment_status', $statuses[0]);
                }
            }

            if ($request->has('tracking_id')) {
                $query->where('shipment_id', 'like', '%' . $request->tracking_id . '%');
            }

            if ($request->has('branch_id') && $user->role === 'ADMIN') {
                $query->where('assigned_branch_id', $request->branch_id);
            }

            $perPage = $request->get('per_page', 100);
            $shipments = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $shipments->map(function ($shipment) {
                    try {
                        return $this->formatShipment($shipment);
                    } catch (\Exception $e) {
                        \Log::error('Error formatting shipment ' . $shipment->shipment_id . ': ' . $e->getMessage());
                        return null;
                    }
                })->filter(),
                'meta' => [
                    'current_page' => $shipments->currentPage(),
                    'total' => $shipments->total(),
                    'per_page' => $shipments->perPage(),
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in ShipmentController@index: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching shipments: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get shipment by ID
     */
    public function show($id)
    {
        $shipment = Shipment::with([
            'assignedBranch',
            'assignedVehicle',
            'pickupSchedule',
            'paymentIntent',
            'goodsInspection',
        ])->findOrFail($id);

        $user = Auth::user();

        if ($user->role === 'AGENT' && $shipment->assigned_branch_id !== $user->branch_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatShipment($shipment)
        ]);
    }

    /**
     * Format shipment for response (compatible with CourierManagement frontend)
     */
    private function formatShipment($shipment)
    {
        $pickupSchedule = $shipment->pickupSchedule;
        $paymentIntent = $shipment->paymentIntent;
        $goodsInspection = $shipment->goodsInspection;

        $pickupWindow = null;
        if ($pickupSchedule) {
            $pickupWindow = [
                'start' => $pickupSchedule->scheduled_start_at ? $pickupSchedule->scheduled_start_at->toISOString() : null,
                'end' => $pickupSchedule->scheduled_end_at ? $pickupSchedule->scheduled_end_at->toISOString() : null,
            ];
        }

        $actualWeight = $goodsInspection ? $goodsInspection->actual_weight_kg : null;
        $actualDimensions = null;
        if ($goodsInspection) {
            $actualDimensions = sprintf(
                '%s x %s x %s cm',
                $goodsInspection->actual_length_cm ?? 'N/A',
                $goodsInspection->actual_width_cm ?? 'N/A',
                $goodsInspection->actual_height_cm ?? 'N/A'
            );
        }

        $paymentMethod = $paymentIntent ? $paymentIntent->method : null;
        $paymentStatus = $paymentIntent ? $paymentIntent->status : null;

        $vehicleType = $shipment->assignedVehicle ? $shipment->assignedVehicle->vehicle_type : null;

        $senderAddress = $shipment->sender_address_text ?? '';
        $receiverAddress = $shipment->receiver_address_text ?? '';
        $senderName = $shipment->sender_name ?? 'N/A';
        $senderPhone = $shipment->sender_phone ?? 'N/A';
        $receiverName = $shipment->receiver_name ?? 'N/A';
        $receiverPhone = $shipment->receiver_phone ?? 'N/A';

        $trackingId = $shipment->tracking_id ?: ('CX-' . str_pad($shipment->shipment_id, 10, '0', STR_PAD_LEFT));

        return [
            'id' => (string) $shipment->shipment_id,
            'trackingId' => $trackingId,
            'sender' => [
                'name' => $senderName,
                'phone' => $senderPhone,
                'address' => $senderAddress,
            ],
            'receiver' => [
                'name' => $receiverName,
                'phone' => $receiverPhone,
                'address' => $receiverAddress,
            ],
            'details' => [
                'type' => $shipment->goods_type ?? 'Parcel',
                'weight' => $actualWeight ? (string) $actualWeight . 'kg' : ($shipment->total_weight_kg ? (string) $shipment->total_weight_kg . 'kg' : 'N/A'),
                'dimensions' => $actualDimensions ?? (
                    $shipment->parcel_length_cm && $shipment->parcel_width_cm && $shipment->parcel_height_cm
                    ? sprintf('%s x %s x %s cm', $shipment->parcel_length_cm, $shipment->parcel_width_cm, $shipment->parcel_height_cm)
                    : 'N/A'
                ),
            ],
            'pricing' => [
                'baseCharge' => 0,
                'tax' => 0,
                'total' => ($paymentIntent ? $paymentIntent->amount : null) ?? $shipment->declared_value ?? 0,
            ],
            'status' => $shipment->shipment_status,
            'bookingDate' => $shipment->created_at ? $shipment->created_at->toISOString() : null,
            'eta' => $pickupSchedule && $pickupSchedule->scheduled_end_at ? $pickupSchedule->scheduled_end_at->toISOString() : null,
            'agentId' => null,
            'branchId' => $shipment->assigned_branch_id ? (string) $shipment->assigned_branch_id : null,
            'serviceType' => $shipment->service_type ?? 'Standard',
            'vehicleType' => $vehicleType,
            'pickupWindow' => $pickupWindow,
            'actualWeight' => $actualWeight ? (string) $actualWeight . 'kg' : null,
            'paymentMethod' => $paymentMethod,
            'paymentStatus' => $paymentStatus,
        ];
    }

    public function assignBranch(Request $request, $id)
    {
        try {
            $user = Auth::user();

            if (!in_array($user->role, ['ADMIN', 'AGENT'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $validator = \Validator::make($request->all(), [
                'branch_id' => 'required|exists:branches,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $shipment = Shipment::findOrFail($id);

            if (!in_array($shipment->shipment_status, [ShipmentStatus::BOOKED->value, ShipmentStatus::PRICE_ESTIMATED->value])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Shipment can only be assigned when status is BOOKED or PRICE_ESTIMATED'
                ], 400);
            }

            $shipment->assigned_branch_id = $request->branch_id;
            $shipment->shipment_status = ShipmentStatus::BRANCH_ASSIGNED->value;
            $shipment->assigned_by = $user->id;
            $shipment->assigned_at = now();
            $shipment->save();

            return response()->json([
                'success' => true,
                'message' => 'Branch assigned successfully',
                'data' => $this->formatShipment($shipment->fresh())
            ]);
        } catch (\Exception $e) {
            \Log::error('Error assigning branch: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error assigning branch: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Patch shipment status and perform related side-effects.
     */
    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();

        $validator = \Validator::make($request->all(), [
            'status' => 'required|string',
            'payload' => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $newStatus = strtoupper($request->input('status'));

        if (!in_array($newStatus, array_column(ShipmentStatus::cases(), 'value'))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid status value'
            ], 400);
        }

        $shipment = Shipment::with(['pickupSchedule', 'paymentIntent', 'goodsInspection', 'pickupAssignment'])->findOrFail($id);

        $roleMap = [
            ShipmentStatus::PICKUP_SCHEDULED->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::PICKUP_RESCHEDULED->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::ON_THE_WAY_PICKUP->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::VERIFIED_ITEM->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::CONFIRMED_PRICE->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::PAYMENT_CONFIRMED->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::PICKUP_COMPLETE->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::PICKUP_COMPLETED->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::IN_ORIGIN_WAREHOUSE->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::IN_TRANSIT->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::IN_DEST_WAREHOUSE->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::OUT_FOR_DELIVERY->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::DELIVERED_SUCCESS->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::CLOSED->value => ['CUSTOMER'],
            ShipmentStatus::ISSUE->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::RETURN_CREATED->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::RETURN_IN_TRANSIT->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::RETURNED_TO_ORIGIN->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::RETURN_COMPLETED->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::DISPOSED->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::DELIVERY_FAILED->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::ADJUST_ITEM->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::ADJUSTED_PRICE->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::PENDING_PAYMENT->value => ['ADMIN', 'AGENT'],
            ShipmentStatus::CONFIRM_PAYMENT->value => ['ADMIN', 'AGENT'],
        ];

        if (!isset($roleMap[$newStatus]) || !in_array($user->role, $roleMap[$newStatus])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $payload = $request->input('payload', []);

        DB::beginTransaction();
        try {
            switch ($newStatus) {
                case ShipmentStatus::PICKUP_SCHEDULED->value:
                    $this->handlePickupScheduled($shipment, $payload, $user->id);
                    break;
                case ShipmentStatus::PICKUP_RESCHEDULED->value:
                    $this->handlePickupRescheduled($shipment, $payload, $user->id);
                    break;
                case ShipmentStatus::ON_THE_WAY_PICKUP->value:
                    $this->handleOnTheWayPickup($shipment, $payload, $user->id);
                    break;
                case ShipmentStatus::ISSUE->value:
                    $this->handleIssue($shipment, $payload, $user->id);
                    break;
                case ShipmentStatus::VERIFIED_ITEM->value:
                    $this->handleCheckItem($shipment, $payload, $user->id);
                    break;
                case ShipmentStatus::CONFIRMED_PRICE->value:
                case ShipmentStatus::ADJUSTED_PRICE->value:
                case ShipmentStatus::CONFIRM_PAYMENT->value:
                case ShipmentStatus::PENDING_PAYMENT->value:
                    // Best-effort pricing intent creation/update
                    $this->handleCheckPrice($shipment, $payload, $user->id);
                    break;
                case ShipmentStatus::PAYMENT_CONFIRMED->value:
                    $this->handlePaymentConfirmed($shipment);
                    break;
                case ShipmentStatus::PICKUP_COMPLETE->value:
                case ShipmentStatus::PICKUP_COMPLETED->value:
                    $this->handlePickupComplete($shipment);
                    break;
                default:
                    // No extra side-effects
                    break;
            }

            // delivered/closed timestamps (columns exist)
            if ($newStatus === ShipmentStatus::DELIVERED_SUCCESS->value) {
                $shipment->delivered_at = now();
            }
            if ($newStatus === ShipmentStatus::CLOSED->value) {
                $shipment->closed_at = now();
            }

            $oldStatus = $shipment->shipment_status;

            $shipment->shipment_status = $newStatus;
            $shipment->save();

            $this->createShipmentStatusNotifications($shipment, $oldStatus, $newStatus);

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Status updated',
                'data' => $this->formatShipment($shipment->fresh())
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            \Log::error('updateStatus error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Update failed: ' . $e->getMessage()
            ], 500);
        }
    }

    private function createShipmentStatusNotifications(Shipment $shipment, ?string $oldStatus, string $newStatus): void
    {
        $trackingId = $shipment->tracking_id ?: ('CX-' . str_pad((string) $shipment->shipment_id, 10, '0', STR_PAD_LEFT));

        $statusLabels = [
            ShipmentStatus::BOOKED->value => 'Đã tạo đơn',
            ShipmentStatus::PRICE_ESTIMATED->value => 'Ước tính giá',
            ShipmentStatus::BRANCH_ASSIGNED->value => 'Đã phân chi nhánh',
            ShipmentStatus::PICKUP_SCHEDULED->value => 'Đã lên lịch lấy hàng',
            ShipmentStatus::PICKUP_RESCHEDULED->value => 'Cần điều chỉnh lịch lấy hàng',
            ShipmentStatus::ON_THE_WAY_PICKUP->value => 'Tài xế đang đến lấy hàng',
            ShipmentStatus::PICKUP_COMPLETE->value => 'Đã lấy hàng',
            ShipmentStatus::PICKUP_COMPLETED->value => 'Đã lấy hàng',
            ShipmentStatus::VERIFIED_ITEM->value => 'Đã kiểm tra hàng',
            ShipmentStatus::CONFIRMED_PRICE->value => 'Đã xác nhận giá',
            ShipmentStatus::ADJUSTED_PRICE->value => 'Đã điều chỉnh giá',
            ShipmentStatus::PENDING_PAYMENT->value => 'Chờ thanh toán',
            ShipmentStatus::CONFIRM_PAYMENT->value => 'Xác nhận thanh toán',
            ShipmentStatus::PAYMENT_CONFIRMED->value => 'Đã xác nhận thanh toán',
            ShipmentStatus::IN_ORIGIN_WAREHOUSE->value => 'Đang ở kho gửi',
            ShipmentStatus::IN_TRANSIT->value => 'Đang vận chuyển',
            ShipmentStatus::IN_DEST_WAREHOUSE->value => 'Đang ở kho nhận',
            ShipmentStatus::OUT_FOR_DELIVERY->value => 'Đang giao hàng',
            ShipmentStatus::DELIVERED_SUCCESS->value => 'Giao hàng thành công',
            ShipmentStatus::DELIVERY_FAILED->value => 'Giao hàng thất bại',
            ShipmentStatus::ISSUE->value => 'Gặp sự cố',
            ShipmentStatus::RETURN_CREATED->value => 'Tạo đơn hoàn',
            ShipmentStatus::RETURN_IN_TRANSIT->value => 'Đang hoàn hàng',
            ShipmentStatus::RETURNED_TO_ORIGIN->value => 'Đã về kho gửi',
            ShipmentStatus::RETURN_COMPLETED->value => 'Hoàn tất hoàn hàng',
            ShipmentStatus::DISPOSED->value => 'Đã xử lý hủy',
            ShipmentStatus::CLOSED->value => 'Đã đóng',
        ];

        $newLabel = $statusLabels[$newStatus] ?? $newStatus;
        $oldLabel = $oldStatus ? ($statusLabels[$oldStatus] ?? $oldStatus) : null;

        $title = 'Cập nhật trạng thái đơn hàng';
        $message = $oldLabel
            ? ('Đơn hàng ' . $trackingId . ' chuyển trạng thái: ' . $oldLabel . ' → ' . $newLabel)
            : ('Đơn hàng ' . $trackingId . ' cập nhật trạng thái: ' . $newLabel);

        // Recipients:
        // - Admin: all
        // - Agent: only agents in same branch as shipment (if assigned_branch_id exists)
        // - Customer: shipment owner (subset of statuses)

        $adminUsers = User::where('role', 'ADMIN')->pluck('id');
        $agentUsers = collect();
        if ($shipment->assigned_branch_id) {
            $agentUsers = User::where('role', 'AGENT')
                ->where('branch_id', $shipment->assigned_branch_id)
                ->pluck('id');
        }

        $staffRecipientIds = $adminUsers
            ->merge($agentUsers)
            ->unique()
            ->values();

        foreach ($staffRecipientIds as $userId) {
            Notification::create([
                'user_id' => $userId,
                'type' => 'shipment_status',
                'title' => $title,
                'message' => $message,
                'related_type' => 'shipment',
                'related_id' => $shipment->shipment_id,
            ]);
        }

        // Customer subset
        $customerStatuses = [
            ShipmentStatus::BOOKED->value,
            ShipmentStatus::IN_TRANSIT->value,
            ShipmentStatus::DELIVERED_SUCCESS->value,
        ];

        if ($shipment->user_id && in_array($newStatus, $customerStatuses, true)) {
            Notification::create([
                'user_id' => $shipment->user_id,
                'type' => 'shipment_status',
                'title' => $title,
                'message' => $message,
                'related_type' => 'shipment',
                'related_id' => $shipment->shipment_id,
            ]);
        }
    }

    private function handlePickupScheduled(Shipment $shipment, array $payload, int $userId): void
    {
        // Backward-compatible payload keys
        $start = $payload['scheduledStart'] ?? $payload['scheduled_start'] ?? null;
        $end = $payload['scheduledEnd'] ?? $payload['scheduled_end'] ?? null;

        if (!$start || !$end) {
            throw new \InvalidArgumentException('scheduledStart and scheduledEnd required');
        }

        $oldStart = $shipment->pickupSchedule?->scheduled_start_at;
        $oldEnd = $shipment->pickupSchedule?->scheduled_end_at;

        $schedule = $shipment->pickupSchedule ?: new PickupSchedule();
        $schedule->shipment_id = $shipment->shipment_id;
        $schedule->branch_id = $shipment->assigned_branch_id;
        $schedule->scheduled_start_at = $start;
        $schedule->scheduled_end_at = $end;
        $schedule->status = 'CONFIRMED';
        $schedule->confirmed_at = now();
        $schedule->confirmed_by = $userId;
        $schedule->save();

        if ($oldStart || $oldEnd) {
            PickupScheduleHistory::create([
                'pickup_schedule_id' => $schedule->pickup_schedule_id,
                'shipment_id' => $shipment->shipment_id,
                'old_start_at' => $oldStart,
                'old_end_at' => $oldEnd,
                'new_start_at' => $schedule->scheduled_start_at,
                'new_end_at' => $schedule->scheduled_end_at,
                'change_reason' => 'SCHEDULED',
                'changed_by' => $userId,
                'changed_at' => now(),
                'note' => $payload['reason'] ?? null,
            ]);
        }
    }

    private function handlePickupRescheduled(Shipment $shipment, array $payload, int $userId): void
    {
        // Treat reschedule as an issue that keeps PICKUP_RESCHEDULED status for admin handling.
        $reason = (string) ($payload['reason'] ?? 'PICKUP_RESCHEDULED');

        // If schedule window provided, store it and write history
        $start = $payload['scheduledStart'] ?? null;
        $end = $payload['scheduledEnd'] ?? null;

        if ($start && $end) {
            $this->handlePickupScheduled($shipment, ['scheduledStart' => $start, 'scheduledEnd' => $end, 'reason' => $reason], $userId);
        }

        // Create call log entry
        $attemptNo = (int) (CallLog::where('shipment_id', $shipment->shipment_id)->max('attempt_no') ?? 0) + 1;
        CallLog::create([
            'shipment_id' => $shipment->shipment_id,
            'assignment_id' => null,
            'call_type' => 'PICKUP_CONTACT',
            'target_role' => 'CUSTOMER',
            'target_phone' => $shipment->sender_phone ?? 'N/A',
            'driver_id' => null,
            'branch_id' => $shipment->assigned_branch_id,
            'attempt_no' => $attemptNo,
            'call_started_at' => now(),
            'call_ended_at' => null,
            'call_result' => 'NO_ANSWER',
            'duration_seconds' => null,
            'note' => $reason,
        ]);

        // Create admin task
        $taskCode = 'TASK-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
        $task = AdminTask::create([
            'task_code' => $taskCode,
            'task_type' => 'PICKUP_RESCHEDULE',
            'priority' => 50,
            'status' => 'OPEN',
            'shipment_id' => $shipment->shipment_id,
            'branch_id' => $shipment->assigned_branch_id,
            'related_table' => 'shipments',
            'related_id' => $shipment->shipment_id,
            'title' => 'Pickup reschedule required',
            'description' => $payload['note'] ?? $reason,
            'due_at' => now()->addHours(6),
        ]);

        AdminTaskEvent::create([
            'task_id' => $task->task_id,
            'event_type' => 'CREATED',
            'event_at' => now(),
            'actor_type' => 'USER',
            'actor_id' => $userId,
            'old_status' => null,
            'new_status' => 'OPEN',
            'message' => 'Pickup reschedule created: ' . $reason,
        ]);
    }

    private function handleOnTheWayPickup(Shipment $shipment, array $payload, int $userId): void
    {
        if (!$shipment->pickupSchedule) {
            throw new \RuntimeException('Pickup schedule is required before ON_THE_WAY_PICKUP');
        }

        $driver = Driver::where('is_active', true)
            ->when($shipment->assigned_branch_id, function ($q) use ($shipment) {
                $q->where('branch_id', $shipment->assigned_branch_id);
            })
            ->first();

        if (!$driver) {
            $driver = Driver::where('is_active', true)->inRandomOrder()->first();
        }

        if (!$driver) {
            throw new \RuntimeException('No active driver available');
        }

        $existing = DriverAssignment::where('shipment_id', $shipment->shipment_id)
            ->where('assignment_type', 'PICKUP')
            ->first();

        if ($existing) {
            $existing->update([
                'branch_id' => $shipment->assigned_branch_id,
                'driver_id' => $driver->driver_id,
                'status' => 'IN_PROGRESS',
                'assigned_by_type' => 'SYSTEM',
                'assigned_by' => $userId,
                'assigned_at' => $existing->assigned_at ?? now(),
                'accepted_at' => $existing->accepted_at ?? now(),
                'started_at' => $existing->started_at ?? now(),
                'is_active' => true,
            ]);
        } else {
            DriverAssignment::create([
                'shipment_id' => $shipment->shipment_id,
                'assignment_type' => 'PICKUP',
                'branch_id' => $shipment->assigned_branch_id,
                'driver_id' => $driver->driver_id,
                'status' => 'IN_PROGRESS',
                'assigned_by_type' => 'SYSTEM',
                'assigned_by' => $userId,
                'assigned_at' => now(),
                'accepted_at' => now(),
                'started_at' => now(),
                'completed_at' => null,
                'cancelled_at' => null,
                'eta_at' => now()->addHours(2),
                'distance_km' => null,
                'note' => null,
                'is_active' => true,
            ]);
        }
    }

    private function handleIssue(Shipment $shipment, array $payload, int $userId): void
    {
        $reason = (string) ($payload['reason'] ?? 'GENERAL_ISSUE');

        $attemptNo = (int) (CallLog::where('shipment_id', $shipment->shipment_id)->max('attempt_no') ?? 0) + 1;

        CallLog::create([
            'shipment_id' => $shipment->shipment_id,
            'assignment_id' => null,
            'call_type' => 'PICKUP_CONTACT',
            'target_role' => 'CUSTOMER',
            'target_phone' => $shipment->sender_phone ?? 'N/A',
            'driver_id' => null,
            'branch_id' => $shipment->assigned_branch_id,
            'attempt_no' => $attemptNo,
            'call_started_at' => now(),
            'call_ended_at' => null,
            'call_result' => 'NO_ANSWER',
            'duration_seconds' => null,
            'note' => $reason,
        ]);

        $taskCode = 'TASK-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));

        $task = AdminTask::create([
            'task_code' => $taskCode,
            'task_type' => 'SHIPMENT_ISSUE',
            'priority' => 50,
            'status' => 'OPEN',
            'shipment_id' => $shipment->shipment_id,
            'branch_id' => $shipment->assigned_branch_id,
            'driver_id' => null,
            'manifest_id' => null,
            'return_order_id' => null,
            'related_table' => 'shipments',
            'related_id' => $shipment->shipment_id,
            'title' => 'Shipment issue: ' . $reason,
            'description' => $payload['note'] ?? null,
            'due_at' => now()->addHours(6),
            'assigned_to' => null,
            'assigned_at' => null,
            'resolved_at' => null,
            'resolution_code' => null,
            'resolution_note' => null,
        ]);

        AdminTaskEvent::create([
            'task_id' => $task->task_id,
            'event_type' => 'CREATED',
            'event_at' => now(),
            'actor_type' => 'USER',
            'actor_id' => $userId,
            'old_status' => null,
            'new_status' => 'OPEN',
            'message' => 'Issue created from status transition: ' . $reason,
        ]);
    }

    private function handleCheckItem(Shipment $shipment, array $payload, int $userId): void
    {
        $insp = $shipment->goodsInspection ?: new GoodsInspection();
        $insp->shipment_id = $shipment->shipment_id;
        $insp->branch_id = $shipment->assigned_branch_id;
        $insp->inspected_at = now();
        $insp->actual_weight_kg = $payload['weightKg'] ?? null;
        $insp->actual_length_cm = $payload['lengthCm'] ?? null;
        $insp->actual_width_cm = $payload['widthCm'] ?? null;
        $insp->actual_height_cm = $payload['heightCm'] ?? null;
        $insp->note = $payload['note'] ?? null;
        $insp->save();
    }

    private function handleCheckPrice(Shipment $shipment, array $payload, int $userId): void
    {
        if (!isset($payload['amount'])) {
            throw new \InvalidArgumentException('amount required');
        }

        $intent = $shipment->paymentIntent ?: new PaymentIntent();
        $intent->shipment_id = $shipment->shipment_id;
        $intent->currency = $payload['currency'] ?? 'VND';
        $intent->method = $payload['method'] ?? 'COD';
        $intent->provider = $payload['provider'] ?? 'INTERNAL';
        $intent->amount = $payload['amount'];
        $intent->status = 'PENDING';
        $intent->created_at = now();
        $intent->save();
    }

    private function handlePaymentConfirmed(Shipment $shipment): void
    {
        $intent = $shipment->paymentIntent;
        if (!$intent) {
            throw new \RuntimeException('Payment intent not found');
        }
        $intent->status = 'CONFIRMED';
        $intent->confirmed_at = now();
        $intent->save();
    }

    private function handlePickupComplete(Shipment $shipment): void
    {
        if ($shipment->pickupSchedule) {
            $shipment->pickupSchedule->status = 'COMPLETED';
            $shipment->pickupSchedule->save();
        }

        DriverAssignment::where('shipment_id', $shipment->shipment_id)
            ->where('assignment_type', 'PICKUP')
            ->where('is_active', true)
            ->update([
                'status' => 'COMPLETED',
                'completed_at' => now(),
                'is_active' => false,
            ]);
    }

    public function autoAssignBranch($shipment)
    {
        try {
            if (!in_array($shipment->shipment_status, ['BOOKED', 'PRICE_ESTIMATED']) || $shipment->assigned_branch_id) {
                return false;
            }

            $senderProvinceCode = $shipment->sender_province_code;

            if (!$senderProvinceCode) {
                return false;
            }

            $branch = Branch::where('province_code', $senderProvinceCode)
                ->where('status', 'ACTIVE')
                ->first();

            if (!$branch) {
                $branch = Branch::where('status', 'ACTIVE')->first();
            }

            if ($branch) {
                $shipment->assigned_branch_id = $branch->id;
                $shipment->shipment_status = 'BRANCH_ASSIGNED';
                $shipment->assigned_at = now();
                $shipment->save();
                return true;
            }

            return false;
        } catch (\Exception $e) {
            \Log::error('Error auto-assigning branch: ' . $e->getMessage());
            return false;
        }
    }

    public function autoAssignBranches(Request $request)
    {
        try {
            $user = Auth::user();

            if (!in_array($user->role, ['ADMIN', 'AGENT'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $shipments = Shipment::whereIn('shipment_status', ['BOOKED', 'PRICE_ESTIMATED'])
                ->whereNull('assigned_branch_id')
                ->get();

            $assignedCount = 0;
            $failedCount = 0;

            foreach ($shipments as $shipment) {
                if ($this->autoAssignBranch($shipment)) {
                    $assignedCount++;
                } else {
                    $failedCount++;
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Assigned branches to {$assignedCount} shipments. {$failedCount} failed.",
                'data' => [
                    'assigned' => $assignedCount,
                    'failed' => $failedCount,
                    'total' => $shipments->count(),
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error auto-assigning branches: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error auto-assigning branches: ' . $e->getMessage()
            ], 500);
        }
    }
}
