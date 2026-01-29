<?php

/**
 * OVERALL PURPOSE:
 * This controller handles data aggregation for dashboard visualizations, 
 * specifically calculating revenue statistics filtered by time periods and user roles.
 * * MỤC ĐÍCH TỔNG QUÁT:
 * Controller này xử lý việc tổng hợp dữ liệu cho các biểu đồ trên dashboard,
 * cụ thể là tính toán số liệu thống kê doanh thu được lọc theo khoảng thời gian và vai trò người dùng.
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bill; // Assuming you have a Bill model to calculate revenue
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    /**
     * Get revenue statistics data for dashboard charts.
     * Lấy dữ liệu thống kê doanh thu cho biểu đồ dashboard.
     * * @param Request $request Contains 'period' (day, week, month, year).
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

        // Initialize query on the bills table to sum total amounts.
        // Khởi tạo truy vấn trên bảng bills để tính tổng số tiền.
        $query = Bill::query()
            ->selectRaw('SUM(bills.total_amount) as revenue')
            // Only consider 'PAID' status to ensure revenue reflects actual collected money.
            // Chỉ tính các hóa đơn 'PAID' để đảm bảo doanh thu phản ánh số tiền thực tế đã thu.
            ->where('bills.bill_status', 'PAID');

        /**
         * ROLE-BASED FILTERING / LỌC THEO VAI TRÒ:
         * If the user is an AGENT, we must restrict data to their specific branch.
         * Since 'bills' might not have branch info directly, we join with 'shipments'.
         * * Nếu người dùng là AGENT, chúng ta phải giới hạn dữ liệu trong chi nhánh của họ.
         * Vì bảng 'bills' có thể không có thông tin chi nhánh trực tiếp, ta phải join với bảng 'shipments'.
         */
        if ($user && $user->role === 'AGENT' && $user->branch_id) {
            $query->join('shipments', 'bills.shipment_id', '=', 'shipments.shipment_id')
                ->where('shipments.assigned_branch_id', $user->branch_id);
        }

        $dateFormat = "";
        $groupBy = "";

        /**
         * TIME GRANULARITY LOGIC / LOGIC VỀ ĐỘ CHI TIẾT THỜI GIAN:
         * Depending on the period, we group data by year, month, week, or day.
         * This determines how the X-axis of the chart will be labeled.
         * * Tùy thuộc vào period, chúng ta nhóm dữ liệu theo năm, tháng, tuần hoặc ngày.
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
         * * Lấy 12 điểm dữ liệu gần nhất (ví dụ: 12 tháng qua) để biểu đồ rõ ràng.
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