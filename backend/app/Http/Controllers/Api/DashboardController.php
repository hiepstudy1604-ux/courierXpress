<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\Branch;
use App\Models\User;
use App\Models\PaymentIntent;
use App\Models\Bill;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Class DashboardController
 *
 * Purpose:
 * This controller handles the aggregation and retrieval of data for the main application dashboard.
 * It serves both Admin and Agent roles, providing high-level statistics (KPIs) and detailed
 * chart data required for visualization (Revenue, Delivery Trends, Product Mix, etc.).
 *
 * Mục đích:
 * Controller này xử lý việc tổng hợp và truy xuất dữ liệu cho bảng điều khiển (dashboard) chính của ứng dụng.
 * Nó phục vụ cả vai trò Admin và Agent, cung cấp các thống kê cấp cao (KPI) và dữ liệu biểu đồ chi tiết
 * cần thiết cho việc trực quan hóa (Doanh thu, Xu hướng giao hàng, Cơ cấu sản phẩm, v.v.).
 */
class DashboardController extends Controller
{
    /**
     * Get dashboard statistics and charts data.
     * Lấy thống kê bảng điều khiển và dữ liệu biểu đồ.
     *
     * Input:
     * - Request $request: Contains filters like 'period' (week/month/year), 'branch_id', 'date_start', 'date_end'.
     *
     * Output:
     * - JSON response containing 'stats' (summary numbers) and 'charts' (array of chart data).
     *
     * Purpose:
     * Acts as the main entry point. It determines the effective date range and scope (branch context)
     * based on the user's role and input, then delegates data fetching to specific methods. 
     *
     * Mục đích:
     * Đóng vai trò là điểm vào chính. Nó xác định khoảng thời gian và phạm vi (ngữ cảnh) hiệu lực
     * dựa trên vai trò của người dùng và đầu vào, sau đó ủy quyền việc lấy dữ liệu cho các phương thức cụ thể.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $branchId = null;

        // Determine Branch Scope based on Role
        // Xác định Phạm vi dựa trên Vai trò
        if ($user->role === 'AGENT') {
            // Agents are strictly limited to their assigned branch.
            // Agent bị giới hạn nghiêm ngặt trong chi nhánh được phân công.
            $branchId = $user->branch_id;
        } elseif ($user->role === 'ADMIN' && $request->has('branch_id') && $request->input('branch_id') !== 'all') {
            // Admins can see all data but optionally filter by a specific branch.
            // Admin có thể xem tất cả dữ liệu nhưng có tùy chọn lọc theo một điểm cụ thể.
            $branchId = $request->input('branch_id');
        }

        // Determine Date Range
        // Xác định Khoảng thời gian
        $period = $request->input('period', 'week');

        $dateEnd = Carbon::now();
        // Calculate start date based on the selected period (preset logic).
        // Tính toán ngày bắt đầu dựa trên khoảng thời gian đã chọn (logic đặt trước).
        if ($period === 'year') {
            $dateStart = $dateEnd->copy()->subYear()->startOfDay();
        } elseif ($period === 'month') {
            $dateStart = $dateEnd->copy()->subDays(30)->startOfDay();
        } else { // 'week' (default)
            $dateStart = $dateEnd->copy()->subDays(6)->startOfDay();
        }

        // Allow overriding presets with custom date ranges if provided.
        // Cho phép ghi đè các cài đặt trước bằng khoảng ngày tùy chỉnh nếu được cung cấp.
        if ($request->has('date_start')) {
            $dateStart = Carbon::parse($request->date_start)->startOfDay();
        }
        if ($request->has('date_end')) {
            $dateEnd = Carbon::parse($request->date_end)->endOfDay();
        }

        // Fetch aggregated data
        // Lấy dữ liệu tổng hợp
        $stats = $this->getStats($branchId, $dateStart, $dateEnd);
        $charts = $this->getCharts($branchId, $dateStart, $dateEnd, $user->role, $period);

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => $stats,
                'charts' => $charts,
            ]
        ]);
    }

    /**
     * Get dashboard statistics (KPI Cards).
     * Lấy thống kê bảng điều khiển (Thẻ KPI).
     *
     * Purpose:
     * Calculates scalar values for the top dashboard cards: Pending, In-Transit, Delivered, Revenue, etc.
     * Mục đích:
     * Tính toán các giá trị vô hướng cho các thẻ trên cùng của dashboard: Đang chờ, Đang vận chuyển, Đã giao, Doanh thu, v.v.
     */
    private function getStats($branchId, $dateStart, $dateEnd)
    {
        // Base query for shipments within the date range.
        // Truy vấn cơ sở cho các vận đơn trong khoảng thời gian.
        $shipmentsQuery = Shipment::whereBetween('created_at', [$dateStart, $dateEnd]);

        // Apply branch filter if applicable.
        // Áp dụng bộ lọc nếu có.
        if ($branchId) {
            $shipmentsQuery->where('assigned_branch_id', $branchId);
        }

        $allShipments = $shipmentsQuery->get();

        // Calculate stats based on specific shipment_status groups.
        // Tính toán thống kê dựa trên các nhóm trạng thái vận đơn cụ thể.
        $stats = [
            // "Booked/Pending": Includes initial states before leaving the origin.
            // "Đã đặt/Đang chờ": Bao gồm các trạng thái ban đầu trước khi rời khỏi điểm xuất phát.
            'pendingCouriers' => $allShipments->whereIn('shipment_status', [
                'BOOKED',
                'PRICE_ESTIMATED',
                'BRANCH_ASSIGNED',
                'PICKUP_SCHEDULED',
                'PICKUP_RESCHEDULED'
            ])->count(),

            // "In Transit": Active shipments currently moving through the network.
            // "Đang vận chuyển": Các vận đơn đang hoạt động và di chuyển qua mạng lưới.
            'inTransitCouriers' => $allShipments->whereIn('shipment_status', [
                'IN_ORIGIN_WAREHOUSE',
                'IN_TRANSIT',
                'IN_DEST_WAREHOUSE',
                'OUT_FOR_DELIVERY'
            ])->count(),

            // "Delivered": Successfully completed shipments.
            // "Đã giao": Các vận đơn đã hoàn thành thành công.
            'deliveredCouriers' => $allShipments->whereIn('shipment_status', ['DELIVERED_SUCCESS', 'CLOSED'])->count(),

            'totalCouriers' => $allShipments->count(),
        ];

        // Calculate Total Revenue from PaymentIntents
        // Tính Tổng Doanh thu từ PaymentIntents
        $paymentQuery = PaymentIntent::whereBetween('created_at', [$dateStart, $dateEnd])
            ->where('status', 'CONFIRMED'); // Only count confirmed payments / Chỉ tính các khoản thanh toán đã xác nhận

        if ($branchId) {
            // Filter payments related to shipments of the specific branch.
            // Lọc các khoản thanh toán liên quan đến vận đơn của điểm cụ thể.
            $paymentQuery->whereHas('shipment', function ($q) use ($branchId) {
                $q->where('assigned_branch_id', $branchId);
            });
        }

        $stats['totalRevenue'] = (float) $paymentQuery->sum('amount_paid');

        // Context-specific metrics
        // Các chỉ số cụ thể theo ngữ cảnh
        if (!$branchId) {
            // Admin only: Count total active branches.
            // Chỉ dành cho Admin: Đếm tổng số chi nhánh đang hoạt động.
            $stats['totalBranches'] = Branch::where('is_active', true)->count();
        }

        if ($branchId) {
            // Agent only: Count cancelled/failed shipments explicitly.
            // Chỉ dành cho Agent: Đếm rõ ràng các vận đơn bị hủy/thất bại.
            $stats['cancelledCouriers'] = $allShipments->whereIn('shipment_status', ['DELIVERY_FAILED', 'RETURN_COMPLETED', 'DISPOSED'])->count();
        }

        return $stats;
    }

