<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\Bill;
use App\Models\Branch;
use App\Models\Vehicle;
use App\Models\ReportSnapshot;
use App\Models\PaymentIntent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

/**
 * Class ReportController
 *
 * Purpose:
 * Handles the generation of detailed analytical reports. Unlike the DashboardController which
 * provides live snapshots for widgets, this controller is designed for heavy data aggregation,
 * historical analysis, and generating exportable report snapshots (PDFs).
 *
 * Mục đích:
 * Xử lý việc tạo các báo cáo phân tích chi tiết. Khác với DashboardController cung cấp
 * ảnh chụp nhanh trực tiếp cho các tiện ích, controller này được thiết kế để tổng hợp dữ liệu lớn,
 * phân tích lịch sử và tạo các bản ghi báo cáo có thể xuất ra (PDF).
 */
class ReportController extends Controller
{
    /**
     * Generate report data for preview.
     * Tạo dữ liệu báo cáo để xem trước.
     *
     * Steps:
     * 1. Validate parameters (date range).
     * 2. Determine scope (Agent vs Admin).
     * 3. Collect raw data from DB.
     * 4. Aggregate raw data into business metrics.
     * 5. Format aggregated data for visualization charts.
     *
     * Các bước:
     * 1. Xác thực tham số (khoảng thời gian).
     * 2. Xác định phạm vi (Agent so với Admin).
     * 3. Thu thập dữ liệu thô từ DB.
     * 4. Tổng hợp dữ liệu thô thành các chỉ số kinh doanh.
     * 5. Định dạng dữ liệu tổng hợp cho các biểu đồ trực quan hóa.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();

            // P8.1: Validate parameters
            // P8.1: Xác thực tham số
            $validator = Validator::make($request->all(), [
                'date_start' => 'required|date',
                'date_end' => 'required|date|after_or_equal:date_start',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 400);
            }

            // Normalize dates to start/end of day to include full days in query
            // Chuẩn hóa ngày về đầu/cuối ngày để bao gồm trọn vẹn các ngày trong truy vấn
            $dateStart = Carbon::parse($request->date_start)->startOfDay();
            $dateEnd = Carbon::parse($request->date_end)->endOfDay();

            // Role-based access control (RBAC)
            // Kiểm soát truy cập dựa trên vai trò
            $branchId = null;
            if ($user->role === 'AGENT') {
                // Custom requirement: Force Agent view to Da Nang branch data for consistency with Dashboard.
                // Yêu cầu tùy chỉnh: Buộc giao diện Agent hiển thị dữ liệu của chi nhánh Đà Nẵng để nhất quán với Dashboard.
                $danangBranch = Branch::where('city', 'like', '%Đà Nẵng%')->first();
                if ($danangBranch) {
                    $branchId = $danangBranch->id;
                } else {
                    // Fallback to the user's assigned branch if Da Nang branch is not found.
                    // Quay lại chi nhánh được gán của người dùng nếu không tìm thấy chi nhánh Đà Nẵng.
                    $branchId = $user->branch_id;
                }
                if (!$branchId) {
                    return response()->json(['success' => false, 'message' => 'Agent branch could not be determined.'], 403);
                }
            }

            // P8.2: Collect operational data
            // Thu thập dữ liệu vận hành từ nhiều bảng (Shipments, Payments, Branches, Vehicles)
            $operationalData = $this->collectOperationalData($dateStart, $dateEnd, $branchId);

            // P8.3: Aggregate metrics
            // Tính toán các chỉ số tổng hợp từ dữ liệu thô
            $aggregatedMetrics = $this->aggregateMetrics($operationalData, $branchId);

            // P8.4: Generate visual analytics
            // Chuyển đổi chỉ số thành định dạng JSON cho biểu đồ frontend
            $chartData = $this->generateChartData($operationalData, $aggregatedMetrics, $dateStart, $dateEnd, $branchId);

            return response()->json([
                'success' => true,
                'data' => [
                    'metrics' => $aggregatedMetrics,
                    'charts' => $chartData,
                    'date_range' => [
                        'start' => $dateStart->toDateString(),
                        'end' => $dateEnd->toDateString(),
                    ],
                    'role_scope' => $user->role,
                    'branch_id' => $branchId,
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error generating report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error generating report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export report to PDF and save snapshot.
     * Xuất báo cáo sang PDF và lưu bản chụp (snapshot).
     *
     * Purpose:
     * Generates the report data (same as index) but saves it as a permanent record (`ReportSnapshot`)
     * in the database. This allows historical tracking of what the report looked like at that moment.
     *
     * Mục đích:
     * Tạo dữ liệu báo cáo (giống như index) nhưng lưu nó thành một bản ghi vĩnh viễn (`ReportSnapshot`)
     * trong cơ sở dữ liệu. Điều này cho phép theo dõi lịch sử về báo cáo trông như thế nào vào thời điểm đó.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function export(Request $request)
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'date_start' => 'required|date',
                'date_end' => 'required|date|after_or_equal:date_start',
                'format' => 'in:PDF',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 400);
            }

            $dateStart = Carbon::parse($request->date_start)->startOfDay();
            $dateEnd = Carbon::parse($request->date_end)->endOfDay();
            $format = $request->get('format', 'PDF');

            $branchId = null;
            if ($user->role === 'AGENT') {
                // Custom requirement: Force Agent view to Da Nang branch data for consistency with Dashboard.
                // Yêu cầu tùy chỉnh: Buộc giao diện Agent hiển thị dữ liệu của chi nhánh Đà Nẵng để nhất quán với Dashboard.
                $danangBranch = Branch::where('city', 'like', '%Đà Nẵng%')->first();
                if ($danangBranch) {
                    $branchId = $danangBranch->id;
                } else {
                    // Fallback to the user's assigned branch if Da Nang branch is not found.
                    // Quay lại chi nhánh được gán của người dùng nếu không tìm thấy chi nhánh Đà Nẵng.
                    $branchId = $user->branch_id;
                }
                if (!$branchId) {
                    return response()->json(['success' => false, 'message' => 'Agent branch could not be determined for export.'], 403);
                }
            }

            // Collect and aggregate data (Reuse logic from index)
            // Thu thập và tổng hợp dữ liệu (Tái sử dụng logic từ index)
            $operationalData = $this->collectOperationalData($dateStart, $dateEnd, $branchId);
            $aggregatedMetrics = $this->aggregateMetrics($operationalData, $branchId);
            $chartData = $this->generateChartData($operationalData, $aggregatedMetrics, $dateStart, $dateEnd, $branchId);

            // P8.6: Store snapshot
            // Create a database record of this report generation event.
            // Tạo một bản ghi cơ sở dữ liệu về sự kiện tạo báo cáo này.
            $snapshot = ReportSnapshot::create([
                'role_scope' => $user->role,
                'branch_id' => $branchId,
                'created_by' => $user->id,
                'date_start' => $dateStart->toDateString(),
                'date_end' => $dateEnd->toDateString(),
                'aggregated_metrics' => $aggregatedMetrics, // JSON cast expected in Model / Mong đợi ép kiểu JSON trong Model
                'chart_data' => $chartData,                 // JSON cast expected in Model
                'export_format' => $format,
                'generated_at' => now(),
            ]);

            // TODO: P8.5 - Generate PDF file
            // Actual PDF generation logic (e.g., creating a file on disk) is pending.
            // Logic tạo PDF thực tế (ví dụ: tạo file trên đĩa) đang chờ xử lý.
            $filePath = null; // Will be set when PDF is generated

            return response()->json([
                'success' => true,
                'message' => 'Report generated successfully',
                'data' => [
                    'report_id' => $snapshot->report_id,
                    'metrics' => $aggregatedMetrics,
                    'charts' => $chartData,
                    'file_path' => $filePath,
                    'download_url' => $filePath ? url('/api/reports/' . $snapshot->report_id . '/download') : null,
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error exporting report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error exporting report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * P8.2: Collect Operational Data.
     * Thu thập dữ liệu vận hành.
     *
     * Purpose:
     * Fetches raw data from multiple models (Shipment, Payment, Branch, Vehicle) in a single step
     * to avoid N+1 query problems during aggregation.
     *
     * Mục đích:
     * Lấy dữ liệu thô từ nhiều model (Shipment, Payment, Branch, Vehicle) trong một bước
     * để tránh vấn đề truy vấn N+1 trong quá trình tổng hợp.
     *
     * @param Carbon $dateStart
     * @param Carbon $dateEnd
     * @param int|null $branchId
     * @return array
     */
    private function collectOperationalData($dateStart, $dateEnd, $branchId = null)
    {
        // 1. Query shipments
        // 1. Truy vấn vận đơn
        $shipmentsQuery = Shipment::whereBetween('created_at', [$dateStart, $dateEnd]);

        if ($branchId) {
            $shipmentsQuery->where('assigned_branch_id', $branchId);
        }

        // Optimize: Select only necessary columns
        // Tối ưu hóa: Chỉ chọn các cột cần thiết
        $shipments = $shipmentsQuery->get([
            'shipment_id',
            'created_at',
            'shipment_status',
            'goods_type',
            'service_type',
            'assigned_branch_id',
            'receiver_province_code',
            'declared_value',
        ]);

        // 2. Query billing data (from payment_intents)
        // 2. Truy vấn dữ liệu thanh toán (từ payment_intents)
        $paymentQuery = PaymentIntent::whereBetween('created_at', [$dateStart, $dateEnd])
            ->where('status', 'CONFIRMED'); // Only realized revenue / Chỉ doanh thu thực tế

        if ($branchId) {
            $paymentQuery->whereHas('shipment', function ($q) use ($branchId) {
                $q->where('assigned_branch_id', $branchId);
            });
        }

        $payments = $paymentQuery->with('shipment')->get([
            'payment_intent_id',
            'shipment_id',
            'amount',
            'confirmed_at',
        ]);

        // 3. Query branches
        // 3. Truy vấn chi nhánh
        $branchesQuery = Branch::query();
        if ($branchId) {
            $branchesQuery->where('id', $branchId);
        } else {
            // For Admin: Get all branches in 3 main cities (Hanoi, Ho Chi Minh City, Danang) for comparison
            // Cho Admin: Lấy tất cả chi nhánh ở 3 thành phố lớn để so sánh
            $branchesQuery->where(function ($q) {
                $q->whereIn('province_code', ['HN', 'HCM', 'SG', 'DN'])
                    ->orWhere('city', 'like', '%Hanoi%')
                    ->orWhere('city', 'like', '%Ho Chi Minh%')
                    ->orWhere('city', 'like', '%Danang%');
            });
        }
        $branches = $branchesQuery->get(['id', 'name', 'city', 'province_code']);

        // 4. Query vehicles
        // 4. Truy vấn phương tiện
        $vehiclesQuery = Vehicle::where('is_active', true);
        if ($branchId) {
            // Filter vehicles attached to this branch
            // Lọc phương tiện gắn với chi nhánh này
            $vehiclesQuery->whereHas('branches', function ($q) use ($branchId) {
                $q->where('branches.id', $branchId);
            });
        }
        $vehicles = $vehiclesQuery->with('branches')->get(['vehicle_id', 'vehicle_type']);

        return [
            'shipments' => $shipments,
            'payments' => $payments,
            'branches' => $branches,
            'vehicles' => $vehicles,
        ];
    }

