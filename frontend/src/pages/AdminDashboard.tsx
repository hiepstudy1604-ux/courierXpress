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
  Cell,
} from "recharts";
import {
  TrendingUp,
  Package,
  DollarSign,
  Activity,
  Truck,
  Calendar,
  Clock,
  CheckCircle,
  Building2,
  ChevronRight,
  ChevronDown,
  Download,
  Box,
  Map,
  Users,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { DashboardService, BranchService } from "../services/api";

/**
 * ============================================================================
 * COMPONENT SUMMARY / TÓM TẮT COMPONENT
 * ============================================================================
 * Purpose:
 * The main administrative dashboard for the logistics application. It aggregates
 * and visualizes key performance indicators (KPIs) such as revenue, shipment
 * status, and branch performance.
 * * Mục đích:
 * Bảng điều khiển quản trị chính cho ứng dụng logistics. Nó tổng hợp và trực
 * quan hóa các chỉ số hiệu suất chính (KPI) như doanh thu, trạng thái vận đơn
 * và hiệu suất chi nhánh.
 *
 * Key Features / Tính năng chính:
 * 1. Data Filtering: Filter by time period (Week/Month/Year) and Branch.
 * Lọc dữ liệu: Lọc theo khoảng thời gian (Tuần/Tháng/Năm) và Chi nhánh.
 * 2. Real-time Updates: Listens to socket/window events and polls for updates.
 * Cập nhật thời gian thực: Lắng nghe sự kiện socket/window và thăm dò cập nhật.
 * 3. PDF Export: Generates a downloadable PDF report of the charts using html2canvas.
 * Xuất PDF: Tạo báo cáo PDF có thể tải xuống từ các biểu đồ bằng html2canvas.
 * 4. Visualizations: Utilizes Recharts for complex data rendering.
 * Trực quan hóa: Sử dụng Recharts để hiển thị dữ liệu phức tạp.
 */

// --- STYLING CONSTANTS / HẰNG SỐ KIỂU DÁNG ---
// Centralized color palette to maintain brand consistency across all charts.
// Bảng màu tập trung để duy trì tính nhất quán thương hiệu trên tất cả biểu đồ.
const BRAND_COLORS = {
  primary: "#f97316", // Orange
  secondary: "#6366f1", // Indigo
  success: "#10b981", // Emerald
  danger: "#ef4444", // Rose
  neutral: "#64748b", // Slate
  amber: "#f59e0b", // Amber
};

// Colors specifically for categorical data (e.g., product types).
// Màu sắc dành riêng cho dữ liệu phân loại (ví dụ: loại sản phẩm).
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

// Reusable style objects for Recharts components to ensure UI uniformity.
// Các đối tượng kiểu tái sử dụng cho component Recharts để đảm bảo sự đồng nhất giao diện.
const CHART_AXIS_STYLE = {
  fill: "#94a3b8",
  fontSize: 11,
  fontWeight: 600,
};

const CHART_TOOLTIP_STYLE = {
  borderRadius: "16px",
  border: "none",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  fontSize: "12px",
  fontWeight: "600",
};

const CHART_GRID_STYLE = {
  stroke: "#f1f5f9",
  strokeDasharray: "3 3",
  vertical: false, // Only show horizontal grid lines / Chỉ hiển thị đường lưới ngang
};

/**
 * Helper function to abbreviate city names for better chart legibility.
 * Hàm hỗ trợ viết tắt tên thành phố để hiển thị biểu đồ rõ ràng hơn.
 * * @param {string} city - Full city name / Tên đầy đủ thành phố
 * @returns {string} - Abbreviated code or original name / Mã viết tắt hoặc tên gốc
 */
const formatCityName = (city: string): string => {
  const cityMap: { [key: string]: string } = {
    Hanoi: "HN",
    "Ho Chi Minh": "HCM",
    HCMC: "HCM",
    Danang: "DN",
  };
  return cityMap[city] || city;
};

const AdminDashboard: React.FC = () => {
  // --- STATE MANAGEMENT / QUẢN LÝ STATE ---

  // Controls the date range for data aggregation.
  // Kiểm soát khoảng thời gian để tổng hợp dữ liệu.
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "year">(
    "week",
  );

  // List of available branches for the dropdown filter.
  // Danh sách các chi nhánh có sẵn cho bộ lọc dropdown.
  const [branches, setBranches] = useState<any[]>([]);

  // Currently selected branch ID ('all' means no filter).
  // ID chi nhánh đang được chọn ('all' nghĩa là không lọc).
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Stores summary metrics (total revenue, count of couriers, etc.).
  // Lưu trữ các chỉ số tóm tắt (tổng doanh thu, số lượng người vận chuyển, v.v.).
  const [stats, setStats] = useState<any>(null);

  // Stores array data for the various charts.
  // Lưu trữ dữ liệu mảng cho các biểu đồ khác nhau.
  const [charts, setCharts] = useState<any>(null);

  // UI loading state.
  // Trạng thái tải giao diện.
  const [isLoading, setIsLoading] = useState(true);

  // Loading state specifically for the PDF generation process.
  // Trạng thái tải dành riêng cho quá trình tạo PDF.
  const [isExporting, setIsExporting] = useState(false);

  // Derived value for display logic.
  // Giá trị dẫn xuất cho logic hiển thị.
  const selectedBranchName =
    selectedBranch === "all"
      ? "All Branches"
      : (branches.find(
          (b) => (b.id ?? b.branch_id)?.toString() === selectedBranch,
        )?.name ?? "Selected Branch");

  /**
   * Effect: Fetch Branches
   * Purpose: Loads the list of branches once when the component mounts.
   * Mục đích: Tải danh sách chi nhánh một lần khi component được gắn kết.
   */
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await BranchService.getAll();
        // Handle different API response structures (success flag or direct array).
        // Xử lý các cấu trúc phản hồi API khác nhau (cờ thành công hoặc mảng trực tiếp).
        if (response.data.success || Array.isArray(response.data.data)) {
          setBranches(response.data.data || response.data);
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };
    fetchBranches();
  }, []);

  /**
   * Function: fetchStats
   * Purpose: Retrieves dashboard data from the backend based on current filters.
   * Mục đích: Lấy dữ liệu bảng điều khiển từ backend dựa trên các bộ lọc hiện tại.
   */
  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Pass 'undefined' for 'all' to let the backend handle the default case.
      // Truyền 'undefined' cho 'all' để backend xử lý trường hợp mặc định.
      const response = await DashboardService.getStats({
        period: timePeriod,
        branch_id: selectedBranch === "all" ? undefined : selectedBranch,
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
   * Effect: Initial Data Fetch
   * Purpose: Re-fetches data whenever the filters (timePeriod, selectedBranch) change.
   * Mục đích: Lấy lại dữ liệu bất cứ khi nào bộ lọc thay đổi.
   */
  useEffect(() => {
    fetchStats();
  }, [timePeriod, selectedBranch]);

  /**
   * Effect: Real-time Event Listener
   * Purpose: Listens for "shipment:updated" events to refresh data automatically.
   * Uses a debounce (timeout) strategy to prevent API spamming if many events fire at once.
   * Mục đích: Lắng nghe sự kiện "shipment:updated" để tự động làm mới dữ liệu.
   * Sử dụng chiến lược debounce (thời gian chờ) để ngăn chặn spam API nếu nhiều sự kiện kích hoạt cùng lúc.
   */
  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleRefetch = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      // Wait 500ms after the last event before fetching.
      // Đợi 500ms sau sự kiện cuối cùng trước khi lấy dữ liệu.
      timeoutId = window.setTimeout(() => {
        fetchStats();
      }, 500);
    };

    const handleShipmentUpdated = () => {
      scheduleRefetch();
    };

    window.addEventListener("shipment:updated", handleShipmentUpdated);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener("shipment:updated", handleShipmentUpdated);
    };
  }, [timePeriod, selectedBranch]);

  /**
   * Effect: Fallback Polling
   * Purpose: Periodically fetches data (every 30s) to ensure consistency even if events are missed.
   * Mục đích: Định kỳ lấy dữ liệu (mỗi 30 giây) để đảm bảo tính nhất quán ngay cả khi bỏ lỡ sự kiện.
   */
  useEffect(() => {
    // Fallback polling to keep dashboard reasonably up to date even if events are missed.
    const intervalId = window.setInterval(() => {
      fetchStats();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [timePeriod, selectedBranch]);

  /**
   * Function: handleExportPDF
   * Purpose: Captures specific DOM elements (charts) and generates a PDF report.
   * Mục đích: Chụp các phần tử DOM cụ thể (biểu đồ) và tạo báo cáo PDF.
   */
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Select all elements with class 'print-section' (Charts containers).
      // Chọn tất cả các phần tử có class 'print-section' (Container biểu đồ).
      const elements = document.querySelectorAll(".print-section");
      if (elements.length === 0) return;

      // Initialize PDF document (portrait, mm, A4).
      // Khởi tạo tài liệu PDF (khổ dọc, mm, A4).
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;

      let currentY = margin;

      // Add report title.
      // Thêm tiêu đề báo cáo.
      pdf.setFontSize(18);
      pdf.text("Weekly Logistics Report", pageWidth / 2, currentY + 5, {
        align: "center",
      });
      currentY += 20;

      // Iterate through each chart element and add to PDF.
      // Lặp qua từng phần tử biểu đồ và thêm vào PDF.
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;

        // Convert HTML element to canvas/image.
        // Chuyển đổi phần tử HTML thành canvas/hình ảnh.
        const canvas = await html2canvas(element, {
          scale: 2, // High resolution / Độ phân giải cao
          useCORS: true, // Handle cross-origin images / Xử lý hình ảnh khác nguồn
          logging: false,
          backgroundColor: "#ffffff", // Ensure white background / Đảm bảo nền trắng
        });

        const imgData = canvas.toDataURL("image/png");
        const imgProps = pdf.getImageProperties(imgData);
        // Calculate height maintaining aspect ratio.
        // Tính toán chiều cao giữ nguyên tỷ lệ khung hình.
        const pdfImgHeight = (imgProps.height * contentWidth) / imgProps.width;

        // Check for page break if image exceeds remaining page height.
        // Kiểm tra ngắt trang nếu hình ảnh vượt quá chiều cao trang còn lại.
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
        currentY += pdfImgHeight + 10; // Add padding between charts / Thêm khoảng cách giữa các biểu đồ
      }

      // Trigger browser download.
      // Kích hoạt tải xuống trình duyệt.
      pdf.save(
        `Logistics_Report_${new Date().toISOString().split("T")[0]}.pdf`,
      );
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* --- HEADER SECTION: FILTERS & ACTIONS --- */}
      {/* --- PHẦN HEADER: BỘ LỌC & HÀNH ĐỘNG --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-4">
          {/* Time Period Selector / Bộ chọn khoảng thời gian */}
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

          {/* Branch Filter Dropdown / Dropdown lọc chi nhánh */}
          <div className="relative">
            <Building2
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full md:w-auto pl-11 pr-10 py-3 bg-slate-100 border-transparent rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-400 transition-all appearance-none"
              aria-label="Filter by branch"
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option
                  key={branch.id ?? branch.branch_id}
                  value={branch.id ?? branch.branch_id}
                >
                  {(branch.name ?? branch.branch_code)?.replace(
                    "Chi nhánh ",
                    "",
                  )}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Action Buttons (Export) / Các nút hành động (Xuất) */}
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

      {/* --- METRIC CARDS GRID --- */}
      {/* --- LƯỚI THẺ CHỈ SỐ --- */}
      {/* Displays 6 key metrics: Booked, Shipping, Delivered, Total, Active Branch, Revenue */}
      {/* Hiển thị 6 chỉ số chính: Đã đặt, Đang giao, Đã giao, Tổng cộng, Chi nhánh hoạt động, Doanh thu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? (
          <div className="col-span-6 flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#f97316]" />
          </div>
        ) : (
          [
            // Definition of metric cards data
            // Định nghĩa dữ liệu thẻ chỉ số
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
              label: "Total Shipments",
              value: stats?.totalCouriers?.toString() || "0",
              icon: Package,
              color: "text-indigo-500",
              bg: "bg-indigo-50",
              border: "border-indigo-100",
            },
            {
              label: "Active Branch",
              value: stats?.totalBranches?.toString() || "0",
              icon: Building2,
              color: "text-indigo-500",
              bg: "bg-indigo-50",
              border: "border-indigo-100",
            },
            {
              label: "Revenue",
              value: stats?.totalRevenue
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(stats.totalRevenue / 25000) // Conversion logic placeholder? / Chuyển đổi tiền tệ?
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

      {/* --- CHART ROW 1: Revenue & Branch Volume --- */}
      {/* --- HÀNG BIỂU ĐỒ 1: Doanh thu & Khối lượng chi nhánh --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Revenue Area Chart / Biểu đồ vùng doanh thu hàng tuần */}
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
                  {/* Định nghĩa gradient cho phần tô màu biểu đồ vùng */}
                  <linearGradient id="dashRev" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#dashRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Network Node Ranking Bar Chart (Vertical) / Biểu đồ cột xếp hạng điểm mạng lưới (Dọc) */}
        <div className="print-section bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm">
              <Building2 size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Network Node Ranking (Volume)
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(charts?.topBranches || []).map((item: any) => ({
                  ...item,
                  name: item.name.replace("Chi nhánh ", ""),
                }))}
                layout="vertical"
              >
                <CartesianGrid
                  {...CHART_GRID_STYLE}
                  vertical
                  horizontal={false}
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  {...CHART_AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar
                  dataKey="volume"
                  fill={BRAND_COLORS.primary}
                  radius={[0, 12, 12, 0]}
                  barSize={15}
                >
                  {/* Highlight top 3 nodes with primary color, others grey */}
                  {/* Làm nổi bật 3 điểm mạng lưới đầu bằng màu chính, còn lại màu xám */}
                  {(charts?.topBranches || []).map((_: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index < 3 ? BRAND_COLORS.primary : "#e2e8f0"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- CHART ROW 2: Delivery Trends & City Status --- */}
      {/* --- HÀNG BIỂU ĐỒ 2: Xu hướng giao hàng & Trạng thái thành phố --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success vs Fail Trend Line Chart / Biểu đồ đường xu hướng Thành công vs Thất bại */}
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

        {/* Stacked Bar Chart for City Metrics / Biểu đồ cột chồng cho chỉ số thành phố */}
        <div className="print-section bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shadow-sm">
              <Map size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              City Integrity Status
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                // Format city names before passing to chart
                // Định dạng tên thành phố trước khi truyền vào biểu đồ
                data={(charts?.citySuccessMetrics || []).map((item: any) => ({
                  ...item,
                  city: formatCityName(item.city),
                }))}
              >
                <CartesianGrid {...CHART_GRID_STYLE} />
                <XAxis
                  dataKey="city"
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
                  name="Successful"
                  dataKey="success"
                  fill={BRAND_COLORS.success}
                  stackId="city"
                  barSize={50}
                />
                <Bar
                  name="Cancelled"
                  dataKey="cancelled"
                  fill={BRAND_COLORS.danger}
                  stackId="city"
                  barSize={50}
                  radius={[12, 12, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- CHART ROW 3: Category Flows --- */}
      {/* --- HÀNG BIỂU ĐỒ 3: Dòng chảy danh mục --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-line chart for category trends / Biểu đồ đa đường cho xu hướng danh mục */}
        <div className="print-section bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm">
              <Box size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Global Category Flows
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
                {/* Render lines for each category with specific colors */}
                {/* Hiển thị các đường cho từng danh mục với màu sắc cụ thể */}
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
                  name="Stationery"
                  dataKey="stationery"
                  stroke={CATEGORY_COLORS[2]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  name="Electronics"
                  dataKey="electronics"
                  stroke={CATEGORY_COLORS[3]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  name="Fragile"
                  dataKey="fragile"
                  stroke={CATEGORY_COLORS[4]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  name="Furniture"
                  dataKey="furniture"
                  stroke={CATEGORY_COLORS[5]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  name="Construction"
                  dataKey="construction"
                  stroke={CATEGORY_COLORS[6]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  name="Vehicles"
                  dataKey="vehicles"
                  stroke={CATEGORY_COLORS[7]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  name="Moving"
                  dataKey="moving"
                  stroke={CATEGORY_COLORS[8]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grouped Bar Chart for Regional Mix / Biểu đồ cột nhóm cho hỗn hợp vùng */}
        <div className="print-section bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Regional Product Categories Flow
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.regionalProductMix || []} barGap={12}>
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
                  name="Stationery"
                  dataKey="stationery"
                  fill={CATEGORY_COLORS[2]}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  name="Electronics"
                  dataKey="electronics"
                  fill={CATEGORY_COLORS[3]}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  name="Fragile"
                  dataKey="fragile"
                  fill={CATEGORY_COLORS[4]}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  name="Furniture"
                  dataKey="furniture"
                  fill={CATEGORY_COLORS[5]}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  name="Construction"
                  dataKey="construction"
                  fill={CATEGORY_COLORS[6]}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  name="Vehicles"
                  dataKey="vehicles"
                  fill={CATEGORY_COLORS[7]}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  name="Moving"
                  dataKey="moving"
                  fill={CATEGORY_COLORS[8]}
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

export default AdminDashboard;