    /**
     * Get charts data.
     * Lấy dữ liệu biểu đồ.
     *
     * Purpose:
     * Orchestrates the retrieval of data for various charts based on user role.
     * Mục đích:
     * Điều phối việc truy xuất dữ liệu cho các biểu đồ khác nhau dựa trên vai trò người dùng.
     */
    private function getCharts($branchId, $dateStart, $dateEnd, $role, $period = 'week')
    {
        $charts = [];

        // Common Charts (Visible to All)
        // Các biểu đồ chung (Hiển thị cho tất cả)

        // 1. Revenue over time
        // 1. Doanh thu theo thời gian
        $charts['weeklyRevenue'] = $this->getWeeklyRevenue($branchId, $dateStart, $dateEnd, $period);

        // 2. Delivery success vs failure trend
        // 2. Xu hướng giao hàng thành công so với thất bại
        $charts['weeklyDeliveryTrend'] = $this->getWeeklyDeliveryTrend($branchId, $dateStart, $dateEnd, $period);

        // 3. Product Category breakdown
        // 3. Phân tích danh mục sản phẩm
        $charts['categoryFlows'] = $this->getCategoryFlows($branchId, $dateStart, $dateEnd, $period);

        // Role-Specific Charts
        // Các biểu đồ dành riêng cho vai trò
        if ($role === 'ADMIN') {
            // Ranking of branches by volume
            // Xếp hạng chi nhánh theo khối lượng
            $charts['topBranches'] = $this->getTopBranches($branchId, $dateStart, $dateEnd);

            // Success metrics per city
            // Các chỉ số thành công theo thành phố
            $charts['citySuccessMetrics'] = $this->getCitySuccessMetrics($branchId, $dateStart, $dateEnd);

            // Regional product mix
            // Cơ cấu sản phẩm theo khu vực
            $charts['regionalProductMix'] = $this->getRegionalProductMix($branchId, $dateStart, $dateEnd);
        } else {
            // Agent view: Simplified product mix
            // Giao diện Agent: Cơ cấu sản phẩm đơn giản hóa
            $charts['branchProductMix'] = $this->getBranchProductMix($branchId, $dateStart, $dateEnd);
        }

        return $charts;
    }

