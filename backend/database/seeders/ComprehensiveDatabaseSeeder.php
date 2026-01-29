<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ComprehensiveDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🚀 Starting Comprehensive Database Seeding...');
        $this->command->info('');

        // Idempotency strategy:
        // - local/dev: allow truncate (fast reset)
        // - other envs: rely on upsert/insertOrIgnore in seeders
        if (app()->environment(['local', 'dev'])) {
            $this->command->info('🧹 Detected local/dev environment -> truncating transactional tables...');
            $this->truncateTransactionalTables();
            $this->command->info('');
        }

        // Step 1: Basic setup
        $this->command->info('📋 Step 1: Basic Setup');
        $this->createDefaultUsers();
        $this->call(ProhibitedCategorySeeder::class);
        $this->call(ProhibitedKeywordSeeder::class);

        // Step 2: Geographic data
        $this->command->info('📋 Step 2: Geographic Data');
        $this->call(ProvinceMasterSeeder::class);
        $this->call(ProvinceAliasSeeder::class);
        $this->call(DistrictMasterSeeder::class);
        $this->call(DistrictAliasSeeder::class);
        $this->call(WardMasterSeeder::class);
        $this->call(WardAliasSeeder::class);

        // Step 3: Branches and vehicles
        $this->command->info('📋 Step 3: Branches and Vehicles');
        $this->call(BranchSeeder::class);
        $this->call(VehicleSeeder::class);
        $this->call(VehicleSupportedGoodsSeeder::class);
        $this->call(BranchVehicleSeeder::class);
        $this->call(VehicleLoadTrackingSeeder::class);

        // Step 4: Drivers
        $this->command->info('📋 Step 4: Drivers');
        $this->call(DriverSeeder::class);

        // Step 5: Customers
        $this->command->info('📋 Step 5: Customers');
        $this->call(CustomerSeeder::class);

        // Step 6: Comprehensive Shipments (1500+ shipments)
        $this->command->info('📋 Step 6: Comprehensive Shipments');
        $this->call(ComprehensiveShipmentSeeder::class);

        // Step 7: Pickup schedules
        $this->command->info('📋 Step 7: Pickup Schedules');
        $this->call(ComprehensivePickupScheduleSeeder::class);

        // Step 8: Driver assignments
        $this->command->info('📋 Step 8: Driver Assignments');
        $this->call(ComprehensiveDriverAssignmentSeeder::class);

        // Step 9: Call logs (for failed contacts)
        $this->command->info('📋 Step 9: Call Logs');
        $this->call(ComprehensiveCallLogSeeder::class);

        // Step 10: Goods inspections
        $this->command->info('📋 Step 10: Goods Inspections');
        $this->call(ComprehensiveGoodsInspectionSeeder::class);

        // Step 11: Payment intents
        $this->command->info('📋 Step 11: Payment Intents');
        $this->call(ComprehensivePaymentIntentSeeder::class);

        // Step 12: Warehouse scans
        $this->command->info('📋 Step 12: Warehouse Scans');
        $this->call(ComprehensiveWarehouseScanSeeder::class);

        // Step 13: Transit manifests
        $this->command->info('📋 Step 13: Transit Manifests');
        $this->call(ComprehensiveTransitManifestSeeder::class);

        // Step 14: Return orders
        $this->command->info('📋 Step 14: Return Orders');
        $this->call(ComprehensiveReturnOrderSeeder::class);

        // Step 15: Admin tasks
        $this->command->info('📋 Step 15: Admin Tasks');
        $this->call(ComprehensiveAdminTaskSeeder::class);

        // Step 16: Notifications
        $this->command->info('📋 Step 16: Notifications');
        $this->call(ComprehensiveNotificationSeeder::class);

        // Step 17: Bills
        $this->command->info('📋 Step 17: Bills');
        $this->call(ComprehensiveBillSeeder::class);

        // Step 18: Additional logs
        $this->command->info('📋 Step 18: Additional Logs');
        $this->call(ShipmentVehicleAssignmentLogSeeder::class);

        $this->command->info('');
        $this->command->info('✅ Comprehensive seeding completed!');
        $this->command->info('');
        $this->printSummary();
    }

    private function truncateTransactionalTables(): void
    {
        // Keep master data (province/district/ward, prohibited lists) intact.
        // Reset only transactional tables so re-seeding is fast and clean.
        $tables = [
            // Children first (avoid FK errors)
            'shipment_vehicle_assignment_logs',
            'transit_manifest_event',
            'transit_manifest_item',
            'transit_manifest',
            'warehouse_scan',
            'payment_event_log',
            'payment_intent',
            'return_event_log',
            'return_policy_hold',
            'return_order',
            'bills',
            'notifications',
            'goods_evidence_media',
            'goods_inspection',
            'call_log',
            'driver_assignment_history',
            'driver_assignment',
            'pickup_schedule_history',
            'pickup_schedule',
            'admin_task_events',
            'admin_task',
            'shipments',
        ];

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        foreach ($tables as $table) {
            if (DB::getSchemaBuilder()->hasTable($table)) {
                DB::table($table)->truncate();
            }
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    /**
     * Create default users
     */
    private function createDefaultUsers(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@courierxpress.com'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('admin123456'),
                'role' => 'ADMIN',
                'status' => 'ACTIVE',
            ]
        );

        $branch = Branch::first();
        User::firstOrCreate(
            ['email' => 'agent@courierxpress.com'],
            [
                'name' => 'Branch Agent',
                'password' => Hash::make('agent123456'),
                'role' => 'AGENT',
                'branch_id' => $branch?->id,
                'status' => 'ACTIVE',
            ]
        );

        User::firstOrCreate(
            ['email' => 'customer@example.com'],
            [
                'name' => 'Test Customer',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'status' => 'ACTIVE',
            ]
        );

        $this->command->info('✅ Created default users');
    }

    private function printSummary(): void
    {
        $this->command->info('📊 Database Summary:');
        $this->command->info('');

        $tables = [
            'branches' => 'Branches',
            'driver' => 'Drivers',
            'shipments' => 'Shipments',
            'pickup_schedule' => 'Pickup Schedules',
            'driver_assignment' => 'Driver Assignments',
            'call_log' => 'Call Logs',
            'goods_inspection' => 'Goods Inspections',
            'payment_intent' => 'Payment Intents',
            'warehouse_scan' => 'Warehouse Scans',
            'transit_manifest' => 'Transit Manifests',
            'return_order' => 'Return Orders',
            'admin_task' => 'Admin Tasks',
            'notifications' => 'Notifications',
            'bills' => 'Bills',
        ];

        foreach ($tables as $table => $label) {
            $count = DB::table($table)->count();
            $this->command->info("   {$label}: {$count}");
        }

        $this->command->info('');
        $this->command->info('📈 Shipment Status Distribution:');
        $statusCounts = DB::table('shipments')
            ->select('shipment_status', DB::raw('count(*) as count'))
            ->groupBy('shipment_status')
            ->orderBy('count', 'desc')
            ->get();

        foreach ($statusCounts as $stat) {
            $this->command->info("   {$stat->shipment_status}: {$stat->count}");
        }

        $this->command->info('');
        $this->command->info('💰 Revenue Summary:');
        $totalRevenue = DB::table('payment_intent')
            ->where('status', 'CONFIRMED')
            ->sum('amount_paid');
        $this->command->info('   Total Revenue: ' . number_format($totalRevenue, 2) . ' VND');

        $this->command->info('');
        $this->command->info('✅ Seeding complete! You can now test the application.');
    }
}
