<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Branch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Admin User (or update if exists)
        $admin = User::firstOrCreate(
            ['email' => 'admin@courierxpress.com'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('admin123456'),
                'role' => 'ADMIN',
                'status' => 'ACTIVE',
            ]
        );

        // Seed prohibited categories and keywords
        $this->call(ProhibitedCategorySeeder::class);
        $this->call(ProhibitedKeywordSeeder::class);
        
        // Seed province master data FIRST (before branches which depend on it)
        $this->call(ProvinceMasterSeeder::class);
        $this->call(ProvinceAliasSeeder::class);
        $this->call(DistrictMasterSeeder::class);
        $this->call(DistrictAliasSeeder::class);
        $this->call(WardMasterSeeder::class);
        $this->call(WardAliasSeeder::class);
        
        // Seed branches (after provinces)
        $this->call(BranchSeeder::class);
        
        // Seed vehicles
        $this->call(VehicleSeeder::class);
        $this->call(VehicleSupportedGoodsSeeder::class);
        $this->call(BranchVehicleSeeder::class);
        $this->call(VehicleLoadTrackingSeeder::class);
        
        // Seed sample shipments
        $this->call(ShipmentSeeder::class);
        $this->call(ShipmentVehicleAssignmentLogSeeder::class);
        
        // Seed drivers
        $this->call(DriverSeeder::class);
        
        // Seed pickup schedules
        $this->call(PickupScheduleSeeder::class);
        
        // Seed driver assignments
        $this->call(DriverAssignmentSeeder::class);
        
        // Seed call logs
        $this->call(CallLogSeeder::class);
        
        // Seed goods inspections
        $this->call(GoodsInspectionSeeder::class);
        
        // Seed payment intents
        $this->call(PaymentIntentSeeder::class);
        
        // Seed warehouse scans and reconciliations
        $this->call(WarehouseScanSeeder::class);
        
        // Seed transit manifests
        $this->call(TransitManifestSeeder::class);
        
        // Seed return orders
        $this->call(ReturnOrderSeeder::class);
        
        // Seed admin tasks
        $this->call(AdminTaskSeeder::class);
        
        // Seed test data for CourierManagement frontend
        $this->call(CourierManagementTestSeeder::class);
        
        // Seed customers
        $this->call(CustomerSeeder::class);
        
        // Seed bills (only from successfully delivered shipments)
        $this->call(BillSeeder::class);

        // Get first branch for agent
        $branch = Branch::first();

        // Create Agent User (linked to branch) (or update if exists)
        $agent = User::firstOrCreate(
            ['email' => 'agent@courierxpress.com'],
            [
                'name' => 'Branch Agent',
                'password' => Hash::make('agent123456'),
                'role' => 'AGENT',
                'branch_id' => $branch?->id,
                'status' => 'ACTIVE',
            ]
        );

        // Create Customer User (or update if exists)
        $customer = User::firstOrCreate(
            ['email' => 'customer@example.com'],
            [
                'name' => 'Test Customer',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'status' => 'ACTIVE',
            ]
        );

        $this->command->info('✅ Created default users:');
        $this->command->info('   Admin: admin@courierxpress.com / admin123456');
        $this->command->info('   Agent: agent@courierxpress.com / agent123456');
        $this->command->info('   Customer: customer@example.com / customer123');
    }
}