    /**
     * P8.3: Aggregate Metrics by Dimension.
     * Tổng hợp các chỉ số theo chiều dữ liệu.
     *
     * Purpose:
     * Transforms raw DB collections into summarized statistics (KPIs, Regional performance, Fleet info).
     *
     * Mục đích:
     * Chuyển đổi các tập hợp DB thô thành thống kê tóm tắt (KPI, Hiệu suất khu vực, Thông tin đội xe).
     *
     * @param array $operationalData
     * @param int|null $branchId
     * @return array
     */
    private function aggregateMetrics($operationalData, $branchId = null)
    {
        $shipments = $operationalData['shipments'];
        $payments = $operationalData['payments'];
        $branches = $operationalData['branches'];
        $vehicles = $operationalData['vehicles'];

        // 1. Status aggregation (KPIs)
        // 1. Tổng hợp trạng thái (KPI)
        $statusMetrics = [
            'success' => 0,
            'cancelled' => 0,
            'total' => $shipments->count(),
        ];

        foreach ($shipments as $shipment) {
            if (in_array($shipment->shipment_status, ['DELIVERED_SUCCESS', 'CLOSED'])) {
                $statusMetrics['success']++;
            } elseif (in_array($shipment->shipment_status, ['DELIVERY_FAILED', 'RETURN_COMPLETED', 'DISPOSED'])) {
                $statusMetrics['cancelled']++;
            }
        }

        // 2. Revenue aggregation
        // 2. Tổng hợp doanh thu
        $totalRevenue = $payments->sum('amount');

        // 3. Product type aggregation (Counts by Category)
        // 3. Tổng hợp loại sản phẩm (Đếm theo Danh mục)
        $productTypeMetrics = $shipments->groupBy('goods_type')->map(function ($group) {
            return $group->count();
        })->toArray();

        // 4. Service type aggregation (Standard vs Express)
        // 4. Tổng hợp loại dịch vụ
        $serviceTypeMetrics = $shipments->groupBy('service_type')->map(function ($group) {
            return $group->count();
        })->toArray();

        // 5. Region/Branch aggregation
        // 5. Tổng hợp Khu vực/Chi nhánh
        $regionMetrics = [];

        if ($branchId) {
            // Case A: Agent View - Single Branch Data
            // Trường hợp A: Giao diện Agent - Dữ liệu một chi nhánh
            $branch = $branches->first();
            if ($branch) {
                $branchShipments = $shipments->where('assigned_branch_id', $branch->id);
                $branchRevenue = $payments->filter(function ($payment) use ($branch) {
                    return $payment->shipment && $payment->shipment->assigned_branch_id == $branch->id;
                })->sum('amount');

                $regionMetrics[] = [
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'city' => $branch->city,
                    'province_code' => $branch->province_code,
                    'total_orders' => $branchShipments->count(),
                    'success_orders' => $branchShipments->filter(function ($s) {
                        return in_array($s->shipment_status, ['DELIVERED_SUCCESS', 'CLOSED']);
                    })->count(),
                    'cancelled_orders' => $branchShipments->filter(function ($s) {
                        return in_array($s->shipment_status, ['DELIVERY_FAILED', 'RETURN_COMPLETED', 'DISPOSED']);
                    })->count(),
                    'revenue' => $branchRevenue,
                ];
            }
        } else {
            // Case B: Admin View - Group branches by 3 Main Cities
            // Trường hợp B: Giao diện Admin - Nhóm chi nhánh theo 3 Thành phố chính
            $mainCities = [
                'Hanoi' => ['HN'],
                'Ho Chi Minh City' => ['HCM', 'SG'],
                'Danang' => ['DN'],
            ];

            foreach ($mainCities as $cityName => $provinceCodes) {
                // Find all branches belonging to this city group
                // Tìm tất cả chi nhánh thuộc nhóm thành phố này
                $cityBranches = $branches->filter(function ($branch) use ($provinceCodes) {
                    return in_array($branch->province_code, $provinceCodes) ||
                        (stripos($branch->city, 'Hanoi') !== false && in_array('HN', $provinceCodes)) ||
                        (stripos($branch->city, 'Ho Chi Minh') !== false && (in_array('HCM', $provinceCodes) || in_array('SG', $provinceCodes))) ||
                        (stripos($branch->city, 'Danang') !== false && in_array('DN', $provinceCodes));
                });

                $cityBranchIds = $cityBranches->pluck('id')->toArray();

                // Aggregate data for these branches
                // Tổng hợp dữ liệu cho các chi nhánh này
                $cityShipments = $shipments->filter(function ($shipment) use ($cityBranchIds) {
                    return in_array($shipment->assigned_branch_id, $cityBranchIds);
                });

                $cityRevenue = $payments->filter(function ($payment) use ($cityBranchIds) {
                    return $payment->shipment && in_array($payment->shipment->assigned_branch_id, $cityBranchIds);
                })->sum('amount');

                $regionMetrics[] = [
                    'branch_id' => null, // Grouped by city, so no specific branch ID / Nhóm theo thành phố, không có ID chi nhánh cụ thể
                    'branch_name' => $cityName,
                    'city' => $cityName,
                    'province_code' => $provinceCodes[0],
                    'total_orders' => $cityShipments->count(),
                    'success_orders' => $cityShipments->filter(function ($s) {
                        return in_array($s->shipment_status, ['DELIVERED_SUCCESS', 'CLOSED']);
                    })->count(),
                    'cancelled_orders' => $cityShipments->filter(function ($s) {
                        return in_array($s->shipment_status, ['DELIVERY_FAILED', 'RETURN_COMPLETED', 'DISPOSED']);
                    })->count(),
                    'revenue' => $cityRevenue,
                ];
            }
        }

        // 6. Vehicle type aggregation
        // 6. Tổng hợp loại phương tiện
        $vehicleMetrics = [];

        if ($branchId) {
            // Agent: Vehicles in their branch
            // Agent: Phương tiện trong chi nhánh của họ
            $branch = $branches->first();
            if ($branch) {
                $branchVehicles = $vehicles->filter(function ($vehicle) use ($branch) {
                    return $vehicle->branches->contains('id', $branch->id);
                });

                $vehicleTypeCounts = [];
                foreach ($branchVehicles as $vehicle) {
                    $type = $vehicle->vehicle_type;
                    $qty = 0;
                    // Get pivot quantity / Lấy số lượng từ bảng trung gian
                    foreach ($vehicle->branches as $b) {
                        if ($b->id == $branch->id) {
                            $qty = (int) ($b->pivot->quantity ?? 1);
                            break;
                        }
                    }
                    $vehicleTypeCounts[$type] = ($vehicleTypeCounts[$type] ?? 0) + $qty;
                }

                $vehicleMetrics[] = [
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'city' => $branch->city,
                    'vehicle_types' => $this->mapVehicleTypes($vehicleTypeCounts),
                ];
            }
        } else {
            // Admin: Vehicles aggregated by City
            // Admin: Phương tiện tổng hợp theo Thành phố
            $mainCities = [
                'Hanoi' => ['HN'],
                'Ho Chi Minh City' => ['HCM', 'SG'],
                'Danang' => ['DN'],
            ];

            foreach ($mainCities as $cityName => $provinceCodes) {
                // Determine relevant branches
                // Xác định các chi nhánh liên quan
                $cityBranches = $branches->filter(function ($branch) use ($provinceCodes) {
                    return in_array($branch->province_code, $provinceCodes) ||
                        (stripos($branch->city, 'Hanoi') !== false && in_array('HN', $provinceCodes)) ||
                        (stripos($branch->city, 'Ho Chi Minh') !== false && (in_array('HCM', $provinceCodes) || in_array('SG', $provinceCodes))) ||
                        (stripos($branch->city, 'Danang') !== false && in_array('DN', $provinceCodes));
                });

                $cityBranchIds = $cityBranches->pluck('id')->toArray();

                // Find vehicles attached to these branches
                // Tìm phương tiện gắn với các chi nhánh này
                $cityVehicles = $vehicles->filter(function ($vehicle) use ($cityBranchIds) {
                    return $vehicle->branches->contains(function ($branch) use ($cityBranchIds) {
                        return in_array($branch->id, $cityBranchIds);
                    });
                });

                $vehicleTypeCounts = [];
                foreach ($cityVehicles as $vehicle) {
                    $type = $vehicle->vehicle_type;
                    $qty = 0;
                    foreach ($vehicle->branches as $b) {
                        if (in_array($b->id, $cityBranchIds)) {
                            $qty = (int) ($b->pivot->quantity ?? 1);
                            break;
                        }
                    }
                    $vehicleTypeCounts[$type] = ($vehicleTypeCounts[$type] ?? 0) + $qty;
                }

                $vehicleMetrics[] = [
                    'branch_id' => null,
                    'branch_name' => $cityName,
                    'city' => $cityName,
                    'vehicle_types' => $this->mapVehicleTypes($vehicleTypeCounts),
                ];
            }
        }

        return [
            'status' => $statusMetrics,
            'revenue' => $totalRevenue,
            'product_types' => $productTypeMetrics,
            'service_types' => $serviceTypeMetrics,
            'regions' => $regionMetrics,
            'vehicles' => $vehicleMetrics,
        ];
    }

