<?php

namespace Database\Seeders;

use App\Models\DistrictMaster;
use Illuminate\Database\Seeder;

class DistrictMasterSeeder extends Seeder
{
    public function run(): void
    {
        $districts = [
            // Hà Nội
            ['district_code' => '001', 'province_code' => 'HN', 'district_name' => 'Quận Ba Đình', 'district_name_raw' => 'Ba Đình', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '002', 'province_code' => 'HN', 'district_name' => 'Quận Hoàn Kiếm', 'district_name_raw' => 'Hoàn Kiếm', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '003', 'province_code' => 'HN', 'district_name' => 'Quận Tây Hồ', 'district_name_raw' => 'Tây Hồ', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '004', 'province_code' => 'HN', 'district_name' => 'Quận Long Biên', 'district_name_raw' => 'Long Biên', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '005', 'province_code' => 'HN', 'district_name' => 'Quận Cầu Giấy', 'district_name_raw' => 'Cầu Giấy', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '006', 'province_code' => 'HN', 'district_name' => 'Quận Đống Đa', 'district_name_raw' => 'Đống Đa', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '007', 'province_code' => 'HN', 'district_name' => 'Quận Hai Bà Trưng', 'district_name_raw' => 'Hai Bà Trưng', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '008', 'province_code' => 'HN', 'district_name' => 'Quận Hoàng Mai', 'district_name_raw' => 'Hoàng Mai', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '009', 'province_code' => 'HN', 'district_name' => 'Quận Thanh Xuân', 'district_name_raw' => 'Thanh Xuân', 'district_type' => 'QUAN', 'is_active' => true],
            // TP.HCM
            ['district_code' => '760', 'province_code' => 'HCM', 'district_name' => 'Quận 1', 'district_name_raw' => 'Quận 1', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '761', 'province_code' => 'HCM', 'district_name' => 'Quận 12', 'district_name_raw' => 'Quận 12', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '764', 'province_code' => 'HCM', 'district_name' => 'Quận Gò Vấp', 'district_name_raw' => 'Gò Vấp', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '765', 'province_code' => 'HCM', 'district_name' => 'Quận Bình Thạnh', 'district_name_raw' => 'Bình Thạnh', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '766', 'province_code' => 'HCM', 'district_name' => 'Quận Tân Bình', 'district_name_raw' => 'Tân Bình', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '767', 'province_code' => 'HCM', 'district_name' => 'Quận Tân Phú', 'district_name_raw' => 'Tân Phú', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '768', 'province_code' => 'HCM', 'district_name' => 'Quận Phú Nhuận', 'district_name_raw' => 'Phú Nhuận', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '769', 'province_code' => 'HCM', 'district_name' => 'Thành phố Thủ Đức', 'district_name_raw' => 'Thủ Đức', 'district_type' => 'THANH_PHO', 'is_active' => true],
            // Đà Nẵng
            ['district_code' => '490', 'province_code' => 'DN', 'district_name' => 'Quận Hải Châu', 'district_name_raw' => 'Hải Châu', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '491', 'province_code' => 'DN', 'district_name' => 'Quận Thanh Khê', 'district_name_raw' => 'Thanh Khê', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '492', 'province_code' => 'DN', 'district_name' => 'Quận Sơn Trà', 'district_name_raw' => 'Sơn Trà', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '493', 'province_code' => 'DN', 'district_name' => 'Quận Ngũ Hành Sơn', 'district_name_raw' => 'Ngũ Hành Sơn', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '494', 'province_code' => 'DN', 'district_name' => 'Quận Liên Chiểu', 'district_name_raw' => 'Liên Chiểu', 'district_type' => 'QUAN', 'is_active' => true],
            ['district_code' => '495', 'province_code' => 'DN', 'district_name' => 'Huyện Hòa Vang', 'district_name_raw' => 'Hòa Vang', 'district_type' => 'HUYEN', 'is_active' => true],
        ];

        foreach ($districts as $district) {
            DistrictMaster::firstOrCreate(
                ['district_code' => $district['district_code']],
                $district
            );
        }

        $this->command->info('✅ Created ' . count($districts) . ' districts');
    }
}