    /**
     * Get weekly revenue data.
     * Lấy dữ liệu doanh thu hàng tuần.
     *
     * Logic:
     * Groups confirmed payments by date/month and fills in missing dates with 0 revenue to ensure a continuous chart line.
     * Logic:
     * Nhóm các khoản thanh toán đã xác nhận theo ngày/tháng và điền doanh thu bằng 0 vào các ngày bị thiếu để đảm bảo đường biểu đồ liên tục.
     */
    private function getWeeklyRevenue($branchId, $dateStart, $dateEnd, $period)
    {
        $query = PaymentIntent::whereBetween('created_at', [$dateStart, $dateEnd])
            ->where('status', 'CONFIRMED');

        if ($branchId) {
            $query->whereHas('shipment', function ($q) use ($branchId) {
                $q->where('assigned_branch_id', $branchId);
            });
        }

        // Define grouping format based on period (Yearly = group by month, otherwise group by day).
        // Định nghĩa định dạng nhóm dựa trên khoảng thời gian (Hàng năm = nhóm theo tháng, ngược lại nhóm theo ngày).
        if ($period === 'year') {
            $format = '%Y-%m';
            $labelFormat = 'M'; // Short month name (Jan, Feb...)
            $groupBy = 'month';
        } else { // week or month
            $format = '%Y-%m-%d';
            $labelFormat = ($period === 'month') ? 'j' : 'D'; // Day of month (1-31) or Day name (Mon, Tue)
            $groupBy = 'date';
        }

        // Execute aggregation query
        // Thực hiện truy vấn tổng hợp
        $results = $query->select(
            DB::raw("DATE_FORMAT(created_at, '{$format}') as {$groupBy}"),
            DB::raw('SUM(amount_paid) as revenue')
        )
            ->groupBy($groupBy)
            ->orderBy($groupBy, 'ASC')
            ->get()
            ->keyBy($groupBy);

        // Post-processing: Fill missing dates/months with 0
        // Hậu xử lý: Điền 0 vào các ngày/tháng bị thiếu
        $data = [];
        $current = $dateStart->copy();

        if ($period === 'year') {
            $current->startOfMonth();
            while ($current <= $dateEnd) {
                $key = $current->format('Y-m');
                $data[] = [
                    'name' => $current->format($labelFormat),
                    'revenue' => (float) ($results[$key]->revenue ?? 0),
                ];
                $current->addMonth();
            }
        } else { // week or month
            while ($current <= $dateEnd) {
                $key = $current->format('Y-m-d');
                $data[] = [
                    'name' => $current->format($labelFormat),
                    'revenue' => (float) ($results[$key]->revenue ?? 0),
                ];
                $current->addDay();
            }
        }

        return $data;
    }