    /**
     * Helper to map vehicle types to standard output keys.
     * Hàm hỗ trợ ánh xạ loại phương tiện sang các key đầu ra tiêu chuẩn.
     */
    private function mapVehicleTypes($counts)
    {
        return [
            'Motorbike' => $counts['Motorbike'] ?? 0,
            '2.5-ton Truck' => $counts['2.5-ton Truck'] ?? 0,
            '2.0-ton Truck' => $counts['2.0-ton Truck'] ?? 0,
            '3.5-ton Truck' => $counts['3.5-ton Truck'] ?? 0,
            '5-ton Truck' => $counts['5-ton Truck'] ?? 0,
        ];
    }

    /**
     * P8.4: Generate Visual Analytics.
     * Tạo dữ liệu phân tích trực quan.
     *
     * Purpose:
     * Converts the aggregated metrics and raw operational data into specific JSON structures
     * required by the frontend charts (Donut, Line, Bar).
     *
     * Mục đích:
     * Chuyển đổi các chỉ số tổng hợp và dữ liệu vận hành thô thành các cấu trúc JSON cụ thể
     * được yêu cầu bởi các biểu đồ frontend (Donut, Đường, Cột).
     *
     * @param array $operationalData
     * @param array $aggregatedMetrics
     * @param Carbon $dateStart
     * @param Carbon $dateEnd
     * @param int|null $branchId
     * @return array
     */
    private function generateChartData($operationalData, $aggregatedMetrics, $dateStart, $dateEnd, $branchId = null)
    {
        $shipments = $operationalData['shipments'];
        $payments = $operationalData['payments'];

        // 1. Donut chart: Success vs Cancelled ratio
        // 1. Biểu đồ Donut: Tỷ lệ Thành công vs Hủy
        $donutData = [
            [
                'name' => 'Delivered',
                'value' => $aggregatedMetrics['status']['success'],
                'color' => '#10b981', // Emerald
            ],
            [
                'name' => 'Cancelled',
                'value' => $aggregatedMetrics['status']['cancelled'],
                'color' => '#ef4444', // Red
            ],
        ];

        // 2. Line chart: Daily success/failed trend
        // 2. Biểu đồ Đường: Xu hướng thành công/thất bại hàng ngày
        $dailyTrend = $this->generateDailyTrend($shipments, $dateStart, $dateEnd);

        // 3. Line chart: Product category trends over time
        // 3. Biểu đồ Đường: Xu hướng danh mục sản phẩm theo thời gian
        $productCategoryTrends = $this->generateProductCategoryTrends($shipments, $dateStart, $dateEnd);

        // 4. Line chart: Service type trends
        // 4. Biểu đồ Đường: Xu hướng loại dịch vụ
        $serviceTypeTrends = $this->generateServiceTypeTrends($shipments, $dateStart, $dateEnd);

        // 5. Stacked column: City success/cancelled (Admin only)
        // 5. Biểu đồ Cột chồng: Thành công/Hủy theo thành phố (Chỉ Admin)
        $citySuccessMetrics = [];
        if (!$branchId) {
            foreach ($aggregatedMetrics['regions'] as $region) {
                $citySuccessMetrics[] = [
                    'city' => $region['city'] ?? $region['branch_name'],
                    'success' => $region['success_orders'],
                    'cancelled' => $region['cancelled_orders'],
                ];
            }
        }

        // 6. Column chart: Revenue by city (Admin only)
        // 6. Biểu đồ Cột: Doanh thu theo thành phố (Chỉ Admin)
        $cityRevenueData = [];
        if (!$branchId) {
            foreach ($aggregatedMetrics['regions'] as $region) {
                $cityRevenueData[] = [
                    'name' => $region['city'] ?? $region['branch_name'],
                    'value' => $region['revenue'],
                ];
            }
        }

        // 7. Column chart: Product categories by region
        // 7. Biểu đồ Cột: Danh mục sản phẩm theo khu vực
        $productCategoryByRegion = $this->generateProductCategoryByRegion($shipments, $aggregatedMetrics['regions'], $branchId);

        // 8. Column chart: Vehicle types by branch/city
        // 8. Biểu đồ Cột: Loại phương tiện theo chi nhánh/thành phố
        $fleetData = [];

        if ($branchId) {
            // For Agent: single branch vehicle data
            // Cho Agent: dữ liệu phương tiện của một chi nhánh
            foreach ($aggregatedMetrics['vehicles'] as $vehicleMetric) {
                // Flattening vehicle types into array for chart
                $fleetData[] = [
                    'type' => 'Motorbike',
                    'count' => $vehicleMetric['vehicle_types']['Motorbike'] ?? 0,
                ];
                $fleetData[] = [
                    'type' => '2.0t Truck',
                    // Group similar truck sizes
                    'count' => ($vehicleMetric['vehicle_types']['2.5-ton Truck'] ?? 0) + ($vehicleMetric['vehicle_types']['2.0-ton Truck'] ?? 0),
                ];
                $fleetData[] = [
                    'type' => '3.5t Truck',
                    'count' => $vehicleMetric['vehicle_types']['3.5-ton Truck'] ?? 0,
                ];
                $fleetData[] = [
                    'type' => '5.0t Truck',
                    'count' => $vehicleMetric['vehicle_types']['5-ton Truck'] ?? 0,
                ];
            }
        } else {
            // For Admin: Aggregate all vehicle types across all branches/cities into a single total view
            // Cho Admin: Tổng hợp tất cả loại phương tiện trên mọi chi nhánh/thành phố thành một chế độ xem tổng
            $fleetGrouped = [
                'Motorbike' => 0,
                '2.0t Truck' => 0,
                '3.5t Truck' => 0,
                '5.0t Truck' => 0,
            ];

            foreach ($aggregatedMetrics['vehicles'] as $vehicleMetric) {
                $fleetGrouped['Motorbike'] += $vehicleMetric['vehicle_types']['Motorbike'] ?? 0;
                $fleetGrouped['2.0t Truck'] += ($vehicleMetric['vehicle_types']['2.5-ton Truck'] ?? 0) + ($vehicleMetric['vehicle_types']['2.0-ton Truck'] ?? 0);
                $fleetGrouped['3.5t Truck'] += $vehicleMetric['vehicle_types']['3.5-ton Truck'] ?? 0;
                $fleetGrouped['5.0t Truck'] += $vehicleMetric['vehicle_types']['5-ton Truck'] ?? 0;
            }

            // Convert to array format
            foreach ($fleetGrouped as $type => $count) {
                if ($count > 0) {
                    $fleetData[] = [
                        'type' => $type,
                        'count' => $count,
                    ];
                }
            }
        }

        return [
            'donut' => $donutData,
            'daily_trend' => $dailyTrend,
            'product_category_trends' => $productCategoryTrends,
            'service_type_trends' => $serviceTypeTrends,
            'city_success_metrics' => $citySuccessMetrics,
            'city_revenue' => $cityRevenueData,
            'product_category_by_region' => $productCategoryByRegion,
            'fleet_data' => $fleetData,
        ];
    }

