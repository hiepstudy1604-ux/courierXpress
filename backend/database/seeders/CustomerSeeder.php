<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Shipment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Summary: This seeder populates the database with a predefined list of customers and 
 * automatically associates them with unassigned shipments to create realistic test data.
 * Tóm tắt: File seeder này nạp danh sách khách hàng mẫu vào cơ sở dữ liệu và 
 * tự động liên kết họ với các đơn hàng chưa có chủ sở hữu để tạo dữ liệu kiểm thử thực tế.
 */
class CustomerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Chạy các lệnh nạp dữ liệu vào database.
     * * @return void
     */
    public function run(): void
    {
        // Define a list of mock customers with diverse statuses and locations for testing.
        // Định nghĩa danh sách khách hàng mẫu với trạng thái và địa điểm đa dạng để phục vụ kiểm thử.
        $customers = [
            [
                'name' => 'Nguyễn Văn Khách',
                'email' => 'nguyenvankhach@example.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0927374856',
                'address' => '123 Đường ABC, Quận 1, TP.HCM',
                'city' => 'Hồ Chí Minh',
                'status' => 'ACTIVE',
            ],
            [
                'name' => 'Trần Thị Khách',
                'email' => 'tranthikhach@example.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0238475629',
                'address' => '456 Đường XYZ, Hoàn Kiếm, Hà Nội',
                'city' => 'Hà Nội',
                'status' => 'BLOCKED',
            ],
            [
                'name' => 'Lê Văn Khách',
                'email' => 'levankhach@example.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0123456789',
                'address' => '789 Đường 123, Quận 3, TP.HCM',
                'city' => 'Đà Nẵng',
                'status' => 'ACTIVE',
            ],
            [
                'name' => 'Phạm Thị Khách',
                'email' => 'phamthikhach@example.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0987654321',
                'address' => '321 Đường 456, Cầu Giấy, Hà Nội',
                'city' => 'Hà Nội',
                'status' => 'BLOCKED',
            ],
            [
                'name' => 'Hoàng Văn Khách',
                'email' => 'hoangvankhach@example.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0369857421',
                'address' => '654 Đường 789, Quận 5, TP.HCM',
                'city' => 'Hồ Chí Minh',
                'status' => 'ACTIVE',
            ],
            [
                'name' => 'Đỗ Thị Khách',
                'email' => 'dothikhach@example.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0741852963',
                'address' => '987 Đường 321, Tây Hồ, Hà Nội',
                'city' => 'Đà Nẵng',
                'status' => 'BLOCKED',
            ],
            [
                'name' => 'Vũ Văn Khách',
                'email' => 'vuvankhach@example.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0123678945',
                'address' => '159 Đường 753, Quận 7, TP.HCM',
                'city' => 'Hồ Chí Minh',
                'status' => 'ACTIVE',
            ],
            [
                'name' => 'Nguyễn Thành Nam',
                'email' => 'thanhnam.nguyen@gmail.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0909123456',
                'address' => 'Số 12 Đường Lê Lợi, Phường Bến Nghé, Quận 1',
                'city' => 'Hồ Chí Minh',
                'status' => 'ACTIVE',
            ],
            [
                'name' => 'Lê Thị Minh Thư',
                'email' => 'minhthu.le99@yahoo.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0912345678',
                'address' => 'Ngõ 88 Phố Huế, Quận Hai Bà Trưng',
                'city' => 'Hà Nội',
                'status' => 'ACTIVE',
            ],
            [
                'name' => 'Phạm Đức Thắng',
                'email' => 'pdthang.work@outlook.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0988776655',
                'address' => 'Khu đô thị EcoGreen, Quận 7',
                'city' => 'Hồ Chí Minh',
                'status' => 'BLOCKED', // Keep a few blocked users for testing | Giữ một vài user bị khóa để test logic
            ],
            [
                'name' => 'Hoàng Mai Anh',
                'email' => 'maianh.hoang@company.vn',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0933445566',
                'address' => '25 Đường Bạch Đằng, Quận Hải Châu',
                'city' => 'Đà Nẵng',
                'status' => 'ACTIVE',
            ],
            [
                'name' => 'Vũ Quang Huy',
                'email' => 'huyvq.dev@gmail.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0977889900',
                'address' => 'Số 5 Đường Lạch Tray, Quận Ngô Quyền',
                'city' => 'Hải Phòng',
                'status' => 'ACTIVE',
            ],
            [
                'name' => 'Đặng Ngọc Hân',
                'email' => 'ngochan.dang@example.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0966112233',
                'address' => 'Chung cư Royal City, Quận Thanh Xuân',
                'city' => 'Hà Nội',
                'status' => 'BLOCKED',
            ],
            [
                'name' => 'Trần Văn Kiệt',
                'email' => 'kiettran1990@gmail.com',
                'password' => Hash::make('customer123'),
                'role' => 'CUSTOMER',
                'phone' => '0945678901',
                'address' => '102 Đường 30/4, Quận Ninh Kiều',
                'city' => 'Cần Thơ',
                'status' => 'ACTIVE',
            ],
        ];

        $count = 0;
        foreach ($customers as $customerData) {
            /** * Use firstOrCreate to prevent duplicate entries if the seeder is run multiple times.
             * It checks for an existing email before inserting.
             * Sử dụng firstOrCreate để tránh trùng lặp nếu seeder được chạy nhiều lần.
             * Nó sẽ kiểm tra email đã tồn tại hay chưa trước khi thêm mới.
             */
            $customer = User::firstOrCreate(
                ['email' => $customerData['email']],
                $customerData
            );

            /**
             * Assign some shipments to this customer.
             * Logic: Find up to 2 shipments currently not owned by anyone (user_id is null).
             * Gán một số đơn hàng cho khách hàng này.
             * Logic: Tìm tối đa 2 đơn hàng chưa có chủ sở hữu (user_id đang là null).
             */
            $shipments = Shipment::whereNull('user_id')
                ->take(2)
                ->get();

            // Link the retrieved shipments to the newly created/found customer.
            // Liên kết các đơn hàng tìm được với khách hàng vừa tạo/tìm thấy.
            foreach ($shipments as $shipment) {
                $shipment->update(['user_id' => $customer->id]);
            }

            $count++;
        }

        // Output progress to the console for visibility during migrations.
        // In thông báo tiến độ ra console để dễ theo dõi khi chạy migration/seed.
        $this->command->info("✅ Created {$count} customers and linked shipments");
    }
}
