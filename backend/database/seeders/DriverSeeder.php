<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Driver;
use App\Models\Branch;
use App\Models\Vehicle;
use App\Models\DriverVehicleAssignmentHistory;
use Illuminate\Support\Facades\DB;

class DriverSeeder extends Seeder
{
    /**
     * Seed drivers with branch and vehicle assignments
     * - 10 drivers across 3 branches
     * - 50-70% have vehicles assigned
     * - Mix statuses: AVAILABLE, OFFLINE
     */
    public function run(): void
    {
        $branches = Branch::where('is_active', true)->limit(3)->get();
        
        if ($branches->isEmpty()) {
            $this->command->warn('No active branches found. Please seed branches first.');
            return;
        }

        $vehicles = Vehicle::where('is_active', true)->get();
        
        if ($vehicles->isEmpty()) {
            $this->command->warn('No active vehicles found. Please seed vehicles first.');
            return;
        }

        $drivers = [];
        $driverCodes = [];

        // Generate deterministic driver codes to keep seeder idempotent
        for ($i = 1; $i <= 10; $i++) {
            $driverCodes[] = 'DRV-' . str_pad((string) $i, 6, '0', STR_PAD_LEFT);
        }

        // Province codes (matching branch province codes)
        $provinces = ['HN', 'HCM', 'DN']; // Hà Nội, TP.HCM, Đà Nẵng

        DB::beginTransaction();
        
        try {
            foreach ($driverCodes as $index => $code) {
                // Idempotency: if this driver already exists, skip to avoid unique constraint violations
                if (Driver::where('driver_code', $code)->exists()) {
                    continue;
                }

                $branch = $branches[$index % $branches->count()];
                $province = $provinces[$index % count($provinces)];
                
                // 60% chance to assign vehicle
                $assignVehicle = rand(1, 100) <= 60;
                $vehicle = null;
                
                if ($assignVehicle && !$vehicles->isEmpty()) {
                    // Get available vehicle (not assigned to another driver)
                    $availableVehicles = $vehicles->filter(function ($v) {
                        return Driver::where('vehicle_id', $v->vehicle_id)
                            ->where('is_active', true)
                            ->count() === 0;
                    });
                    
                    if ($availableVehicles->isNotEmpty()) {
                        $vehicle = $availableVehicles->random();
                    }
                }

                // Mix statuses: 70% AVAILABLE, 30% OFFLINE
                $status = rand(1, 100) <= 70 ? 'AVAILABLE' : 'OFFLINE';

                $driver = Driver::create([
                    'driver_code' => $code,
                    'full_name' => $this->generateVietnameseName(),
                    // Deterministic phone/email to avoid collisions across reruns
                    // phone format: 09 + 8 digits (e.g. 0900000001)
                    'phone_number' => '09' . str_pad((string) (10000000 + ($index + 1)), 8, '0', STR_PAD_LEFT),
                    'email' => 'driver' . ($index + 1) . '@courierxpress.com',
                    'branch_id' => $branch->id,
                    'vehicle_id' => $vehicle ? $vehicle->vehicle_id : null,
                    'home_province_code' => $province,
                    'working_region' => $this->getWorkingRegion($province),
                    'vehicle_type' => $vehicle ? $vehicle->vehicle_type : 'MOTORBIKE',
                    'license_number' => 'B2-' . str_pad(rand(100000, 999999), 6, '0', STR_PAD_LEFT),
                    'driver_status' => $status,
                    'current_lat' => $branch->latitude ? $branch->latitude + (rand(-50, 50) / 1000) : null,
                    'current_lng' => $branch->longitude ? $branch->longitude + (rand(-50, 50) / 1000) : null,
                    'last_location_at' => now()->subMinutes(rand(5, 120)),
                    'max_active_orders' => rand(3, 8),
                    'is_active' => true,
                    'joined_at' => now()->subMonths(rand(1, 24)),
                ]);

                // Create vehicle assignment history if vehicle assigned
                if ($vehicle) {
                    DriverVehicleAssignmentHistory::create([
                        'driver_id' => $driver->driver_id,
                        'vehicle_id' => $vehicle->vehicle_id,
                        'assigned_at' => $driver->joined_at ?? now(),
                        'assigned_by' => null, // System assigned
                        'note' => 'Initial assignment on driver creation',
                    ]);
                }

                $drivers[] = $driver;
            }

            DB::commit();
            
            $this->command->info('Seeded ' . count($drivers) . ' drivers');
            $this->command->info('Vehicles assigned: ' . collect($drivers)->filter(fn($d) => $d->vehicle_id)->count());
            
        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Error seeding drivers: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Generate Vietnamese name
     */
    private function generateVietnameseName(): string
    {
        $firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
        $middleNames = ['Văn', 'Thị', 'Đức', 'Minh', 'Thanh', 'Hữu', 'Công', 'Quang'];
        $lastNames = ['An', 'Bình', 'Cường', 'Dũng', 'Hùng', 'Khoa', 'Long', 'Mạnh', 'Nam', 'Phong', 'Quang', 'Sơn', 'Thành', 'Tuấn', 'Việt'];
        
        $firstName = $firstNames[array_rand($firstNames)];
        $middleName = $middleNames[array_rand($middleNames)];
        $lastName = $lastNames[array_rand($lastNames)];
        
        return "$firstName $middleName $lastName";
    }

    /**
     * Get working region based on province code
     */
    private function getWorkingRegion(string $provinceCode): string
    {
        $regions = [
            'HN' => 'MIEN_BAC', // Hà Nội
            'HCM' => 'MIEN_NAM', // TP.HCM
            'DN' => 'MIEN_TRUNG', // Đà Nẵng
        ];
        
        return $regions[$provinceCode] ?? 'MIEN_BAC';
    }
}