    /**
     * Generate daily success/failed trend.
     * Tạo xu hướng thành công/thất bại hàng ngày.
     */
    private function generateDailyTrend($shipments, Carbon $dateStart, Carbon $dateEnd)
    {
        // Group shipments by Y-m-d
        // Nhóm vận đơn theo Y-m-d
        $grouped = $shipments->groupBy(function ($shipment) {
            return Carbon::parse($shipment->created_at)->toDateString();
        });

        $current = $dateStart->copy();
        $trend = [];
        // Iterate through each day in range to ensure continuity (fill missing days with 0)
        // Lặp qua từng ngày trong khoảng để đảm bảo tính liên tục (điền 0 vào ngày thiếu)
        while ($current <= $dateEnd) {
            $dateKey = $current->toDateString();
            $displayLabel = $current->format('M d');

            $group = $grouped->get($dateKey, collect());
            $success = $group->filter(function ($s) {
                return in_array($s->shipment_status, ['DELIVERED_SUCCESS', 'CLOSED']);
            })->count();
            $failed = $group->filter(function ($s) {
                return in_array($s->shipment_status, ['DELIVERY_FAILED', 'RETURN_COMPLETED', 'DISPOSED']);
            })->count();

            $trend[] = [
                'date' => $displayLabel,
                'success' => $success,
                'failed' => $failed,
            ];

            $current->addDay();
        }

        return $trend;
    }