    /**
     * Get weekly delivery trend.
     * Lấy xu hướng giao hàng hàng tuần.
     *
     * Logic:
     * Compares successful deliveries vs failed ones over the time period.
     * Logic:
     * So sánh các đơn giao thành công so với thất bại trong khoảng thời gian.
     */
    private function getWeeklyDeliveryTrend($branchId, $dateStart, $dateEnd, $period)
    {
        $shipmentsQuery = Shipment::whereBetween('created_at', [$dateStart, $dateEnd]);

        if ($branchId) {
            $shipmentsQuery->where('assigned_branch_id', $branchId);
        }

        if ($period === 'year') {
            $format = "DATE_FORMAT(created_at, '%Y-%m')";
            $labelFormat = 'M';
            $groupBy = 'month';
        } else { // week or month
            $format = "DATE(created_at)";
            $labelFormat = ($period === 'month') ? 'j' : 'D';
            $groupBy = 'date';
        }

        // Conditional counting using SQL CASE WHEN
        // Đếm có điều kiện sử dụng SQL CASE WHEN
        $data = $shipmentsQuery
            ->select(
                DB::raw("$format as $groupBy"),
                DB::raw("COUNT(CASE WHEN shipment_status = 'DELIVERED_SUCCESS' THEN 1 END) as success"),
                DB::raw("COUNT(CASE WHEN shipment_status IN ('DELIVERY_FAILED', 'RETURN_COMPLETED', 'DISPOSED') THEN 1 END) as fail")
            )
            ->groupBy($groupBy)
            ->orderBy($groupBy, 'ASC')
            ->get()
            ->keyBy($groupBy);

        // Fill missing intervals
        // Điền vào các khoảng thời gian bị thiếu
        $filledData = [];
        $current = $dateStart->copy();

        if ($period === 'year') {
            $current->startOfMonth();
            while ($current <= $dateEnd) {
                $key = $current->format('Y-m');
                $filledData[] = [
                    'name' => $current->format($labelFormat),
                    'success' => isset($data[$key]) ? (int) $data[$key]->success : 0,
                    'fail' => isset($data[$key]) ? (int) $data[$key]->fail : 0,
                ];
                $current->addMonth();
            }
        } else {
            while ($current <= $dateEnd) {
                $key = $current->toDateString();
                $filledData[] = [
                    'name' => $current->format($labelFormat),
                    'success' => isset($data[$key]) ? (int) $data[$key]->success : 0,
                    'fail' => isset($data[$key]) ? (int) $data[$key]->fail : 0,
                ];
                $current->addDay();
            }
        }

        return $filledData;
    }

    /**
     * Get category flows.
     * Lấy dòng chảy danh mục.
     *
     * Logic:
     * Aggregates shipment counts per product category (mapped from goods_type) over time.
     * Uses dynamic SQL generation to handle multiple categories efficiently.
     * Logic:
     * Tổng hợp số lượng vận đơn theo danh mục sản phẩm (ánh xạ từ goods_type) theo thời gian.
     * Sử dụng tạo SQL động để xử lý nhiều danh mục một cách hiệu quả.
     */
    private function getCategoryFlows($branchId, $dateStart, $dateEnd, $period)
    {
        $categoryMap = $this->getCategoryMap();
        $categories = array_values(array_unique($categoryMap));

        // Group raw goods_types by their mapped category
        // Nhóm các goods_type thô theo danh mục đã ánh xạ của chúng
        $selects = [];
        foreach ($categoryMap as $goodsType => $category) {
            $selects[$category][] = $goodsType;
        }

        $shipmentsQuery = Shipment::whereBetween('created_at', [$dateStart, $dateEnd]);
        if ($branchId) {
            $shipmentsQuery->where('assigned_branch_id', $branchId);
        }

        if ($period === 'year') {
            $format = "DATE_FORMAT(created_at, '%Y-%m')";
            $labelFormat = 'M';
            $groupBy = 'month';
        } else { // week or month
            $format = "DATE(created_at)";
            $labelFormat = ($period === 'month') ? 'j' : 'D';
            $groupBy = 'date';
        }

        $query = $shipmentsQuery->select(DB::raw("$format as $groupBy"));

        // Build conditional counts for each category
        // Xây dựng bộ đếm có điều kiện cho từng danh mục
        foreach ($selects as $category => $goodsTypes) {
            $inClause = "'" . implode("','", $goodsTypes) . "'";
            $query->addSelect(DB::raw("COUNT(CASE WHEN goods_type IN ({$inClause}) THEN 1 END) as {$category}"));
        }

        $data = $query->groupBy($groupBy)->orderBy($groupBy, 'ASC')->get()->keyBy($groupBy);

        // Fill missing data
        // Điền dữ liệu bị thiếu
        $filledData = [];
        $current = $dateStart->copy();
        $categoryDefaults = array_fill_keys($categories, 0);

        if ($period === 'year') {
            $current->startOfMonth();
            while ($current <= $dateEnd) {
                $key = $current->format('Y-m');
                $itemData = isset($data[$key]) ? (array) $data[$key] : [];
                $filledData[] = array_merge(['name' => $current->format($labelFormat)], $categoryDefaults, $itemData);
                $current->addMonth();
            }
        } else {
            while ($current <= $dateEnd) {
                $key = $current->toDateString();
                $itemData = isset($data[$key]) ? (array) $data[$key] : [];
                $filledData[] = array_merge(['name' => $current->format($labelFormat)], $categoryDefaults, $itemData);
                $current->addDay();
            }
        }

        return $filledData;
    }

