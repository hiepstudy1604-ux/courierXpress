<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        $branches = [
            [
                'branch_code' => 'HN',
                'name' => 'Chi nhánh Hà Nội',
                'location' => 'Hà Nội',
                'city' => 'Hà Nội',
                'district' => 'Hoàn Kiếm',
                'address' => '123 Phố Hàng Bông, Hoàn Kiếm',
                'address_text' => '123 Phố Hàng Bông, Hoàn Kiếm, Hà Nội',
                'province_code' => 'HN',
                'latitude' => 21.0285,
                'longitude' => 105.8542,
                'branch_manager_name' => 'Nguyễn Văn A',
                'branch_manager_phone' => '0901000001',
                'agent_code' => 'AG-HN-001',
                'status' => 'ACTIVE',
                'is_active' => true,
            ],
            [
                'branch_code' => 'HCM',
                'name' => 'Chi nhánh TP. Hồ Chí Minh',
                'location' => 'TP. Hồ Chí Minh',
                'city' => 'TP. Hồ Chí Minh',
                'district' => 'Quận 1',
                'address' => '456 Nguyễn Huệ, Quận 1',
                'address_text' => '456 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
                'province_code' => 'HCM',
                'latitude' => 10.7769,
                'longitude' => 106.7009,
                'branch_manager_name' => 'Trần Thị B',
                'branch_manager_phone' => '0902000001',
                'agent_code' => 'AG-HCM-001',
                'status' => 'ACTIVE',
                'is_active' => true,
            ],
            [
                'branch_code' => 'DN',
                'name' => 'Chi nhánh Đà Nẵng',
                'location' => 'Đà Nẵng',
                'city' => 'Đà Nẵng',
                'district' => 'Hải Châu',
                'address' => '789 Lê Duẩn, Hải Châu',
                'address_text' => '789 Lê Duẩn, Hải Châu, Đà Nẵng',
                'province_code' => 'DN',
                'latitude' => 16.0544,
                'longitude' => 108.2022,
                'branch_manager_name' => 'Lê Văn C',
                'branch_manager_phone' => '0903000001',
                'agent_code' => 'AG-DN-001',
                'status' => 'ACTIVE',
                'is_active' => true,
            ], 
        ];

        foreach ($branches as $branch) {
            Branch::firstOrCreate(
                ['branch_code' => $branch['branch_code']],
                $branch
            );
        }

        $this->command->info('✅ Created ' . count($branches) . ' branches');
    }
}
