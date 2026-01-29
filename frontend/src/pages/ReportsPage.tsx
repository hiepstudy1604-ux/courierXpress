import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Calendar,
  Map,
  TrendingUp,
  CheckCircle2,
  Truck,
  Building2,
  FileText,
  Box,
  PieChart as PieIcon,
  Activity,
  DollarSign,
  Bike,
  Zap,
  Loader2,
  XCircle,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { User, UserRole } from "../types";
import { ReportService } from "../services/api";

/**
 * ============================================================================
 * COMPONENT SUMMARY / TÓM TẮT COMPONENT
 * ============================================================================
 * Purpose:
 * This component renders the main Analytics/Reports Dashboard. It visualizes key
 * performance indicators (KPIs) such as delivery success rates, revenue, product
 * category trends, and fleet composition.
 *
 * Mục đích:
 * Component này hiển thị Bảng điều khiển Phân tích/Báo cáo chính. Nó trực quan hóa
 * các chỉ số hiệu suất chính (KPI) như tỷ lệ giao hàng thành công, doanh thu,
 * xu hướng danh mục sản phẩm và cơ cấu đội xe.
 *
 * Key Features / Tính năng chính:
 * 1. Data Visualization: Uses 'recharts' to render Line, Bar, Area, and Pie charts.
 * Trực quan hóa dữ liệu: Sử dụng 'recharts' để vẽ các biểu đồ Đường, Cột, Vùng và Tròn.
 * 2. Filtering: Allows filtering data by date range.
 * Lọc: Cho phép lọc dữ liệu theo khoảng thời gian.
 * 3. PDF Export: Capabilities to export the dashboard as a formatted PDF report.
 * Xuất PDF: Khả năng xuất bảng điều khiển dưới dạng báo cáo PDF được định dạng.
 * 4. Real-time Updates: Listens for socket/window events to refresh data.
 * Cập nhật thời gian thực: Lắng nghe các sự kiện socket/window để làm mới dữ liệu.
 */

// --- SHARED STYLING CONSTANTS / HẰNG SỐ KIỂU DÁNG DÙNG CHUNG ---
// Consistent styling for chart axes, grids, and tooltips across the dashboard.
// Kiểu dáng nhất quán cho các trục biểu đồ, lưới và chú giải công cụ trên toàn bộ bảng điều khiển.

const CHART_AXIS_STYLE = {
  fill: "#94a3b8",
  fontSize: 11,
  fontWeight: 600,
};

const CHART_GRID_STYLE = {
  stroke: "#f1f5f9",
  strokeDasharray: "3 3",
  vertical: false, // Only horizontal grid lines / Chỉ hiển thị đường lưới ngang
};

const CHART_TOOLTIP_STYLE = {
  borderRadius: "16px",
  border: "none",
  boxShadow:
    "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  fontSize: "12px",
  fontWeight: "600",
};

const BRAND_COLORS = {
  primary: "#f97316", // Orange
  secondary: "#6366f1", // Indigo
  success: "#10b981", // Emerald
  danger: "#ef4444", // Rose
  neutral: "#64748b", // Slate
  amber: "#f59e0b", // Amber
};

// Colors for categorical data (e.g., product types)
// Màu sắc cho dữ liệu phân loại (ví dụ: loại sản phẩm)
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

interface Props {
  user: User;
}