    /**
     * Get top branches ranking.
     * Lấy bảng xếp hạng các điểm hàng đầu.
     *
     * Logic:
     * Counts shipments per branch and sorts them by volume descending.
     * Logic:
     * Đếm số vận đơn mỗi điểm và sắp xếp giảm dần theo khối lượng.
     */
    private function getTopBranches($branchId, $dateStart, $dateEnd)
    {
        $queryBranches = Branch::where('is_active', true);

        if ($branchId && $branchId !== 'all') {
            $queryBranches->where('id', $branchId);
        }
        $branches = $queryBranches->get();

        $branchVolumes = [];
        foreach ($branches as $branch) {
            $count = Shipment::query()
                ->when($branchId && $branchId !== 'all', function ($query) use ($branchId) {
                    $query->where('assigned_branch_id', $branchId);
                }, function ($query) use ($branch) {
                    $query->where('assigned_branch_id', $branch->id);
                })
                ->whereBetween('created_at', [$dateStart, $dateEnd])
                ->count();

            // Include branch if it has data or is specifically selected
            // Bao gồm điểm nếu có dữ liệu hoặc được chọn cụ thể
            if ($count > 0 || ($branchId && (string) $branch->id === (string) $branchId)) {
                $branchVolumes[] = [
                    'name' => $branch->name,
                    'volume' => $count,
                ];
            }
        }

        // Sort descending
        // Sắp xếp giảm dần
        if (!$branchId || $branchId === 'all') {
            usort($branchVolumes, function ($a, $b) {
                return $b['volume'] - $a['volume'];
            });
            return array_slice($branchVolumes, 0, 10); // Return top 10 / Trả về top 10
        } else {
            return $branchVolumes; // Return single branch data / Trả về dữ liệu điểm đơn lẻ
        }
    }

    /**
     * Get city success metrics.
     * Lấy các chỉ số thành công theo thành phố.
     *
     * Logic:
     * Calculates the success vs failure counts for major cities (Hanoi, HCM, Danang).
     * Maps shipments to cities using `receiver_province_code`.
     *
     * Logic:
     * Tính toán số lượng thành công so với thất bại cho các thành phố lớn (Hà Nội, HCM, Đà Nẵng).
     * Ánh xạ vận đơn với thành phố bằng `receiver_province_code`.
     */
    private function getCitySuccessMetrics($branchId, $dateStart, $dateEnd)
    {
        $allCities = ['Hanoi', 'Ho Chi Minh', 'Danang'];
        $metrics = [];

        // Base query
        // Truy vấn cơ sở
        $baseShipmentsQuery = Shipment::whereBetween('created_at', [$dateStart, $dateEnd]);

        if ($branchId && $branchId !== 'all') {
            $baseShipmentsQuery->where('assigned_branch_id', $branchId);
        }

        $allShipmentsForPeriodAndBranch = $baseShipmentsQuery->get();

        // Determine which cities to process
        // Xác định các thành phố cần xử lý
        $citiesToProcess = $allCities;
        if ($branchId && $branchId !== 'all') {
            $selectedBranch = Branch::find($branchId);
            if ($selectedBranch) {
                // If specific branch is selected, only show its city's metrics
                // Nếu chọn điểm cụ thể, chỉ hiển thị chỉ số của thành phố đó
                $mappedCity = $this->mapBranchCityToChartCity($selectedBranch->city);
                if ($mappedCity && in_array($mappedCity, $allCities)) {
                    $citiesToProcess = [$mappedCity];
                } else {
                    return [];
                }
            } else {
                return [];
            }
        }

        foreach ($citiesToProcess as $cityName) {
            $provinceCode = $this->getProvinceCodeByCity($cityName);

            // Filter in-memory collection by province code
            // Lọc bộ sưu tập trong bộ nhớ theo mã tỉnh
            $shipments = $allShipmentsForPeriodAndBranch->filter(function ($shipment) use ($provinceCode) {
                return $shipment->receiver_province_code === $provinceCode;
            });

            $success = $shipments->where('shipment_status', 'DELIVERED_SUCCESS')->count();
            $cancelled = $shipments->whereIn('shipment_status', ['DELIVERY_FAILED', 'RETURN_COMPLETED', 'DISPOSED'])->count();

            $metrics[] = [
                'city' => $cityName,
                'success' => $success,
                'cancelled' => $cancelled,
            ];
        }

        return $metrics;
    }

