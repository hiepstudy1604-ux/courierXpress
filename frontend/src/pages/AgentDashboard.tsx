import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Activity,
  Box,
  Users,
  Clock,
  Download,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { User } from "../types";
import { DashboardService } from "../services/api";

/**
 * ============================================================================
 * COMPONENT SUMMARY / TÓM TẮT COMPONENT
 * ============================================================================
 * Purpose:
 * This component renders the Dashboard specifically designed for Agents (Branch Managers).
 * Unlike the Admin dashboard, this view is strictly scoped to the data of the
 * logged-in user's branch. It visualizes KPIs, revenue trends, and shipment statuses.
 * * * Mục đích:
 * Component này hiển thị Bảng điều khiển được thiết kế riêng cho Đại lý (Quản lý chi nhánh).
 * Khác với bảng điều khiển Admin, giao diện này được giới hạn nghiêm ngặt trong dữ liệu
 * của chi nhánh mà người dùng đã đăng nhập. Nó trực quan hóa các chỉ số KPI, xu hướng 
 * doanh thu và trạng thái vận đơn.
 * * Key Features / Tính năng chính:
 * 1. Branch-scoped Data Fetching / Lấy dữ liệu theo phạm vi chi nhánh.
 * 2. Real-time updates via Event Listeners / Cập nhật thời gian thực qua Event Listeners.
 * 3. PDF Export functionality / Chức năng xuất báo cáo PDF.
 * 4. Interactive Charts (Recharts) / Biểu đồ tương tác (Recharts).
 */

interface Props {
  user: User; // The currently logged-in agent / Đại lý đang đăng nhập
}

// --- STYLING CONSTANTS / HẰNG SỐ GIAO DIỆN ---

// Consistent brand colors for charts and UI elements.
// Màu sắc thương hiệu nhất quán cho biểu đồ và các phần tử giao diện.
const BRAND_COLORS = {
  primary: "#f97316",
  secondary: "#6366f1",
  success: "#10b981",
  danger: "#ef4444",
  neutral: "#64748b",
  amber: "#f59e0b",
};

// Colors used for multi-category charts (e.g., product types).
// Màu sắc được sử dụng cho các biểu đồ đa danh mục (ví dụ: loại sản phẩm).
const CATEGORY_COLORS = [
  "#f97316",
  "#6366f1",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#3b82f6",
];

// Common styling for Recharts axes to maintain consistency.
// Kiểu dáng chung cho các trục của Recharts để duy trì sự nhất quán.
const CHART_AXIS_STYLE = {
  fill: "#94a3b8",
  fontSize: 11,
  fontWeight: 600,
};

// Custom styling for chart tooltips (popups).
// Kiểu dáng tùy chỉnh cho chú thích biểu đồ (popups).
const CHART_TOOLTIP_STYLE = {
  borderRadius: "16px",
  border: "none",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  fontSize: "12px",
  fontWeight: "600",
};

// Grid line styling for charts (dashed lines).
// Kiểu dáng đường lưới cho biểu đồ (nét đứt).
const CHART_GRID_STYLE = {
  stroke: "#f1f5f9",
  strokeDasharray: "3 3",
  vertical: false,
};