    /**
     * Generate product category trends over time.
     * Tạo xu hướng danh mục sản phẩm theo thời gian.
     */
    private function generateProductCategoryTrends($shipments, Carbon $dateStart, Carbon $dateEnd)
    {
        $grouped = $shipments->groupBy(function ($shipment) {
            return Carbon::parse($shipment->created_at)->toDateString();
        });

        $categoryMap = $this->getCategoryMap();
        $defaultCategories = array_fill_keys(array_values($categoryMap), 0);
        $trends = [];

        $current = $dateStart->copy();
        while ($current <= $dateEnd) {
            $dateKey = $current->toDateString();
            $displayLabel = $current->format('M d');

            // Start with zero counts
            // Bắt đầu với số lượng bằng 0
            $data = array_merge(['date' => $displayLabel], $defaultCategories);

            if ($grouped->has($dateKey)) {
                $group = $grouped->get($dateKey);
                foreach ($categoryMap as $dbType => $chartKey) {
                    $data[$chartKey] = $group->where('goods_type', $dbType)->count();
                }
            }

            $trends[] = $data;
            $current->addDay();
        }

        return $trends;
    }

    /**
     * Generate service type trends.
     * Tạo xu hướng loại dịch vụ.
     */
    private function generateServiceTypeTrends($shipments, Carbon $dateStart, Carbon $dateEnd)
    {
        $grouped = $shipments->groupBy(function ($shipment) {
            return Carbon::parse($shipment->created_at)->toDateString();
        });

        $trends = [];
        $current = $dateStart->copy();
        while ($current <= $dateEnd) {
            $dateKey = $current->toDateString();
            $displayLabel = $current->format('M d');

            $standard = 0;
            $express = 0;
            if ($grouped->has($dateKey)) {
                $group = $grouped->get($dateKey);
                $standard = $group->where('service_type', 'STANDARD')->count();
                $express = $group->where('service_type', 'EXPRESS')->count();
            }

            $trends[] = [
                'date' => $displayLabel,
                'standard' => $standard,
                'express' => $express,
            ];

            $current->addDay();
        }

        return $trends;
    }