    /**
     * Get regional product mix.
     * Lấy cơ cấu sản phẩm theo khu vực.
     *
     * Purpose:
     * Shows which product categories are most popular in specific major cities.
     * Mục đích:
     * Hiển thị danh mục sản phẩm nào phổ biến nhất ở các thành phố lớn cụ thể.
     */
    private function getRegionalProductMix($branchId, $dateStart, $dateEnd)
    {
        $categoryMap = $this->getCategoryMap();
        $allCities = ['HCMC', 'Hanoi', 'Danang'];
        $mix = [];

        $targetCities = $allCities;

        // Filter cities based on selected branch
        // Lọc thành phố dựa trên điểm đã chọn
        if ($branchId && $branchId !== 'all') {
            $selectedBranchObj = Branch::find($branchId);
            if ($selectedBranchObj) {
                $mappedCity = $this->mapBranchCityToChartCity($selectedBranchObj->city);
                if ($mappedCity) {
                    $targetCities = [$mappedCity];
                } else {
                    $targetCities = [];
                }
            }
        }

        foreach ($targetCities as $cityName) {
            $provinceCode = $this->getProvinceCodeByCity($cityName === 'HCMC' ? 'Ho Chi Minh' : $cityName);

            $shipmentsQuery = Shipment::whereBetween('created_at', [$dateStart, $dateEnd])
                ->where('receiver_province_code', $provinceCode);

            if ($branchId) {
                $shipmentsQuery->where('assigned_branch_id', $branchId);
            }
            $shipments = $shipmentsQuery->get();

            // Initialize counts
            // Khởi tạo bộ đếm
            $categoryCounts = [
                'fashion' => 0,
                'food' => 0,
                'stationery' => 0,
                'electronics' => 0,
                'fragile' => 0,
                'furniture' => 0,
                'construction' => 0,
                'vehicles' => 0,
                'moving' => 0,
            ];

            // Aggregation loop
            // Vòng lặp tổng hợp
            foreach ($shipments as $shipment) {
                $category = $categoryMap[strtoupper($shipment->goods_type)] ?? 'other';
                if (isset($categoryCounts[$category])) {
                    $categoryCounts[$category]++;
                }
            }

            $mix[] = array_merge([
                'name' => $cityName,
            ], $categoryCounts);
        }

        return $mix;
    }

    /**
     * Get branch product mix (for Agent).
     * Lấy cơ cấu sản phẩm của điểm (cho Agent).
     *
     * Logic:
     * Simulates zoning logic by splitting shipments into arbitrary chunks.
     * (Note: Real implementation might require actual 'zone' or 'district' fields).
     *
     * Logic:
     * Mô phỏng logic phân vùng bằng cách chia vận đơn thành các phần tùy ý.
     * (Lưu ý: Triển khai thực tế có thể yêu cầu các trường 'zone' hoặc 'district' thực tế).
     */
    private function getBranchProductMix($branchId, $dateStart, $dateEnd)
    {
        $categoryMap = $this->getCategoryMap();

        $shipments = Shipment::whereBetween('created_at', [$dateStart, $dateEnd])
            ->where('assigned_branch_id', $branchId)
            ->get();

        // Simplified zoning for visualization purposes
        // Phân vùng đơn giản hóa cho mục đích trực quan hóa
        $zones = ['Zone A', 'Zone B', 'Zone C'];
        $mix = [];

        foreach ($zones as $zone) {
            // Take a slice of shipments to represent a zone
            // Lấy một phần vận đơn để đại diện cho một vùng
            $zoneShipments = $shipments->take(ceil($shipments->count() / 3));
            $shipments = $shipments->skip(ceil($shipments->count() / 3));

            $categoryCounts = [
                'fashion' => 0,
                'food' => 0,
                'stationery' => 0,
                'electronics' => 0,
                'fragile' => 0,
                'furniture' => 0,
                'construction' => 0,
                'vehicles' => 0,
                'moving' => 0,
            ];

            foreach ($zoneShipments as $shipment) {
                $category = $categoryMap[strtoupper($shipment->goods_type)] ?? 'other';
                if (isset($categoryCounts[$category])) {
                    $categoryCounts[$category]++;
                }
            }

            $mix[] = array_merge([
                'name' => $zone,
            ], $categoryCounts);
        }

        return $mix;
    }