const AgentDashboard: React.FC<Props> = ({ user }) => {
  // --- STATE MANAGEMENT / QUẢN LÝ STATE ---

  // Filter for the dashboard data: 'week', 'month', or 'year'.
  // Bộ lọc cho dữ liệu bảng điều khiển: 'tuần', 'tháng', hoặc 'năm'.
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "year">(
    "week",
  );

  // Stores summary numbers (revenue, total shipments, etc.).
  // Lưu trữ các số liệu tóm tắt (doanh thu, tổng vận đơn, v.v.).
  const [stats, setStats] = useState<any>(null);

  // Stores data arrays formatted for Recharts.
  // Lưu trữ mảng dữ liệu đã được định dạng cho Recharts.
  const [charts, setCharts] = useState<any>(null);

  // Loading state for API calls.
  // Trạng thái tải cho các cuộc gọi API.
  const [isLoading, setIsLoading] = useState(true);

  // Loading state specific to the PDF generation process.
  // Trạng thái tải dành riêng cho quy trình tạo PDF.
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Function: fetchStats
   * Purpose: Retrieves dashboard data from the backend.
   * Logic: It explicitly extracts the `branch_id` from the `user` prop to ensure
   * the API only returns data relevant to this specific agent.
   * * Hàm: fetchStats
   * Mục đích: Lấy dữ liệu bảng điều khiển từ backend.
   * Logic: Nó trích xuất rõ ràng `branch_id` từ prop `user` để đảm bảo
   * API chỉ trả về dữ liệu liên quan đến đại lý cụ thể này.
   */
  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Extract branch ID, handling potential differences in User object structure.
      // Trích xuất ID chi nhánh, xử lý các khác biệt tiềm ẩn trong cấu trúc đối tượng User.
      const agentBranchId = (user as any).branch_id || user.branch?.id;
      
      const response = await DashboardService.getStats({
        period: timePeriod,
        branch_id: agentBranchId, // Crucial: Filters by branch / Quan trọng: Lọc theo chi nhánh
      });

      if (response.data.success) {
        setStats(response.data.data.stats);
        setCharts(response.data.data.charts);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Effect: Initial Load & Filter Change
   * Purpose: Fetches data when the component mounts or when filters/user change.
   * * Effect: Tải ban đầu & Thay đổi bộ lọc
   * Mục đích: Lấy dữ liệu khi component được gắn kết hoặc khi bộ lọc/người dùng thay đổi.
   */
  useEffect(() => {
    fetchStats();
  }, [timePeriod, user.branch?.id, (user as any).branch_id]);

  /**
   * Effect: Real-time Updates (Event Listener)
   * Purpose: Listens for a custom window event "shipment:updated" to refresh data.
   * Logic: Uses a debounce mechanism (500ms timeout) to prevent flooding the API
   * if multiple updates happen in rapid succession.
   * * Effect: Cập nhật thời gian thực (Event Listener)
   * Mục đích: Lắng nghe sự kiện tùy chỉnh "shipment:updated" để làm mới dữ liệu.
   * Logic: Sử dụng cơ chế debounce (thời gian chờ 500ms) để ngăn chặn việc làm tràn API
   * nếu có nhiều cập nhật xảy ra liên tiếp nhanh chóng.
   */
  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleRefetch = () => {
      // Clear existing timeout if a new event arrives quickly.
      // Xóa timeout hiện tại nếu có sự kiện mới đến nhanh chóng.
      if (timeoutId) window.clearTimeout(timeoutId);
      
      // Schedule the fetch.
      // Lên lịch lấy dữ liệu.
      timeoutId = window.setTimeout(() => {
        fetchStats();
      }, 500);
    };

    const handleShipmentUpdated = () => {
      scheduleRefetch();
    };

    window.addEventListener("shipment:updated", handleShipmentUpdated);

    // Cleanup: Remove listener and clear timeout to prevent memory leaks.
    // Dọn dẹp: Xóa listener và xóa timeout để ngăn rò rỉ bộ nhớ.
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener("shipment:updated", handleShipmentUpdated);
    };
  }, [timePeriod, user.branch?.id, (user as any).branch_id]);

  /**
   * Effect: Polling Fallback
   * Purpose: Fetches data every 30 seconds as a backup in case WebSocket/Events fail.
   * * Effect: Dự phòng Polling
   * Mục đích: Lấy dữ liệu mỗi 30 giây như một phương án dự phòng trường hợp WebSocket/Events bị lỗi.
   */
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchStats();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [timePeriod, user.branch?.id, (user as any).branch_id]);

  /**
   * Function: handleExportPDF
   * Purpose: Generates a downloadable PDF report of the dashboard.
   * Logic: Identifies HTML elements with class "print-section", converts them to
   * images using html2canvas, and compiles them into a PDF using jsPDF.
   * * Hàm: handleExportPDF
   * Mục đích: Tạo báo cáo PDF có thể tải xuống của bảng điều khiển.
   * Logic: Xác định các phần tử HTML có class "print-section", chuyển đổi chúng
   * thành hình ảnh bằng html2canvas, và tổng hợp vào PDF bằng jsPDF.
   */
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const elements = document.querySelectorAll(".print-section");
      if (elements.length === 0) return;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;

      let currentY = margin;

      // Add Title
      // Thêm tiêu đề
      pdf.setFontSize(18);
      pdf.text("Agent Logistics Report", pageWidth / 2, currentY + 5, {
        align: "center",
      });
      currentY += 20;

      // Loop through chart sections and add them to PDF
      // Lặp qua các phần biểu đồ và thêm chúng vào PDF
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;

        const canvas = await html2canvas(element, {
          scale: 2, // High resolution for better print quality / Độ phân giải cao cho chất lượng in tốt hơn
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const imgProps = pdf.getImageProperties(imgData);
        // Calculate height to maintain aspect ratio
        // Tính toán chiều cao để giữ nguyên tỷ lệ khung hình
        const pdfImgHeight = (imgProps.height * contentWidth) / imgProps.width;

        // Add new page if content exceeds page height
        // Thêm trang mới nếu nội dung vượt quá chiều cao trang
        if (currentY + pdfImgHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.addImage(
          imgData,
          "PNG",
          margin,
          currentY,
          contentWidth,
          pdfImgHeight,
        );
        currentY += pdfImgHeight + 10;
      }

      pdf.save(`Agent_Report_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* --- Header Section: Time Filters & Actions / Phần Header: Bộ lọc thời gian & Hành động --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1.5">
          {(["week", "month", "year"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-6 py-2.5 rounded-[14px] text-sm font-bold transition-all ${
                timePeriod === period
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:bg-white/60"
              }`}
            >
              {period === "week" && "Week"}
              {period === "month" && "Month"}
              {period === "year" && "Year"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            aria-label="Download report"
            className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-black transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
          </button>
        </div>
      </div>

      {/* --- Metric Cards Grid / Lưới thẻ chỉ số --- */}
      {/* Display Key Performance Indicators (KPIs) at the top */}
      {/* Hiển thị các Chỉ số Hiệu suất Chính (KPI) ở phía trên */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          <div className="col-span-5 flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#f97316]" />
          </div>
        ) : (
          [
            {
              label: "Booked",
              value: stats?.pendingCouriers?.toString() || "0",
              icon: Clock,
              color: "text-amber-500",
              bg: "bg-amber-50",
              border: "border-amber-100",
            },
            {
              label: "Shipping",
              value: stats?.inTransitCouriers?.toString() || "0",
              icon: Truck,
              color: "text-orange-500",
              bg: "bg-orange-50",
              border: "border-orange-100",
            },
            {
              label: "Delivered",
              value: stats?.deliveredCouriers?.toString() || "0",
              icon: CheckCircle,
              color: "text-emerald-500",
              bg: "bg-emerald-50",
              border: "border-emerald-100",
            },
            {
              label: "Cancelled",
              value: stats?.cancelledCouriers?.toString() || "0",
              icon: XCircle,
              color: "text-rose-500",
              bg: "bg-rose-50",
              border: "border-rose-100",
            },
            {
              label: "Revenue",
              value: stats?.totalRevenue
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(stats.totalRevenue / 25000) // Conversion factor for display / Hệ số chuyển đổi để hiển thị
                : "$0",
              icon: DollarSign,
              color: "text-slate-900",
              bg: "bg-slate-100",
              border: "border-slate-200",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`bg-white p-5 rounded-[28px] border-2 ${stat.border} shadow-sm group hover:scale-[1.02] transition-transform`}
            >
              <div
                className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3 shadow-inner`}
              >
                <stat.icon size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-slate-900 tracking-tighter mt-0.5">
                {stat.value}
              </p>
            </div>
          ))
        )}
      </div>

      {/* --- CHART ROW 1: Revenue & Delivery Trends / HÀNG BIỂU ĐỒ 1: Xu hướng Doanh thu & Giao hàng --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Revenue Area Chart / Biểu đồ vùng Doanh thu hàng tuần */}
        <div className="print-section bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl shadow-sm">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Weekly Revenue Flow
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.weeklyRevenue || []}>
                <defs>
                  {/* Gradient definition for the area chart fill */}
                  {/* Định nghĩa gradient để tô màu cho biểu đồ vùng */}
                  <linearGradient id="agentRev" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={BRAND_COLORS.primary}
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor={BRAND_COLORS.primary}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid {...CHART_GRID_STYLE} />
                <XAxis
                  dataKey="name"
                  {...CHART_AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  {...CHART_AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={BRAND_COLORS.primary}
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#agentRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Delivery Trend Line Chart / Biểu đồ đường Xu hướng Giao hàng hàng tuần */}
        <div className="print-section bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm">
              <Activity size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Weekly Delivery Trend
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.weeklyDeliveryTrend || []}>
                <CartesianGrid {...CHART_GRID_STYLE} />
                <XAxis
                  dataKey="name"
                  {...CHART_AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  {...CHART_AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend verticalAlign="top" align="right" iconType="circle" />
                <Line
                  name="Success"
                  type="monotone"
                  dataKey="success"
                  stroke={BRAND_COLORS.success}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  name="Fail"
                  type="monotone"
                  dataKey="fail"
                  stroke={BRAND_COLORS.danger}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- CHART ROW 2: Product Categories / HÀNG BIỂU ĐỒ 2: Danh mục sản phẩm --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Category Flows Line Chart / Biểu đồ đường Dòng chảy Danh mục Chi nhánh */}
        <div className="print-section bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm">
              <Box size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Branch Category Flows
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.categoryFlows || []}>
                <CartesianGrid {...CHART_GRID_STYLE} />
                <XAxis
                  dataKey="name"
                  {...CHART_AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  {...CHART_AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend verticalAlign="top" iconType="circle" />
                {/* Individual lines for each category / Các đường riêng lẻ cho mỗi danh mục */}
                <Line
                  name="Fashion"
                  dataKey="fashion"
                  stroke={CATEGORY_COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  name="Food"
                  dataKey="food"
                  stroke={CATEGORY_COLORS[1]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  name="Electronics"
                  dataKey="electronics"
                  stroke={CATEGORY_COLORS[2]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  name="Fragile"
                  dataKey="fragile"
                  stroke={CATEGORY_COLORS[3]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Product Mix Bar Chart / Biểu đồ cột Hỗn hợp Sản phẩm Chi nhánh */}
        <div className="print-section bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Branch Product Mix Analysis
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.branchProductMix || []} barGap={12}>
                <CartesianGrid {...CHART_GRID_STYLE} />
                <XAxis
                  dataKey="name"
                  {...CHART_AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  {...CHART_AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Legend iconType="circle" />
                <Bar
                  name="Fashion"
                  dataKey="fashion"
                  fill={CATEGORY_COLORS[0]}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  name="Food"
                  dataKey="food"
                  fill={CATEGORY_COLORS[1]}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  name="Electronics"
                  dataKey="electronics"
                  fill={CATEGORY_COLORS[2]}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  name="Fragile"
                  dataKey="fragile"
                  fill={CATEGORY_COLORS[3]}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;