    /**
     * Generate product categories by region.
     * Tạo danh mục sản phẩm theo khu vực.
     */
    private function generateProductCategoryByRegion($shipments, $regions, $branchId = null)
    {
        $result = [];
        $categoryMap = $this->getCategoryMap();
        $defaultCategories = array_fill_keys(array_values($categoryMap), 0);

        foreach ($regions as $region) {
            if ($branchId) {
                // For Agent: filter by branch_id directly
                // Cho Agent: lọc trực tiếp theo branch_id
                $branchShipments = $shipments->where('assigned_branch_id', $region['branch_id']);
            } else {
                // For Admin: filter by all branches in the city (aggregated region)
                // Cho Admin: lọc theo tất cả chi nhánh trong thành phố (khu vực tổng hợp)
                $cityBranches = \App\Models\Branch::where('province_code', $region['province_code'])->pluck('id')->toArray();
                $branchShipments = $shipments->filter(function ($shipment) use ($cityBranches) {
                    return in_array($shipment->assigned_branch_id, $cityBranches);
                });
            }

            $data = array_merge(['name' => $region['city'] ?? $region['branch_name']], $defaultCategories);

            foreach ($categoryMap as $dbType => $chartKey) {
                if ($branchId) {
                    $data[$chartKey] = $branchShipments->where('goods_type', $dbType)->count();
                } else {
                    $data[$chartKey] = $branchShipments->filter(function ($s) use ($dbType) {
                        return $s->goods_type === $dbType;
                    })->count();
                }
            }

            $result[] = $data;
        }

        return $result;
    }