    /**
     * Map goods_type to category.
     * Ánh xạ loại hàng hóa sang danh mục.
     *
     * Purpose:
     * Normalizes diverse DB goods types into chart-friendly categories.
     * Mục đích:
     * Chuẩn hóa các loại hàng hóa đa dạng trong DB thành các danh mục thân thiện với biểu đồ.
     */
    private function getCategoryMap()
    {
        // Keep in sync with ReportController::getCategoryMap()
        // Giữ đồng bộ với ReportController::getCategoryMap()
        return [
            'CLOTHING' => 'fashion',
            'PERISHABLE' => 'food',
            'DOCUMENT' => 'stationery',
            'ELECTRONICS' => 'electronics',
            'FRAGILE' => 'fragile',
            'FURNITURE' => 'furniture',
            'CONSTRUCTION_MATERIAL' => 'construction',
            'VEHICLE' => 'vehicles',
            'LIGHT_GOODS' => 'moving',
        ];
    }

    /**
     * Get province code by city name.
     * Lấy mã tỉnh theo tên thành phố.
     *
     * Purpose:
     * Translates readable city names into internal province codes used by the shipping engine.
     * Mục đích:
     * Dịch tên thành phố dễ đọc thành mã tỉnh nội bộ được sử dụng bởi công cụ vận chuyển.
     */
    private function getProvinceCodeByCity($cityName)
    {
        $map = [
            'Hanoi' => 'HN',
            'Ho Chi Minh' => 'HCM',
            'HCMC' => 'HCM',
            'Danang' => 'DN',
        ];

        return $map[$cityName] ?? null;
    }

    /**
     * Map branch city name to chart city name format.
     * Ánh xạ tên thành phố của điểm sang định dạng tên thành phố biểu đồ.
     */
    private function mapBranchCityToChartCity($branchCityName)
    {
        $map = [
            'Hà Nội' => 'Hanoi',
            'TP. Hồ Chí Minh' => 'Ho Chi Minh',
            'Đà Nẵng' => 'Danang',
            'Hồ Chí Minh' => 'Ho Chi Minh', // Handle variations / Xử lý các biến thể
        ];

        return $map[$branchCityName] ?? null;
    }

