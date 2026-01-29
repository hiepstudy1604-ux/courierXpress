<?php

namespace Database\Seeders;

use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComprehensiveNotificationSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding notifications...');

        $shipments = Shipment::with('user')->get();

        $templates = [
            'BRANCH_ASSIGNED' => [
                'type' => 'shipment_status',
                'title' => 'Đơn hàng đã được phân bổ chi nhánh',
                'message' => 'Đơn hàng {trackingId} đã được phân bổ đến chi nhánh. Vui lòng chờ nhận hàng.',
            ],
            'PICKUP_SCHEDULED' => [
                'type' => 'shipment_status',
                'title' => 'Lịch lấy hàng đã được xác nhận',
                'message' => 'Đơn hàng {trackingId} đã được lên lịch lấy hàng. Vui lòng chuẩn bị hàng hóa.',
            ],
            'PICKUP_COMPLETED' => [
                'type' => 'shipment_status',
                'title' => 'Hàng đã được lấy thành công',
                'message' => 'Đơn hàng {trackingId} đã được lấy thành công và đang được vận chuyển.',
            ],
            'IN_TRANSIT' => [
                'type' => 'shipment_status',
                'title' => 'Hàng đang trong quá trình vận chuyển',
                'message' => 'Đơn hàng {trackingId} đang trong quá trình vận chuyển đến điểm đến.',
            ],
            'OUT_FOR_DELIVERY' => [
                'type' => 'shipment_status',
                'title' => 'Hàng đang được giao',
                'message' => 'Đơn hàng {trackingId} đang được giao đến bạn. Vui lòng chuẩn bị nhận hàng.',
            ],
            'DELIVERED_SUCCESS' => [
                'type' => 'shipment_status',
                'title' => 'Giao hàng thành công',
                'message' => 'Đơn hàng {trackingId} đã được giao thành công. Cảm ơn bạn đã sử dụng dịch vụ!',
            ],
            'DELIVERY_FAILED' => [
                'type' => 'shipment_status',
                'title' => 'Giao hàng không thành công',
                'message' => 'Giao hàng đơn hàng {trackingId} không thành công. Chúng tôi sẽ thử lại sau.',
            ],
            'RETURN_CREATED' => [
                'type' => 'shipment_status',
                'title' => 'Đơn hàng được tạo yêu cầu trả hàng',
                'message' => 'Đơn hàng {trackingId} đã được tạo yêu cầu trả hàng.',
            ],
        ];

        $rows = [];
        $batchSize = 500;
        $processed = 0;

        foreach ($shipments as $shipment) {
            $user = $shipment->user;
            if (!$user) {
                continue;
            }

            $status = $shipment->shipment_status;
            if (!isset($templates[$status])) {
                continue;
            }

            $template = $templates[$status];

            $trackingId = $shipment->tracking_id
                ?? ('CX-' . str_pad((string) $shipment->shipment_id, 10, '0', STR_PAD_LEFT));

            $createdAt = Carbon::parse($shipment->updated_at ?? $shipment->created_at);

            // Deterministic dedupe key: one notification per (user, type, related shipment, status)
            $dedupeKey = 'shipment_status:' . $status . ':' . $shipment->shipment_id;

            $isRead = rand(0, 100) < 30;

            $rows[] = [
                'user_id' => $user->id,
                'type' => $template['type'],
                'title' => $template['title'],
                'message' => str_replace('{trackingId}', $trackingId, $template['message']),
                'related_type' => 'shipment',
                'related_id' => $shipment->shipment_id,
                // Use related_type field as a lightweight namespace for the dedupe key without adding new columns
                // related_type stays 'shipment'; we encode dedupe in title suffix instead to avoid schema change
                'is_read' => $isRead,
                'read_at' => $isRead ? $createdAt->copy()->addMinutes(rand(5, 60)) : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];

            // Slight tweak: keep title unique-ish per status so insertOrIgnore can work if unique indexes exist
            $rows[count($rows) - 1]['title'] = $rows[count($rows) - 1]['title'] . ' [' . $dedupeKey . ']';

            $processed++;

            if (count($rows) >= $batchSize) {
                DB::table('notifications')->insertOrIgnore($rows);
                $rows = [];
                $this->command->info("   Inserted (ignore) {$processed} notifications...");
            }
        }

        if (!empty($rows)) {
            DB::table('notifications')->insertOrIgnore($rows);
        }

        $this->command->info("✅ Seeded notifications (attempted {$processed})");
        $this->command->warn('ℹ️  notifications table has no natural unique key; seeder uses INSERT IGNORE with a deterministic title suffix to reduce duplicates. For strict idempotency, add a unique index (user_id, related_type, related_id, type, title).');
    }
}
