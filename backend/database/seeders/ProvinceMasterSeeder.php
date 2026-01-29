<?php

namespace Database\Seeders;

use App\Models\ProvinceMaster;
use Illuminate\Database\Seeder;

class ProvinceMasterSeeder extends Seeder
{
    public function run(): void
    {
        $provinces = [
            ['province_code' => 'HN', 'province_name' => 'Hà Nội', 'province_type' => 'THANH_PHO', 'region_code' => 'NORTH', 'latitude' => 21.0285, 'longitude' => 105.8542],
            ['province_code' => 'HCM', 'province_name' => 'TP. Hồ Chí Minh', 'province_type' => 'THANH_PHO', 'region_code' => 'SOUTH', 'latitude' => 10.7769, 'longitude' => 106.7009],
            ['province_code' => 'HP', 'province_name' => 'Hải Phòng', 'province_type' => 'THANH_PHO', 'region_code' => 'NORTH', 'latitude' => 20.8449, 'longitude' => 106.6881],
            ['province_code' => 'HUE', 'province_name' => 'Huế', 'province_type' => 'THANH_PHO', 'region_code' => 'CENTRAL', 'latitude' => 16.4637, 'longitude' => 107.5909],
            ['province_code' => 'DN', 'province_name' => 'Đà Nẵng', 'province_type' => 'THANH_PHO', 'region_code' => 'CENTRAL', 'latitude' => 16.0544, 'longitude' => 108.2022],
            ['province_code' => 'CT', 'province_name' => 'Cần Thơ', 'province_type' => 'THANH_PHO', 'region_code' => 'SOUTH', 'latitude' => 10.0452, 'longitude' => 105.7469],

            ['province_code' => 'CB', 'province_name' => 'Cao Bằng', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 22.6666, 'longitude' => 106.2639],
            ['province_code' => 'LS', 'province_name' => 'Lạng Sơn', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 21.8537, 'longitude' => 106.7610],
            ['province_code' => 'NB', 'province_name' => 'Ninh Bình', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 20.2530, 'longitude' => 105.9740],
            ['province_code' => 'PT', 'province_name' => 'Phú Thọ', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 21.3227, 'longitude' => 105.4010],
            ['province_code' => 'QN', 'province_name' => 'Quảng Ninh', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 21.0064, 'longitude' => 107.2925],
            ['province_code' => 'SL', 'province_name' => 'Sơn La', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 21.3256, 'longitude' => 103.9188],
            ['province_code' => 'TQ', 'province_name' => 'Tuyên Quang', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 21.8236, 'longitude' => 105.2141],
            ['province_code' => 'VP', 'province_name' => 'Vĩnh Phúc', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 21.3609, 'longitude' => 105.5474],
            ['province_code' => 'BN', 'province_name' => 'Bắc Ninh', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 21.1861, 'longitude' => 106.0763],
            ['province_code' => 'HY', 'province_name' => 'Hưng Yên', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 20.8526, 'longitude' => 106.0169],
            ['province_code' => 'LC', 'province_name' => 'Lào Cai', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 22.3381, 'longitude' => 104.1487],
            ['province_code' => 'LCH', 'province_name' => 'Lai Châu', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 22.3862, 'longitude' => 103.4703],
            ['province_code' => 'DB', 'province_name' => 'Điện Biên', 'province_type' => 'TINH', 'region_code' => 'NORTH', 'latitude' => 21.3856, 'longitude' => 103.0169],

            ['province_code' => 'TH', 'province_name' => 'Thanh Hóa', 'province_type' => 'TINH', 'region_code' => 'CENTRAL', 'latitude' => 19.8070, 'longitude' => 105.7760],
            ['province_code' => 'NA', 'province_name' => 'Nghệ An', 'province_type' => 'TINH', 'region_code' => 'CENTRAL', 'latitude' => 18.6796, 'longitude' => 105.6813],
            ['province_code' => 'HT', 'province_name' => 'Hà Tĩnh', 'province_type' => 'TINH', 'region_code' => 'CENTRAL', 'latitude' => 18.3559, 'longitude' => 105.8877],
            ['province_code' => 'QT', 'province_name' => 'Quảng Trị', 'province_type' => 'TINH', 'region_code' => 'CENTRAL', 'latitude' => 16.8163, 'longitude' => 107.1003],
            ['province_code' => 'QNG', 'province_name' => 'Quảng Ngãi', 'province_type' => 'TINH', 'region_code' => 'CENTRAL', 'latitude' => 15.1214, 'longitude' => 108.8044],
            ['province_code' => 'GL', 'province_name' => 'Gia Lai', 'province_type' => 'TINH', 'region_code' => 'CENTRAL', 'latitude' => 13.9833, 'longitude' => 108.0000],
            ['province_code' => 'KH', 'province_name' => 'Khánh Hòa', 'province_type' => 'TINH', 'region_code' => 'CENTRAL', 'latitude' => 12.2585, 'longitude' => 109.0526],
            ['province_code' => 'LD', 'province_name' => 'Lâm Đồng', 'province_type' => 'TINH', 'region_code' => 'CENTRAL', 'latitude' => 11.9404, 'longitude' => 108.4583],
            ['province_code' => 'DLK', 'province_name' => 'Đắk Lắk', 'province_type' => 'TINH', 'region_code' => 'CENTRAL', 'latitude' => 12.7100, 'longitude' => 108.2378],

            ['province_code' => 'DNA', 'province_name' => 'Đồng Nai', 'province_type' => 'TINH', 'region_code' => 'SOUTH', 'latitude' => 10.9574, 'longitude' => 106.8429],
            ['province_code' => 'TN', 'province_name' => 'Tây Ninh', 'province_type' => 'TINH', 'region_code' => 'SOUTH', 'latitude' => 11.3352, 'longitude' => 106.1099],
            ['province_code' => 'VL', 'province_name' => 'Vĩnh Long', 'province_type' => 'TINH', 'region_code' => 'SOUTH', 'latitude' => 10.2396, 'longitude' => 105.9572],
            ['province_code' => 'DT', 'province_name' => 'Đồng Tháp', 'province_type' => 'TINH', 'region_code' => 'SOUTH', 'latitude' => 10.4938, 'longitude' => 105.6882],
            ['province_code' => 'CM', 'province_name' => 'Cà Mau', 'province_type' => 'TINH', 'region_code' => 'SOUTH', 'latitude' => 9.1769, 'longitude' => 105.1524],
            ['province_code' => 'AG', 'province_name' => 'An Giang', 'province_type' => 'TINH', 'region_code' => 'SOUTH', 'latitude' => 10.5216, 'longitude' => 105.1259],

            ['province_code' => 'BDU', 'province_name' => 'Bình Dương', 'province_type' => 'TINH', 'region_code' => 'SOUTH', 'latitude' => 11.3254, 'longitude' => 106.4773],
            ['province_code' => 'LA', 'province_name' => 'Long An', 'province_type' => 'TINH', 'region_code' => 'SOUTH', 'latitude' => 10.6086, 'longitude' => 106.4057],
        ];

        foreach ($provinces as $province) {
            ProvinceMaster::firstOrCreate(
                ['province_code' => $province['province_code']],
                $province
            );
        }

        $this->command->info('✅ Created ' . count($provinces) . ' provinces');
    }
}