    /**
     * Get revenue statistics data for dashboard charts.
     * Lấy dữ liệu thống kê doanh thu cho biểu đồ dashboard.
     * 
     * @param Request $request Contains 'period' (day, week, month, year).
     * Chứa 'period' (ngày, tuần, tháng, năm).
     * @return \Illuminate\Http\JsonResponse JSON object with labels and revenue values.
     * Đối tượng JSON chứa nhãn và giá trị doanh thu.
     */
    public function getRevenueStats(Request $request)
    {
        // Get the currently authenticated user to determine data access scope.
        // Lấy người dùng đã đăng nhập để xác định phạm vi truy cập dữ liệu.
        $user = Auth::user();
        
        // Default to 'month' if no period is provided to ensure the chart always has a fallback view.
        // Mặc định là 'month' nếu không có tham số period để đảm bảo biểu đồ luôn có dữ liệu hiển thị.
        $period = $request->input('period', 'month');
        
        // Get branch_id from request (admin filter) or use user's branch_id (agent)
        // Lấy branch_id từ request (admin filter) hoặc dùng branch_id của user (agent)
        $branchId = $request->input('branch_id') ?? ($user && $user->role === 'AGENT' ? $user->branch_id : null);

        // Initialize query on the bills table to sum total amounts.
        // Khởi tạo truy vấn trên bảng bills để tính tổng số tiền.
        $query = Bill::query()
            ->selectRaw('SUM(bills.total_amount) as revenue')
            // Only consider 'PAID' status to ensure revenue reflects actual collected money.
            // Chỉ tính các hóa đơn 'PAID' để đảm bảo doanh thu phản ánh số tiền thực tế đã thu.
            ->where('bills.bill_status', 'PAID');

        /**
         * BRANCH FILTERING / LỌC THEO CHI NHÁNH:
         * If there's a branch_id (from request or user's branch), filter by it.
         * Since 'bills' might not have branch info directly, we join with 'shipments'.
         * 
         * Nếu có branch_id (từ request hoặc branch của user), lọc theo nó.
         * Vì bảng 'bills' có thể không có thông tin chi nhánh trực tiếp, ta phải join với bảng 'shipments'.
         */
        if ($branchId) {
            $query->join('shipments', 'bills.shipment_id', '=', 'shipments.shipment_id')
                ->where('shipments.assigned_branch_id', $branchId);
        }

        $dateFormat = "";
        $groupBy = "";

        /**
         * TIME GRANULARITY LOGIC / LOGIC VỀ ĐỘ CHI TIẾT THỜI GIAN:
         * Depending on the period, we group data by year, month, week, or day.
         * This determines how the X-axis of the chart will be labeled.
         * 
         * Tùy thuộc vào period, chúng ta nhóm dữ liệu theo năm, tháng, tuần hoặc ngày.
         * Điều này quyết định nhãn của trục X trên biểu đồ sẽ hiển thị như thế nào.
         */
        switch ($period) {
            case 'year':
                $dateFormat = "YEAR(bills.created_at)";
                $groupBy = "YEAR(bills.created_at)";
                break;
            case 'month':
                // Format 'YYYY-MM' for monthly grouping.
                // Định dạng 'YYYY-MM' để nhóm theo tháng.
                $dateFormat = "DATE_FORMAT(bills.created_at, '%Y-%m')";
                $groupBy = "DATE_FORMAT(bills.created_at, '%Y-%m')";
                break;
            case 'week':
                // Format 'YYYY-WW' (Year-WeekNumber) to handle overlaps between years.
                // Định dạng 'YYYY-WW' (Năm-SốTuần) để xử lý các tuần giao thoa giữa các năm.
                $dateFormat = "DATE_FORMAT(bills.created_at, '%x-%v')";
                $groupBy = "DATE_FORMAT(bills.created_at, '%x-%v')";
                break;
            case 'day':
            default:
                // Format 'YYYY-MM-DD' for daily breakdown.
                // Định dạng 'YYYY-MM-DD' để phân tích theo ngày.
                $dateFormat = "DATE(bills.created_at)";
                $groupBy = "DATE(bills.created_at)";
                break;
        }

        // Apply dynamic date formatting and grouping to the query.
        // Áp dụng định dạng ngày và nhóm dữ liệu động vào truy vấn.
        $query->selectRaw("{$dateFormat} as label")
            ->groupBy(DB::raw($groupBy))
            ->orderBy('label', 'asc');

        /**
         * DATA LIMITATION / GIỚI HẠN DỮ LIỆU:
         * We fetch the 12 most recent time points (e.g., last 12 months) for UI clarity.
         * We sort descending to get the 'latest' first, then reverse for chronological order.
         * 
         * Lấy 12 điểm dữ liệu gần nhất (ví dụ: 12 tháng qua) để biểu đồ rõ ràng.
         * Sắp xếp giảm dần để lấy các bản ghi 'mới nhất' trước, sau đó đảo ngược lại để đúng thứ tự thời gian.
         */
        $stats = $query->orderBy('label', 'desc')->limit(12)->get()->reverse();

        // Standardize the output format for the frontend charting library (e.g., Chart.js or Recharts).
        // Chuẩn hóa định dạng đầu ra cho các thư viện biểu đồ frontend.
        $formattedData = $stats->map(function ($item) {
            return [
                'name' => $item->label, // Label for X-axis / Nhãn cho trục X
                'revenue' => (float) $item->revenue, // Ensure revenue is a float for calculations / Đảm bảo doanh thu là số thực để tính toán.
            ];
        });

        // Return a successful JSON response.
        // Trả về phản hồi JSON thành công.
        return response()->json(['success' => true, 'data' => $formattedData]);
    }
}