const ReportsPage: React.FC<Props> = ({ user }) => {
  // --- STATE MANAGEMENT / QUẢN LÝ TRẠNG THÁI ---

  // Default date range: Last 30 days
  // Khoảng thời gian mặc định: 30 ngày gần nhất
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Reference to the dashboard container for PDF generation
  // Tham chiếu đến container bảng điều khiển để tạo PDF
  const reportRef = useRef<HTMLDivElement>(null);

  // --- ROLE & PERMISSION LOGIC / LOGIC VAI TRÒ & QUYỀN ---
  const userRole = user?.role;
  const isAdmin = userRole === UserRole.ADMIN;
  const isAgent = userRole === UserRole.AGENT;
  const isCustomer = userRole === UserRole.CUSTOMER;
  const isBranchFocused = isAgent || isCustomer;

  // Handle different casing/naming of branch ID in user object
  // Xử lý các cách viết hoa/tên gọi khác nhau của ID chi nhánh trong đối tượng người dùng
  const userBranchId =
    (user as any)?.branch_id ?? (user as any)?.branchId ?? null;

  /**
   * Effect: Data Fetching & Validation
   * Purpose: Validates user permissions and fetches data when date range changes.
   * Mục đích: Xác thực quyền người dùng và lấy dữ liệu khi khoảng thời gian thay đổi.
   */
  useEffect(() => {
    if (!userRole) return;

    // Guard clause: Agents must belong to a branch to see reports.
    // Mệnh đề bảo vệ: Agent phải thuộc về một chi nhánh để xem báo cáo.
    if (isAgent && !userBranchId) {
      setReportData(null);
      setIsLoading(false);
      setError("Agent must be assigned to a branch");
      return;
    }

    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end, userRole, userBranchId]);

  /**
   * Effect: Real-time Updates
   * Purpose: Listen for "shipment:updated" event to refresh the report.
   * Logic: Uses debounce (setTimeout) to prevent flooding the API if multiple updates occur rapidly.
   * Mục đích: Lắng nghe sự kiện "shipment:updated" để làm mới báo cáo.
   * Logic: Sử dụng debounce (setTimeout) để ngăn chặn việc spam API nếu nhiều cập nhật xảy ra nhanh chóng.
   */
  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleRefetch = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        fetchReportData();
      }, 500); // Wait 500ms before fetching / Đợi 500ms trước khi lấy dữ liệu
    };

    const handleShipmentUpdated = () => {
      scheduleRefetch();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("shipment:updated", handleShipmentUpdated);
    }

    // Cleanup listeners
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (typeof window !== "undefined") {
        window.removeEventListener("shipment:updated", handleShipmentUpdated);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end, userRole, userBranchId]);

  /**
   * Function: fetchReportData
   * Purpose: Calls the backend API to retrieve aggregated report statistics.
   * Mục đích: Gọi API backend để lấy các thống kê báo cáo đã được tổng hợp.
   */
  const fetchReportData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ReportService.getReport({
        date_start: dateRange.start,
        date_end: dateRange.end,
      });

      if (response.data.success) {
        setReportData(response.data.data);
      } else {
        setError("Failed to load report data");
      }
    } catch (err: any) {
      console.error("Error fetching report data:", err);
      setError(err.response?.data?.message || "Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  // --- EXPORT SUPPORT FUNCTIONS / CÁC HÀM HỖ TRỢ XUẤT ---

  // Helper utility to pause execution
  // Tiện ích hỗ trợ để tạm dừng thực thi
  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Function: handleExportPDF
   * Purpose: Generates a high-quality PDF report of the current dashboard.
   * Complexity: High. It involves cloning the DOM to create a printer-friendly layout
   * without affecting the visible UI, then capturing it as an image.
   *
   * Mục đích: Tạo báo cáo PDF chất lượng cao của bảng điều khiển hiện tại.
   * Độ phức tạp: Cao. Nó liên quan đến việc sao chép (clone) DOM để tạo bố cục thân thiện với máy in
   * mà không ảnh hưởng đến giao diện người dùng hiển thị, sau đó chụp lại dưới dạng hình ảnh.
   */
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);

    try {
      // 1. Create a copy (Clone) of the report element
      // 1. Tạo bản sao (Clone) của phần tử báo cáo
      const originalElement = reportRef.current;
      const clonedElement = originalElement.cloneNode(true) as HTMLElement;

      // 2. Configure Clone Styling
      // Why: We set a fixed large width (1600px) to ensure charts render at high resolution.
      // We position it off-screen so the user doesn't see the flickering clone.
      // Tại sao: Chúng ta đặt chiều rộng cố định lớn (1600px) để đảm bảo biểu đồ hiển thị ở độ phân giải cao.
      // Chúng ta đặt nó ra ngoài màn hình để người dùng không thấy bản sao bị nhấp nháy.
      const CLONE_WIDTH = 1600;
      clonedElement.style.width = `${CLONE_WIDTH}px`;
      clonedElement.style.padding = "40px";
      clonedElement.style.background = "#ffffff";

      clonedElement.style.position = "absolute";
      clonedElement.style.top = "-10000px";
      clonedElement.style.left = "0px";
      clonedElement.style.zIndex = "-1000";

      document.body.appendChild(clonedElement);

      // 3. Layout Transformer (Responsiveness to Print Layout)
      // Why: Convert Grid layouts (side-by-side) to Column layouts (vertical) for A4 paper flow.
      // Tại sao: Chuyển đổi bố cục Grid (song song) thành bố cục Column (dọc) để phù hợp với luồng giấy A4.
      const gridContainers =
        clonedElement.querySelectorAll(".lg\\:grid-cols-2");
      gridContainers.forEach((grid) => {
        grid.classList.remove("grid", "grid-cols-1", "lg:grid-cols-2");
        (grid as HTMLElement).style.display = "flex";
        (grid as HTMLElement).style.flexDirection = "column";
        (grid as HTMLElement).style.gap = "60px";
        (grid as HTMLElement).style.width = "100%";
      });

      // Expand large charts to full width
      // Mở rộng các biểu đồ lớn ra toàn bộ chiều rộng
      const largeCharts = clonedElement.querySelectorAll(".lg\\:col-span-2");
      largeCharts.forEach((el) => {
        (el as HTMLElement).style.width = "100%";
        (el as HTMLElement).style.maxWidth = "none";
      });

      // Hide interactive elements like filters
      // Ẩn các phần tử tương tác như bộ lọc
      const filters = clonedElement.querySelectorAll(".report-filters-section");
      filters.forEach((el) => ((el as HTMLElement).style.display = "none"));

      // --- FIX: PIE CHART TEXT MISALIGNMENT ---
      // Problem: html2canvas sometimes miscalculates flexbox centering within SVG/absolute containers during cloning.
      // Solution: Manually enforce absolute centering styles on the cloned nodes.
      // Vấn đề: html2canvas đôi khi tính toán sai việc căn giữa flexbox trong các container SVG/absolute khi sao chép.
      // Giải pháp: Thủ công áp dụng các kiểu căn giữa tuyệt đối trên các node đã sao chép.
      const pieLabels = clonedElement.querySelectorAll(".pie-chart-label");
      pieLabels.forEach((el) => {
        const element = el as HTMLElement;
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.left = "0";
        element.style.width = "100%"; // Cover parent / Phủ kín cha
        element.style.height = "100%";
        element.style.display = "flex";
        element.style.flexDirection = "column";
        element.style.justifyContent = "center";
        element.style.alignItems = "center";
      });

      // 4. Wait for Recharts to redraw/resize
      // Why: Recharts are responsive. When we injected the clone with 1600px width,
      // they need a moment to recalculate their dimensions before we take the screenshot.
      // Tại sao: Recharts có tính phản hồi. Khi chúng ta chèn bản sao với chiều rộng 1600px,
      // chúng cần một chút thời gian để tính toán lại kích thước trước khi chụp màn hình.
      await wait(1500);

      // 5. Identify items to print (charts/sections)
      // Xác định các mục cần in (biểu đồ/các phần)
      const itemsToPrint = Array.from(
        clonedElement.querySelectorAll(".pdf-item"),
      );

      // 6. Initialize PDF document
      // Khởi tạo tài liệu PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;

      let currentY = margin;

      // Add Header Text
      // Thêm văn bản tiêu đề
      pdf.setFontSize(14);
      pdf.setTextColor(100);
      pdf.text(
        `Analytics Report: ${dateRange.start} - ${dateRange.end}`,
        margin,
        currentY,
      );
      currentY += 15;

      // 7. Loop through items and add to PDF
      // Lặp qua các mục và thêm vào PDF
      for (const item of itemsToPrint) {
        const element = item as HTMLElement;

        // Capture element as canvas
        // Chụp phần tử dưới dạng canvas
        const canvas = await html2canvas(element, {
          scale: 2, // 2x scale for retina-like quality / Tỉ lệ 2x cho chất lượng cao
          useCORS: true,
          backgroundColor: "#ffffff",
          width: CLONE_WIDTH,
          windowWidth: CLONE_WIDTH,
        });

        const imgData = canvas.toDataURL("image/png");
        // Calculate height maintaining aspect ratio
        // Tính toán chiều cao giữ nguyên tỷ lệ khung hình
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        // Check for Page Break logic
        // Kiểm tra logic ngắt trang
        if (currentY + imgHeight > pdfHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.addImage(imgData, "PNG", margin, currentY, contentWidth, imgHeight);
        currentY += imgHeight + 10;
      }

      // 8. Save file and Cleanup
      // Lưu file và dọn dẹp
      pdf.save(`Report_${dateRange.start}_to_${dateRange.end}.pdf`);
      document.body.removeChild(clonedElement);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- DATA MOCKUP / TRANSFORMATION / CHUYỂN ĐỔI DỮ LIỆU ---
  // Mapping API response fields to the specific structures required by Recharts components.
  // Ánh xạ các trường phản hồi API sang cấu trúc cụ thể được yêu cầu bởi các component Recharts.

  const overallSuccessData = Array.isArray(reportData?.charts?.donut)
    ? reportData.charts.donut
    : [
        { name: "Delivered", value: 0, color: BRAND_COLORS.success },
        { name: "Cancelled", value: 0, color: BRAND_COLORS.danger },
      ];

  const dailySuccessTrend = Array.isArray(reportData?.charts?.daily_trend)
    ? reportData.charts.daily_trend
    : [];

  const productCategoryTrends = Array.isArray(
    reportData?.charts?.product_category_trends,
  )
    ? reportData.charts.product_category_trends
    : [];

  const serviceTypeTrends = Array.isArray(
    reportData?.charts?.service_type_trends,
  )
    ? reportData.charts.service_type_trends
    : [];

  // City charts are mostly for Admins.
  // Các biểu đồ thành phố chủ yếu dành cho Admin.
  const citySuccessMetrics = Array.isArray(
    reportData?.charts?.city_success_metrics,
  )
    ? reportData.charts.city_success_metrics
    : [];

  const cityRevenueData = Array.isArray(reportData?.charts?.city_revenue)
    ? reportData.charts.city_revenue
    : [];

  const citySummaryData = cityRevenueData.map((item: any) => ({
    name: item?.name ?? "",
    orders: 0,
    value: Number(item?.value ?? 0),
  }));

  const cityMostTransported = Array.isArray(
    reportData?.charts?.product_category_by_region,
  )
    ? reportData.charts.product_category_by_region
    : [];

  // Transformation for Fleet Data
  // Logic: Aggregate counts by vehicle type and enforce a specific sorting order.
  // Logic: Tổng hợp số lượng theo loại xe và áp dụng thứ tự sắp xếp cụ thể.
  const totalFleetData = (() => {
    const raw = Array.isArray(reportData?.charts?.fleet_data)
      ? reportData.charts.fleet_data
      : [];

    const byType: Record<string, number> = {};
    for (const row of raw) {
      const type = String(row?.type ?? "").trim();
      if (!type) continue;
      const count = Number(row?.count ?? 0);
      const safeCount = Number.isFinite(count) ? count : 0;
      byType[type] = (byType[type] ?? 0) + safeCount;
    }

    // Preferred sort order
    const preferredOrder = [
      "Motorbike",
      "2.0t Truck",
      "3.5t Truck",
      "5.0t Truck",
    ];
    const ordered: any[] = [];

    // Add known types in order
    for (const type of preferredOrder) {
      if (Object.prototype.hasOwnProperty.call(byType, type)) {
        ordered.push({ type, count: byType[type] ?? 0 });
        delete byType[type];
      }
    }

    // Add remaining types
    for (const type of Object.keys(byType)) {
      ordered.push({ type, count: byType[type] });
    }

    return ordered;
  })();

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Header & Export Button / Header & Nút Xuất */}
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-6">
        <button
          onClick={handleExportPDF}
          disabled={isExporting || isLoading}
          className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl text-sm font-bold flex items-center shadow-sm hover:bg-slate-50 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileText size={18} className="mr-2" />
              Export PDF
            </>
          )}
        </button>
      </div>

      {/* --- REPORT AREA / KHU VỰC BÁO CÁO --- */}
      {/* This div is referenced by reportRef for PDF generation */}
      {/* Div này được tham chiếu bởi reportRef để tạo PDF */}
      <div ref={reportRef} id="report-printable-area" className="bg-white">
        
        {/* Filters Section / Phần Bộ lọc */}
        <section className="report-filters-section bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row items-end gap-6 mb-12">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">
                Period Start
              </label>
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange({ ...dateRange, start: e.target.value });
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all font-semibold text-slate-900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">
                Period End
              </label>
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange({ ...dateRange, end: e.target.value });
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all font-semibold text-slate-900"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Error State / Trạng thái lỗi */}
        {error && !isLoading && (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-20 flex flex-col items-center justify-center gap-4">
            <button
              onClick={fetchReportData}
              className="px-6 py-3 bg-[#f97316] text-white rounded-xl font-bold text-sm hover:bg-[#ea580c] transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content Render / Hiển thị Nội dung */}
        {!isLoading && !error && reportData && (
          <div
            key={`${dateRange.start}-${dateRange.end}`}
            className="space-y-12"
          >
            {/* SECTION 1: Time-series & General Stats */}
            <div className="space-y-6 break-inside-avoid">
              <div className="flex items-center gap-3 px-2">
                <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Time-series Performance
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Global delivery health tracking
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- CHART 1: PIE CHART (WITH LABEL FIX) --- */}
                {/* Displays Success vs Cancelled ratio */}
                {/* Hiển thị tỷ lệ Thành công vs Bị hủy */}
                <div className="pdf-item bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6 break-inside-avoid">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        Completion Integrity
                      </h3>
                      <p className="text-xs font-medium text-slate-400">
                        Successfully delivered vs cancelled ratio.
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                      <PieIcon size={20} />
                    </div>
                  </div>
                  <div className="h-[280px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={overallSuccessData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {overallSuccessData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke="none"
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          iconType="circle"
                          wrapperStyle={{ paddingTop: "20px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* ADD CLASS "pie-chart-label" HERE FOR JS DETECTION DURING PDF EXPORT */}
                    {/* THÊM CLASS "pie-chart-label" Ở ĐÂY ĐỂ JS NHẬN DIỆN KHI XUẤT PDF */}
                    <div className="pie-chart-label absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                      <span className="text-3xl font-black text-slate-900">
                        {overallSuccessData.length > 0 &&
                        overallSuccessData[0].value +
                          overallSuccessData[1].value >
                          0
                          ? (
                              (overallSuccessData[0].value /
                                (overallSuccessData[0].value +
                                  overallSuccessData[1].value)) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Healthy
                      </span>
                    </div>
                  </div>
                </div>

                {/* CHART 2: Line Chart for Daily Trends */}
                <div className="pdf-item bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6 break-inside-avoid">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        Daily Delivery Trend
                      </h3>
                      <p className="text-xs font-medium text-slate-400">
                        Volume fluctuation across the audit period.
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                      <Activity size={20} />
                    </div>
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailySuccessTrend}>
                        <CartesianGrid {...CHART_GRID_STYLE} />
                        <XAxis
                          dataKey="date"
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
                        <Legend
                          verticalAlign="top"
                          align="right"
                          iconType="circle"
                        />
                        <Line
                          name="Success"
                          type="monotone"
                          dataKey="success"
                          stroke={BRAND_COLORS.success}
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          name="Failed"
                          type="monotone"
                          dataKey="failed"
                          stroke={BRAND_COLORS.danger}
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CHART 3: Line Chart for Categories */}
                <div className="pdf-item bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6 break-inside-avoid">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        Global Category Flows
                      </h3>
                      <p className="text-xs font-medium text-slate-400">
                        Operational focus across core product lines.
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <Box size={20} />
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={productCategoryTrends}>
                        <CartesianGrid {...CHART_GRID_STYLE} />
                        <XAxis
                          dataKey="date"
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
                        <Legend
                          verticalAlign="top"
                          height={100}
                          wrapperStyle={{ fontSize: "9px", fontWeight: "bold" }}
                        />
                        {/* Rendering multiple lines for each category */}
                        <Line
                          name="Fashion"
                          type="monotone"
                          dataKey="fashion"
                          stroke={CATEGORY_COLORS[0]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          name="Food"
                          type="monotone"
                          dataKey="food"
                          stroke={CATEGORY_COLORS[1]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          name="Stationery"
                          type="monotone"
                          dataKey="stationery"
                          stroke={CATEGORY_COLORS[2]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          name="Electronics"
                          type="monotone"
                          dataKey="electronics"
                          stroke={CATEGORY_COLORS[3]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          name="Fragile"
                          type="monotone"
                          dataKey="fragile"
                          stroke={CATEGORY_COLORS[4]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          name="Furniture"
                          type="monotone"
                          dataKey="furniture"
                          stroke={CATEGORY_COLORS[5]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          name="Construction"
                          type="monotone"
                          dataKey="construction"
                          stroke={CATEGORY_COLORS[6]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          name="Vehicles"
                          type="monotone"
                          dataKey="vehicles"
                          stroke={CATEGORY_COLORS[7]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          name="Moving"
                          type="monotone"
                          dataKey="moving"
                          stroke={CATEGORY_COLORS[8]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CHART 4: Area Chart for Service Type */}
                <div className="pdf-item bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6 break-inside-avoid">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        Service Mix Allocation
                      </h3>
                      <p className="text-xs font-medium text-slate-400">
                        Express vs Standard volume saturation.
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                      <Zap size={20} />
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={serviceTypeTrends}>
                        <defs>
                          <linearGradient
                            id="colorStd"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={BRAND_COLORS.neutral}
                              stopOpacity={0.1}
                            />
                            <stop
                              offset="95%"
                              stopColor={BRAND_COLORS.neutral}
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorExp"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={BRAND_COLORS.primary}
                              stopOpacity={0.1}
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
                          dataKey="date"
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
                        <Area
                          type="monotone"
                          dataKey="standard"
                          stroke={BRAND_COLORS.neutral}
                          fillOpacity={1}
                          fill="url(#colorStd)"
                          strokeWidth={3}
                          name="Standard"
                        />
                        <Area
                          type="monotone"
                          dataKey="express"
                          stroke={BRAND_COLORS.primary}
                          fillOpacity={1}
                          fill="url(#colorExp)"
                          strokeWidth={3}
                          name="Express"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 mx-4" />

            {/* SECTION 2: Regional/Branch specific (Admin Only) */}
            <div className="space-y-6 break-inside-avoid">
              <div className="flex items-center gap-3 px-2">
                <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg">
                  <Map size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Regional Comparative Audit
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Performance breakdown for major hubs
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Admin-only charts for city comparison */}
                {isAdmin && (
                  <>
                    <div className="pdf-item bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8 break-inside-avoid">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-black text-slate-900">
                            Operational Integrity by City
                          </h3>
                          <p className="text-sm font-medium text-slate-400">
                            Success vs Cancelled deliveries - Stacked View.
                          </p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                          <CheckCircle2 size={24} />
                        </div>
                      </div>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={citySuccessMetrics}>
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
                              cursor={{ fill: "#f8fafc" }}
                              contentStyle={CHART_TOOLTIP_STYLE}
                            />
                            <Legend iconType="circle" />
                            <Bar
                              dataKey="success"
                              fill={BRAND_COLORS.success}
                              stackId="city"
                              name="Successful"
                              barSize={50}
                              radius={[0, 0, 0, 0]}
                            />
                            <Bar
                              dataKey="cancelled"
                              fill={BRAND_COLORS.danger}
                              stackId="city"
                              radius={[10, 10, 0, 0]}
                              name="Cancelled"
                              barSize={50}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="pdf-item bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8 break-inside-avoid">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-black text-slate-900">
                            Hub Market Value
                          </h3>
                          <p className="text-sm font-medium text-slate-400">
                            Total revenue value Comparison across cities ($).
                          </p>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                          <DollarSign size={24} />
                        </div>
                      </div>
                      <div className="h-[300px]">
                        {citySummaryData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={citySummaryData}>
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
                                cursor={{ fill: "#f8fafc" }}
                                contentStyle={CHART_TOOLTIP_STYLE}
                                formatter={(value: number) =>
                                  `$${value.toLocaleString()}`
                                }
                              />
                              <Bar
                                dataKey="value"
                                fill={BRAND_COLORS.amber}
                                radius={[10, 10, 0, 0]}
                                name="Total Value ($)"
                                barSize={60}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-400">
                            No data available
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Regional Products Flow - Visible to all but data scoped by backend */}
                <div
                  className={`pdf-item bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8 ${isAdmin ? "lg:col-span-2" : "lg:col-span-2"} break-inside-avoid`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        Regional Product Categories Flow
                      </h3>
                      <p className="text-sm font-medium text-slate-400">
                        Comprehensive breakdown of product categories across
                        major hubs.
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                      <Box size={24} />
                    </div>
                  </div>
                  <div className="h-[450px]">
                    {cityMostTransported.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cityMostTransported} barGap={4}>
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
                            cursor={{ fill: "#f8fafc" }}
                            contentStyle={CHART_TOOLTIP_STYLE}
                          />
                          <Legend
                            wrapperStyle={{
                              paddingTop: "20px",
                              fontSize: "11px",
                              fontWeight: "bold",
                            }}
                          />
                          <Bar
                            dataKey="fashion"
                            fill={CATEGORY_COLORS[0]}
                            radius={[4, 4, 0, 0]}
                            name="Fashion"
                          />
                          <Bar
                            dataKey="food"
                            fill={CATEGORY_COLORS[1]}
                            radius={[4, 4, 0, 0]}
                            name="Food"
                          />
                          <Bar
                            dataKey="stationery"
                            fill={CATEGORY_COLORS[2]}
                            radius={[4, 4, 0, 0]}
                            name="Office"
                          />
                          <Bar
                            dataKey="electronics"
                            fill={CATEGORY_COLORS[3]}
                            radius={[4, 4, 0, 0]}
                            name="Electronics"
                          />
                          <Bar
                            dataKey="fragile"
                            fill={CATEGORY_COLORS[4]}
                            radius={[4, 4, 0, 0]}
                            name="Fragile"
                          />
                          <Bar
                            dataKey="furniture"
                            fill={CATEGORY_COLORS[5]}
                            radius={[4, 4, 0, 0]}
                            name="Furniture"
                          />
                          <Bar
                            dataKey="construction"
                            fill={CATEGORY_COLORS[6]}
                            radius={[4, 4, 0, 0]}
                            name="Construction"
                          />
                          <Bar
                            dataKey="vehicles"
                            fill={CATEGORY_COLORS[7]}
                            radius={[4, 4, 0, 0]}
                            name="Vehicles"
                          />
                          <Bar
                            dataKey="moving"
                            fill={CATEGORY_COLORS[8]}
                            radius={[4, 4, 0, 0]}
                            name="Personal"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">
                        No data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 mx-4" />

            {/* SECTION 3: Fleet Efficiency */}
            <div className="space-y-6 break-inside-avoid">
              <div className="flex items-center gap-3 px-2">
                <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Branch Efficiency Hub
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Network-wide node performance audit
                  </p>
                </div>
              </div>

              <div className="pdf-item bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm space-y-10 break-inside-avoid">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">
                      Global Fleet Integrity & Composition
                    </h3>
                    <p className="text-sm font-medium text-slate-400">
                      Asset distribution audit for all locations.
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                    <Truck size={28} />
                  </div>
                </div>
                <div className="h-[350px]">
                  {totalFleetData && totalFleetData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={totalFleetData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid {...CHART_GRID_STYLE} />
                        <XAxis
                          dataKey="type"
                          {...CHART_AXIS_STYLE}
                          axisLine={false}
                          tickLine={false}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          {...CHART_AXIS_STYLE}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "#f8fafc" }}
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(value: number) => [
                            `${value} units`,
                            "Count",
                          ]}
                        />
                        <Bar
                          dataKey="count"
                          radius={[12, 12, 0, 0]}
                          name="Vehicle Units"
                          barSize={80}
                        >
                          {totalFleetData.map((entry: any, index: number) => {
                            const colors = [
                              BRAND_COLORS.secondary,
                              BRAND_COLORS.primary,
                              BRAND_COLORS.amber,
                              BRAND_COLORS.success,
                            ];
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={colors[index % colors.length]}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      No fleet data available
                    </div>
                  )}
                </div>
                {/* Fleet Cards Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                  {totalFleetData && totalFleetData.length > 0 ? (
                    totalFleetData.map((v: any, i: number) => (
                      <div
                        key={i}
                        className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex flex-col items-center gap-3 hover:bg-white hover:shadow-xl hover:border-orange-200 transition-all group"
                      >
                        <div
                          className={`p-4 rounded-2xl bg-white shadow-sm transition-transform group-hover:scale-110 ${v.type === "Motorbike" ? "text-indigo-500" : "text-[#f97316]"}`}
                        >
                          {v.type === "Motorbike" ? (
                            <Bike size={28} />
                          ) : (
                            <Truck size={28} />
                          )}
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">
                          {v.type}
                        </span>
                        <span className="text-3xl font-black text-slate-900">
                          {v.count || 0}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center text-slate-400 py-8">
                      No fleet data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;