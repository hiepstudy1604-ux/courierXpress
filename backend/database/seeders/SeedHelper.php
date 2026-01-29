<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Support\Str;

class SeedHelper
{
    /**
     * Get random shipment status flow
     */
    public static function randomStatusFlow(): array
    {
        $flows = [
            // Simple flow - delivered success
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP',
             'VERIFIED_ITEM', 'CONFIRMED_PRICE', 'PENDING_PAYMENT', 'CONFIRM_PAYMENT', 'PICKUP_COMPLETED',
             'IN_ORIGIN_WAREHOUSE', 'IN_TRANSIT', 'IN_DEST_WAREHOUSE', 'OUT_FOR_DELIVERY', 'DELIVERED_SUCCESS', 'CLOSED'],
            
            // Flow with pickup rescheduled
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_RESCHEDULED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP',
             'VERIFIED_ITEM', 'CONFIRMED_PRICE', 'PENDING_PAYMENT', 'CONFIRM_PAYMENT', 'PICKUP_COMPLETED',
             'IN_ORIGIN_WAREHOUSE', 'IN_TRANSIT', 'IN_DEST_WAREHOUSE', 'OUT_FOR_DELIVERY', 'DELIVERED_SUCCESS', 'CLOSED'],
            
            // Flow with item adjusted + price adjusted
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP',
             'ADJUST_ITEM', 'ADJUSTED_PRICE', 'PENDING_PAYMENT', 'CONFIRM_PAYMENT', 'PICKUP_COMPLETED',
             'IN_ORIGIN_WAREHOUSE', 'IN_TRANSIT', 'IN_DEST_WAREHOUSE', 'OUT_FOR_DELIVERY', 'DELIVERED_SUCCESS', 'CLOSED'],
            
            // Flow with delivery failed
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP',
             'VERIFIED_ITEM', 'CONFIRMED_PRICE', 'PENDING_PAYMENT', 'CONFIRM_PAYMENT', 'PICKUP_COMPLETED',
             'IN_ORIGIN_WAREHOUSE', 'IN_TRANSIT', 'IN_DEST_WAREHOUSE', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'OUT_FOR_DELIVERY',
             'DELIVERED_SUCCESS', 'CLOSED'],
            
            // Flow with return
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP',
             'VERIFIED_ITEM', 'CONFIRMED_PRICE', 'PENDING_PAYMENT', 'CONFIRM_PAYMENT', 'PICKUP_COMPLETED',
             'IN_ORIGIN_WAREHOUSE', 'IN_TRANSIT', 'IN_DEST_WAREHOUSE', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'RETURN_CREATED',
             'RETURN_IN_TRANSIT', 'RETURNED_TO_ORIGIN', 'RETURN_COMPLETED', 'CLOSED'],
            
            // In-progress flows
            ['BOOKED', 'PRICE_ESTIMATED'],
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED'],
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED'],
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP'],
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP', 'VERIFIED_ITEM'],
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP', 'VERIFIED_ITEM', 'CONFIRMED_PRICE'],
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP', 'VERIFIED_ITEM', 'CONFIRMED_PRICE', 'PENDING_PAYMENT'],
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP', 'VERIFIED_ITEM', 'CONFIRMED_PRICE', 'PENDING_PAYMENT', 'CONFIRM_PAYMENT'],
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP', 'VERIFIED_ITEM', 'CONFIRMED_PRICE', 'PENDING_PAYMENT', 'CONFIRM_PAYMENT', 'PICKUP_COMPLETED'],
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP', 'VERIFIED_ITEM', 'CONFIRMED_PRICE', 'PENDING_PAYMENT', 'CONFIRM_PAYMENT', 'PICKUP_COMPLETED', 'IN_ORIGIN_WAREHOUSE'],
            ['BOOKED', 'PRICE_ESTIMATED', 'BRANCH_ASSIGNED', 'PICKUP_SCHEDULED', 'ON_THE_WAY_PICKUP', 'VERIFIED_ITEM', 'CONFIRMED_PRICE', 'PENDING_PAYMENT', 'CONFIRM_PAYMENT', 'PICKUP_COMPLETED', 'IN_ORIGIN_WAREHOUSE', 'IN_TRANSIT'],
        ];
        
        return $flows[array_rand($flows)];
    }

    /**
     * Get timestamps for status flow
     */
    public static function randomTimestampsByStatus(array $statusFlow, Carbon $baseDate): array
    {
        $timestamps = [];
        $currentDate = $baseDate->copy();
        
        foreach ($statusFlow as $index => $status) {
            // Time between statuses varies
            if ($index === 0) {
                $timestamps[$status] = $currentDate->copy();
            } else {
                // Random delay between statuses (minutes to hours)
                $delayMinutes = match($status) {
                    'PRICE_ESTIMATED' => rand(5, 30),
                    'BRANCH_ASSIGNED' => rand(5, 30),
                    'PICKUP_SCHEDULED' => rand(30, 120),
                    'PICKUP_RESCHEDULED' => rand(60, 180),
                    'ON_THE_WAY_PICKUP' => rand(15, 45),
                    'VERIFIED_ITEM' => rand(5, 15),
                    'ADJUST_ITEM' => rand(10, 30),
                    'CONFIRMED_PRICE' => rand(30, 120),
                    'ADJUSTED_PRICE' => rand(30, 180),
                    'PENDING_PAYMENT' => rand(30, 180),
                    'CONFIRM_PAYMENT' => rand(5, 60),
                    'PICKUP_COMPLETED' => rand(30, 90),
                    'IN_ORIGIN_WAREHOUSE' => rand(30, 120),
                    'IN_TRANSIT' => rand(120, 480), // 2-8 hours
                    'IN_DEST_WAREHOUSE' => rand(60, 240),
                    'OUT_FOR_DELIVERY' => rand(30, 120),
                    'DELIVERED_SUCCESS' => rand(30, 180),
                    'DELIVERY_FAILED' => rand(15, 60),
                    'RETURN_CREATED' => rand(60, 240),
                    'RETURN_IN_TRANSIT' => rand(240, 720),
                    'RETURNED_TO_ORIGIN' => rand(60, 180),
                    'RETURN_COMPLETED' => rand(30, 120),
                    'CLOSED' => rand(60, 180),
                    default => rand(30, 120),
                };
                
                $currentDate->addMinutes($delayMinutes);
                $timestamps[$status] = $currentDate->copy();
            }
        }
        
        return $timestamps;
    }

    /**
     * Get random goods type
     */
    public static function randomGoodsType(): string
    {
        $types = [
            'DOCUMENT',
            'CLOTHING',
            'COSMETICS',
            'FOOD',
            'BEVERAGE',
            'ELECTRONICS',
            'OFFICE_EQUIPMENT',
            'HOUSEHOLD',
            'FURNITURE',
            'VEHICLE',
            'CONSTRUCTION_MATERIAL',
            'FRAGILE',
        ];
        
        return $types[array_rand($types)];
    }

    /**
     * Get random province code
     * Note: This is a fallback. Use actual province codes from database instead.
     */
    public static function randomProvinceCode(): string
    {
        $provinces = ['HN', 'HCM', 'DN', 'HP', 'CT', 'KH', 'BD', 'DL', 'LA', 'QT'];
        return $provinces[array_rand($provinces)];
    }
    
    /**
     * Get random province code from available provinces
     */
    public static function randomProvinceCodeFrom(array $availableProvinces): string
    {
        if (empty($availableProvinces)) {
            return self::randomProvinceCode();
        }
        return $availableProvinces[array_rand($availableProvinces)];
    }

    /**
     * Get random route scope
     */
    public static function randomRouteScope(string $senderProvince, string $receiverProvince): string
    {
        if ($senderProvince === $receiverProvince) {
            return 'INTRA_REGION';
        }
        
        $majorCities = ['HN', 'HCM', 'DN'];
        if (in_array($senderProvince, $majorCities) && in_array($receiverProvince, $majorCities)) {
            return 'INTER_REGION_FAR';
        }
        
        return 'INTER_REGION_NEAR';
    }

    /**
     * Calculate actual weight with variance
     */
    public static function calculateActualWeight(float $estimatedWeight): float
    {
        // Variance: -10% to +30%
        $variance = (rand(-10, 30) / 100);
        $actual = $estimatedWeight * (1 + $variance);
        return round(max(0.1, $actual), 2);
    }

    /**
     * Generate tracking code
     */
    public static function generateTrackingCode(int $shipmentId): string
    {
        return 'CX-' . str_pad((string) $shipmentId, 10, '0', STR_PAD_LEFT);
    }

    /**
     * Generate bill number
     */
    public static function generateBillNumber(int $shipmentId): string
    {
        return 'BILL-' . date('Ymd') . '-' . str_pad((string) $shipmentId, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Generate manifest code
     */
    public static function generateManifestCode(): string
    {
        return 'MF-' . date('Ymd') . '-' . strtoupper(Str::random(6));
    }

    /**
     * Generate task code
     */
    public static function generateTaskCode(): string
    {
        return 'TASK-' . date('Ymd') . '-' . strtoupper(Str::random(6));
    }

    /**
     * Get random Vietnamese name
     */
    public static function randomVietnameseName(): string
    {
        $firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ'];
        $middleNames = ['Văn', 'Thị', 'Đức', 'Minh', 'Thanh', 'Hữu', 'Công'];
        $lastNames = ['An', 'Bình', 'Cường', 'Dũng', 'Giang', 'Hải', 'Khang', 'Long', 'Minh', 'Nam', 'Phong', 'Quang', 'Sơn', 'Tuấn'];
        
        $firstName = $firstNames[array_rand($firstNames)];
        $middleName = $middleNames[array_rand($middleNames)];
        $lastName = $lastNames[array_rand($lastNames)];
        
        return $firstName . ' ' . $middleName . ' ' . $lastName;
    }

    /**
     * Get random Vietnamese phone
     */
    public static function randomVietnamesePhone(): string
    {
        $prefixes = ['090', '091', '092', '093', '094', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039'];
        $prefix = $prefixes[array_rand($prefixes)];
        $number = str_pad((string) rand(1000000, 9999999), 7, '0', STR_PAD_LEFT);
        return $prefix . $number;
    }

    /**
     * Get random Vietnamese address
     */
    public static function randomVietnameseAddress(string $provinceCode): string
    {
        $streets = ['Đường', 'Phố', 'Ngõ', 'Hẻm'];
        $streetNames = ['Lê Lợi', 'Trần Hưng Đạo', 'Nguyễn Huệ', 'Lý Thường Kiệt', 'Hoàng Diệu', 'Lê Duẩn', 'Võ Văn Tần', 'Điện Biên Phủ'];
        $numbers = rand(1, 999);
        $street = $streets[array_rand($streets)] . ' ' . $streetNames[array_rand($streetNames)];
        
        $districts = ['Quận 1', 'Quận 2', 'Quận 3', 'Quận Hoàn Kiếm', 'Quận Ba Đình', 'Quận Hải Châu'];
        $district = $districts[array_rand($districts)];
        
        $provinceName = match($provinceCode) {
            'HN' => 'Hà Nội',
            'HCM' => 'TP. Hồ Chí Minh',
            'DN' => 'Đà Nẵng',
            default => 'Việt Nam',
        };
        
        return "{$numbers} {$street}, {$district}, {$provinceName}";
    }

    /**
     * Calculate shipping fee
     */
    public static function calculateShippingFee(float $weight, string $routeScope, string $serviceType): float
    {
        $basePrice = 20000;
        $weightPrice = max(0, ($weight - 1)) * 5000;
        
        $routeMultiplier = match($routeScope) {
            'INTER_REGION_FAR' => 2.5,
            'INTER_REGION_NEAR' => 1.8,
            'INTRA_REGION' => 1.3,
            default => 1.5,
        };
        
        $serviceMultiplier = $serviceType === 'EXPRESS' ? 1.5 : 1.0;
        
        $total = ($basePrice + $weightPrice) * $routeMultiplier * $serviceMultiplier;
        return round($total, 2);
    }
}