    /**
     * Get category map and default categories (helper method).
     * Lấy bản đồ danh mục và danh mục mặc định (phương thức hỗ trợ).
     */
    private function getCategoryMap()
    {
        // Maps Database ENUMs to Chart Keys
        // Ánh xạ ENUM trong CSDL sang Key của Biểu đồ
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
     * Download exported report.
     * Tải xuống báo cáo đã xuất.
     *
     * @param int $id
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
     */
    public function download($id)
    {
        try {
            $snapshot = ReportSnapshot::findOrFail($id);
            $user = Auth::user();

            // Check authorization: Agent can only access their branch's reports
            // Kiểm tra quyền: Agent chỉ có thể truy cập báo cáo của chi nhánh họ
            if ($user->role === 'AGENT') {
                // For consistency, Agent access is hardcoded to the Da Nang branch report.
                // Để đảm bảo tính nhất quán, quyền truy cập của Agent được gán cố định cho báo cáo của chi nhánh Đà Nẵng.
                $danangBranch = Branch::where('city', 'like', '%Đà Nẵng%')->first();
                $allowedBranchId = $danangBranch ? $danangBranch->id : null;

                // The snapshot's branch_id must match the allowed Da Nang branch ID.
                // branch_id của snapshot phải khớp với ID chi nhánh Đà Nẵng được cho phép.
                if (!$allowedBranchId || $snapshot->branch_id != $allowedBranchId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized. Agents can only access Da Nang reports.'
                    ], 403);
                }
            }

            // Verify file existence
            // Xác minh sự tồn tại của file
            if (!$snapshot->file_path || !file_exists(storage_path('app/' . $snapshot->file_path))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Report file not found'
                ], 404);
            }

            return response()->download(
                storage_path('app/' . $snapshot->file_path),
                'report_' . $snapshot->report_id . '.pdf'
            );
        } catch (\Exception $e) {
            \Log::error('Error downloading report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error downloading report: ' . $e->getMessage()
            ], 500);
        }
    }
}