import React, { useEffect, useState } from "react";
import { Customer } from "../types";
import {
  Search,
  Filter,
  Eye,
  Copy,
  ClipboardCheck,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Phone,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Hash,
  User,
  Globe,
  ShoppingBag,
  Package,
  MailCheck,
  PhoneCall,
  MapPinned,
  Loader2,
  MapPin,
  UserCircle,
  Ban,
  Unlock,
  AlertTriangle,
  UserSquare,
  CircleDollarSign,
} from "lucide-react";
import { CustomerService, ShipmentService } from "../services/api";

/**
 * ============================================================================
 * COMPONENT SUMMARY / TÓM TẮT COMPONENT
 * ============================================================================
 * Purpose:
 * This component provides a comprehensive interface for managing customers within
 * the logistics system. It handles the full lifecycle of customer administration.
 * * Mục đích:
 * Component này cung cấp giao diện toàn diện để quản lý khách hàng trong hệ thống
 * logistics. Nó xử lý trọn vẹn vòng đời quản trị khách hàng.
 *
 * Key Features / Các tính năng chính:
 * 1. Data Grid: Displays a paginated list of customers with status indicators.
 * Lưới dữ liệu: Hiển thị danh sách khách hàng phân trang với chỉ báo trạng thái.
 * 2. Client-side Filtering: robust filtering by Name, ID, Phone, City, etc.
 * Lọc phía Client: Bộ lọc mạnh mẽ theo Tên, ID, Số điện thoại, Thành phố, v.v.
 * 3. Detail Views: Modals for viewing Customer Profiles and specific Shipment Details.
 * Xem chi tiết: Các modal để xem Hồ sơ khách hàng và Chi tiết vận đơn cụ thể.
 * 4. CRUD Actions: Edit customer info and Toggle status (Block/Activate) with safety confirmations.
 * Hành động CRUD: Chỉnh sửa thông tin và Chuyển đổi trạng thái (Chặn/Kích hoạt) với xác nhận an toàn.
 */

// --- TYPES & INTERFACES / CÁC KIỂU DỮ LIỆU ---

// Extends the base Customer type to include computed statistics and status.
// Mở rộng kiểu Customer cơ bản để bao gồm các thống kê được tính toán và trạng thái.
interface ExtendedCustomer extends Customer {
  status: "Active" | "Blocked";
  successDeliveries: number;
  failedDeliveries: number;
}

interface Shipment {
  id: string;
  trackingId: string;
  status: string;
  createdDate: string;
}

// Detailed view of a customer, including their shipment history list.
// Chế độ xem chi tiết của khách hàng, bao gồm danh sách lịch sử vận đơn của họ.
interface CustomerDetail extends ExtendedCustomer {
  shipments: Shipment[];
}

// --- NEW: Interface for shipment details (based on ShipmentController@formatShipment) ---
// Defines the structure for the detailed shipment modal.
// Định nghĩa cấu trúc cho modal chi tiết vận đơn.
interface ShipmentDetailType {
  id: string;
  trackingId: string;
  sender: { name: string; phone: string; address: string };
  receiver: { name: string; phone: string; address: string };
  details: { type: string; weight: string; dimensions: string };
  pricing: { baseCharge: number; tax: number; total: number };
  status: string;
  bookingDate: string;
  eta: string | null;
  agentId: string | null;
  branchId: string | null;
  serviceType: string;
  vehicleType: string | null;
  pickupWindow: { start: string | null; end: string | null } | null;
  actualWeight: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
}

const CustomerManagement: React.FC = () => {
  // --- UI & DATA MANAGEMENT STATE / TRẠNG THÁI UI & QUẢN LÝ DỮ LIỆU ---

  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerDetail | null>(null);

  // --- NEW: State for Action Confirmation Modal ---
  // Stores the pending action to be confirmed by the user before execution.
  // Lưu trữ hành động đang chờ người dùng xác nhận trước khi thực hiện.
  const [confirmAction, setConfirmAction] = useState<{
    customer: ExtendedCustomer;
    newStatus: "Active" | "Blocked";
  } | null>(null);

  // --- NEW: State for Shipment Details Modal ---
  const [selectedShipment, setSelectedShipment] =
    useState<ShipmentDetailType | null>(null);

  // Tracks which specific shipment ID is loading to show a spinner inline.
  // Theo dõi ID vận đơn cụ thể nào đang tải để hiển thị vòng quay (spinner) tại dòng đó.
  const [loadingShipmentId, setLoadingShipmentId] = useState<string | null>(
    null,
  );

  // Filter State / Trạng thái bộ lọc
  const [filters, setFilters] = useState({
    name: "",
    phone: "",
    customerId: "",
    city: "",
    email: "",
    status: "",
  });

  // Data State (Master Data vs Display Data)
  // 'allCustomers' holds the raw data from API, 'customers' holds the filtered result.
  // 'allCustomers' chứa dữ liệu thô từ API, 'customers' chứa kết quả đã lọc.
  const [allCustomers, setAllCustomers] = useState<ExtendedCustomer[]>([]); // Original Data
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([]); // Display Data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Loading state for Status button / Trạng thái tải cho nút Trạng thái
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  // --- EFFECTS / CÁC EFFECT ---

  // 1. Fetch data on component mount
  // 1. Lấy dữ liệu khi component được gắn vào (mount)
  useEffect(() => {
    fetchCustomers();
  }, []);

  // 2. Handle Filter Logic (Client-side)
  // 2. Xử lý Logic Lọc (Phía Client)
  /**
   * Explanation:
   * Instead of calling the API on every keystroke, we filter the `allCustomers` array locally.
   * This provides instant feedback to the user and reduces server load.
   * * Giải thích:
   * Thay vì gọi API mỗi khi gõ phím, chúng ta lọc mảng `allCustomers` ngay tại cục bộ.
   * Điều này cung cấp phản hồi tức thì cho người dùng và giảm tải cho máy chủ.
   */
  useEffect(() => {
    if (allCustomers.length === 0) return;

    // Normalize input data for case-insensitive comparison
    // Chuẩn hóa dữ liệu đầu vào để so sánh không phân biệt hoa thường
    const lowerName = filters.name.toLowerCase().trim();
    const lowerEmail = filters.email.toLowerCase().trim();
    const lowerId = filters.customerId.toLowerCase().trim();
    const lowerCity = filters.city.toLowerCase().trim();
    const cleanFilterPhone = filters.phone.replace(/\D/g, ""); // Keep only numbers / Chỉ giữ lại số

    const filtered = allCustomers.filter((c) => {
      // Safe null/undefined check before calling methods like toLowerCase()
      // Kiểm tra an toàn null/undefined trước khi gọi các phương thức như toLowerCase()
      const matchName = c.name
        ? c.name.toLowerCase().includes(lowerName)
        : false;
      const matchEmail = c.email
        ? c.email.toLowerCase().includes(lowerEmail)
        : false;
      const matchId = c.id ? c.id.toLowerCase().includes(lowerId) : false;

      const matchCity = filters.city
        ? c.city
          ? c.city.toLowerCase().includes(lowerCity)
          : false
        : true;

      // Phone comparison logic: compare stripped digits
      // Logic so sánh số điện thoại: so sánh các chữ số đã được tách lọc
      const matchPhone = (() => {
        if (!cleanFilterPhone) return true;
        const cleanCustomerPhone = (c.phone || "")
          .toString()
          .replace(/\D/g, "");
        return cleanCustomerPhone.includes(cleanFilterPhone);
      })();

      const matchStatus = filters.status ? c.status === filters.status : true;

      return (
        matchName &&
        matchEmail &&
        matchId &&
        matchPhone &&
        matchCity &&
        matchStatus
      );
    });

    setCustomers(filtered);
    setCurrentPage(1); // Reset to page 1 when filter changes / Đặt lại về trang 1 khi bộ lọc thay đổi
  }, [filters, allCustomers]);

  // --- FUNCTIONS / CÁC HÀM CHỨC NĂNG ---

  /**
   * Fetches all customers from the API and transforms the data for the UI.
   * Lấy tất cả khách hàng từ API và chuyển đổi dữ liệu cho giao diện người dùng.
   * * Process:
   * 1. Request large dataset (per_page: 1000) for client-side sorting.
   * 2. Calculate Total Orders based on success + failed deliveries.
   * 3. Normalize status strings.
   */
  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get ALL data to handle client-side filtering
      const response = await CustomerService.getAll({
        per_page: 1000,
      });

      if (response.data.success) {
        const transformedData = (response.data.data || []).map(
          (customer: any) => {
            const success = customer.successDeliveries || 0;
            const failed = customer.failedDeliveries || 0;

            return {
              id: customer.id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone || "N/A",
              address: customer.address || "N/A",
              city: customer.city || "N/A",
              // Recalculate Total Orders to ensure accuracy
              // Tính toán lại Tổng đơn hàng để đảm bảo độ chính xác
              totalOrders: success + failed,
              successDeliveries: success,
              failedDeliveries: failed,
              status: customer.status === "Active" ? "Active" : "Blocked",
            };
          },
        );
        setAllCustomers(transformedData);
        setCustomers(transformedData);
      } else {
        setError("Failed to load customers");
      }
    } catch (err: any) {
      console.error("Error fetching customers:", err);
      setError(err.response?.data?.message || "Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetches detailed profile information for a specific customer.
   * Lấy thông tin hồ sơ chi tiết cho một khách hàng cụ thể.
   * * @param {string} customerId - The ID of the customer to view.
   */
  const handleViewDetails = async (customerId: string) => {
    try {
      const response = await CustomerService.getById(customerId);
      if (response.data.success) {
        const data = response.data.data;
        const success = data.successDeliveries || 0;
        const failed = data.failedDeliveries || 0;

        setSelectedCustomer({
          ...data,
          successDeliveries: success,
          failedDeliveries: failed,
          totalOrders: success + failed, // Recalculate Total / Tính lại Tổng
          shipments: data.shipments || [],
        });
      }
    } catch (err: any) {
      console.error("Error fetching customer details:", err);
      alert(err.response?.data?.message || "Failed to load customer details");
    }
  };

  /**
   * Fetches and displays details for a specific shipment from the customer's history.
   * Lấy và hiển thị chi tiết cho một vận đơn cụ thể từ lịch sử của khách hàng.
   * * @param {string} shipmentId - The ID of the shipment.
   */
  const handleViewShipmentDetails = async (shipmentId: string) => {
    if (!selectedCustomer) return;

    setLoadingShipmentId(shipmentId);

    try {
      // Assuming ShipmentService is added to services/api.ts to call GET /api/shipments/{id}
      // Giả định ShipmentService đã được thêm vào services/api.ts để gọi GET /api/shipments/{id}
      const response = await ShipmentService.getById(shipmentId);

      if (response.data.success) {
        const shipmentData: ShipmentDetailType = response.data.data;

        // REQUIREMENT: The sender in shipment details must be the customer currently being viewed.
        // YÊU CẦU: Người gửi trong chi tiết vận đơn phải là khách hàng đang được xem.
        // Override sender info with selected customer info to ensure consistency on the interface.
        // Ghi đè thông tin người gửi bằng thông tin khách hàng đã chọn để đảm bảo tính nhất quán trên giao diện.
        shipmentData.sender = {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          address: selectedCustomer.address,
        };

        setSelectedShipment(shipmentData);
      } else {
        const errorMsg = "Failed to load shipment details.";
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error("Error fetching shipment details:", err);
      const errorMsg =
        err.response?.data?.message || "Failed to load shipment details.";
      alert(errorMsg);
    } finally {
      setLoadingShipmentId(null);
    }
  };

  // --- NEW: FUNCTION TO OPEN CONFIRMATION MODAL ---
  /**
   * Prepares the confirmation modal for blocking/activating a user.
   * Chuẩn bị modal xác nhận cho việc chặn/kích hoạt người dùng.
   */
  const handleToggleStatus = (customer: ExtendedCustomer) => {
    const newStatus = customer.status === "Active" ? "Blocked" : "Active";
    setConfirmAction({ customer, newStatus });
  };

  // --- NEW: FUNCTION TO EXECUTE API CALL (ATTACHED TO CONFIRM BUTTON) ---
  /**
   * Executes the status change after user confirmation.
   * Thực hiện thay đổi trạng thái sau khi người dùng xác nhận.
   */
  const executeStatusChange = async () => {
    if (!confirmAction) return;
    const { customer, newStatus } = confirmAction;

    // Close confirm modal for smoother UX (or keep it to show loading if desired)
    // Đóng modal xác nhận để trải nghiệm mượt mà hơn (hoặc giữ lại để hiển thị đang tải nếu muốn)
    setConfirmAction(null);
    setStatusLoadingId(customer.id);

    try {
      const response = await CustomerService.update(customer.id, {
        status: newStatus,
      });

      if (response.data.success) {
        // Update local state immediately
        // Cập nhật trạng thái cục bộ ngay lập tức
        setAllCustomers((prev) =>
          prev.map((c) =>
            c.id === customer.id ? { ...c, status: newStatus } : c,
          ),
        );
      } else {
        alert("Failed to update status");
      }
    } catch (err: any) {
      console.error("Error updating status:", err);
      alert(err.response?.data?.message || "Failed to update status");
    } finally {
      setStatusLoadingId(null);
    }
  };

  // Utility to copy customer ID to clipboard
  // Tiện ích để sao chép ID khách hàng vào clipboard
  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Resets all filters to default empty values
  // Đặt lại tất cả các bộ lọc về giá trị rỗng mặc định
  const resetFilters = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFilters({
      name: "",
      phone: "",
      customerId: "",
      email: "",
      city: "",
      status: "",
    });
  };

  // Pagination Logic / Logic Phân trang
  const itemsPerPage = 10;
  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const paginatedData = customers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* FILTER SECTION / PHẦN BỘ LỌC */}
      <section className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div className="p-4 px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter
              size={16}
              className="text-slate-400 group-hover:text-slate-600 transition-colors"
            />
            <span className="font-bold text-slate-700 text-sm uppercase tracking-wider">
              Filters
            </span>
            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform duration-300 ${
                showFilters ? "rotate-180" : ""
              }`}
            />
          </div>

          {showFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-2 text-slate-400 hover:text-[#f97316] text-xs font-bold transition-all px-3 py-1.5 hover:bg-orange-50 rounded-lg group"
              title="Reset Filters"
            >
              <RotateCcw
                size={14}
                className="group-active:rotate-180 transition-transform"
              />
              Reset All
            </button>
          )}
        </div>

        {showFilters && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 animate-in slide-in-from-top-2 duration-200">
            {/* Customer ID Filter / Bộ lọc ID Khách hàng */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">
                Customer ID
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  type="text"
                  placeholder="KH-1234..."
                  value={filters.customerId}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleanValue = value.replace(/[^a-zA-Z0-9-]/g, "");
                    setFilters({ ...filters, customerId: cleanValue });
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* Name Filter / Bộ lọc Tên */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">
                Name
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  type="text"
                  placeholder="Search Name..."
                  value={filters.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Sanitize input to remove special characters
                    // Làm sạch đầu vào để loại bỏ các ký tự đặc biệt
                    const cleanValue = value.replace(
                      /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g,
                      "",
                    );
                    setFilters({ ...filters, name: cleanValue });
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* Email Filter / Bộ lọc Email */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">
                Email
              </label>
              <div className="relative">
                <MailCheck
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  type="text"
                  placeholder="example@gmail.com..."
                  value={filters.email}
                  onChange={(e) =>
                    setFilters({ ...filters, email: e.target.value })
                  }
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* Phone Filter / Bộ lọc Số điện thoại */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  type="text"
                  placeholder="Search Phone..."
                  value={filters.phone}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numeric input
                    // Chỉ cho phép nhập số
                    if (value === "" || /^[0-9]+$/.test(value)) {
                      setFilters({ ...filters, phone: value });
                    }
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* City Filter / Bộ lọc Thành phố */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">
                City
              </label>
              <div className="relative">
                <MapPin
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  type="text"
                  placeholder="Search City..."
                  value={filters.city}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleanValue = value.replace(
                      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g,
                      "",
                    );
                    setFilters({ ...filters, city: cleanValue });
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* Status Filter / Bộ lọc Trạng thái */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">
                Status
              </label>
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  title="Status"
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900 appearance-none"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Blocked">Blocked</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* TABLE SECTION / PHẦN BẢNG */}
      <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1600px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight">
                  <div className="flex items-center gap-1.5">
                    <Hash size={14} /> ID
                  </div>
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight">
                  <div className="flex items-center gap-1.5">
                    <User size={14} /> Full Name
                  </div>
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight">
                  <div className="flex items-center gap-1.5">
                    <MailCheck size={14} /> Email Address
                  </div>
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight">
                  <div className="flex items-center gap-1.5">
                    <PhoneCall size={14} /> Phone
                  </div>
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight">
                  <div className="flex items-center gap-1.5">
                    <Globe size={14} /> City
                  </div>
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight">
                  <div className="flex items-center gap-1.5">
                    <MapPinned size={14} /> Street Address
                  </div>
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <ShoppingBag size={14} /> Orders
                  </div>
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={14} /> Success
                  </div>
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <XCircle size={14} /> Failed
                  </div>
                </th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight">
                  Status
                </th>
                <th className="pr-6 py-4 text-xs font-bold text-slate-500 tracking-tight text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Handling Loading and Error States / Xử lý trạng thái Tải và Lỗi */}
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2
                        size={32}
                        className="animate-spin text-[#f97316]"
                      />
                      <p className="text-sm font-semibold text-slate-500">
                        Loading customers...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={11} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <XCircle size={32} className="text-rose-500" />
                      <p className="text-sm font-semibold text-slate-700">
                        {error}
                      </p>
                      <button
                        type="button"
                        onClick={() => fetchCustomers()}
                        className="px-4 py-2 bg-[#f97316] text-white rounded-lg font-bold text-sm hover:bg-[#ea580c] transition-all"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-20 text-center">
                    <p className="text-sm font-semibold text-slate-500">
                      No customers found
                    </p>
                  </td>
                </tr>
              ) : (
                // Mapping Data to Rows / Ánh xạ dữ liệu vào các hàng
                paginatedData.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 leading-none">
                          {c.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.id)}
                          className="p-1.5 text-slate-300 hover:text-orange-600 transition-all hover:bg-orange-50 rounded-lg opacity-0 group-hover:opacity-100"
                          title="Copy customer ID"
                        >
                          {copiedId === c.id ? (
                            <ClipboardCheck
                              size={14}
                              className="text-emerald-500"
                            />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-sm font-bold text-slate-900 leading-none whitespace-nowrap">
                        {c.name}
                      </p>
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-sm font-medium text-slate-600 truncate max-w-[180px]">
                        {c.email}
                      </p>
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {c.phone}
                      </p>
                    </td>
                    <td className="px-4 py-5">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/50">
                        {c.city}
                      </span>
                    </td>
                    <td className="px-4 py-5 max-w-[240px]">
                      <p
                        className="text-xs text-slate-500 font-medium truncate"
                        title={c.address}
                      >
                        {c.address}
                      </p>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <p className="text-sm font-black text-slate-900">
                        {c.totalOrders}
                      </p>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="inline-flex items-center gap-1 text-emerald-600 font-black text-xs bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                        {c.successDeliveries}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="inline-flex items-center gap-1 text-rose-500 font-black text-xs bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-100">
                        {c.failedDeliveries}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${
                          c.status === "Active"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-rose-50 text-rose-600 border-rose-100"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="pr-6 py-5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {/* Button Toggle Status / Nút Chuyển đổi trạng thái */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c)}
                          disabled={statusLoadingId === c.id}
                          className={`p-2 transition-all rounded-xl border shadow-sm ${
                            c.status === "Active"
                              ? "text-rose-500 hover:bg-rose-50 hover:border-rose-200 border-transparent"
                              : "text-emerald-500 hover:bg-emerald-50 hover:border-emerald-200 border-transparent"
                          } disabled:opacity-50`}
                          title={
                            c.status === "Active"
                              ? "Block Account"
                              : "Activate Account"
                          }
                        >
                          {statusLoadingId === c.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : c.status === "Active" ? (
                            <Ban size={18} />
                          ) : (
                            <Unlock size={18} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleViewDetails(c.id)}
                          className="p-2 text-slate-400 hover:text-orange-600 transition-all hover:bg-orange-50 rounded-xl border border-transparent hover:border-orange-100 shadow-sm"
                          title="View Detail"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION / PHÂN TRANG */}
        <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
          <p className="text-xs font-bold text-slate-500">
            Showing{" "}
            <span className="text-slate-900 font-black">
              {Math.min(customers.length, (currentPage - 1) * itemsPerPage + 1)}
              -{Math.min(customers.length, currentPage * itemsPerPage)}
            </span>{" "}
            of{" "}
            <span className="text-slate-900 font-black">
              {customers.length}
            </span>{" "}
            customers
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="p-2.5 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 transition-all shadow-sm bg-white text-slate-600"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all border ${
                    currentPage === i + 1
                      ? "bg-slate-900 text-white shadow-lg border-slate-900"
                      : "bg-white text-slate-400 border-slate-200 hover:text-slate-900 hover:border-slate-400"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              className="p-2.5 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 transition-all shadow-sm bg-white text-slate-600"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* MODAL: Customer Details / MODAL: Chi tiết Khách hàng */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedCustomer(null)}
          ></div>
          <div className="relative bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            <div className="p-8 pb-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center border border-orange-100">
                  <UserCircle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Customer Details
                  </h3>
                  <p className="text-[10px] font-black text-orange-600 tracking-widest uppercase">
                    {selectedCustomer.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 scrollbar-hide">
              {/* Customer Info / Thông tin Khách hàng */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">
                    Full Name
                  </label>
                  <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100">
                    <p className="text-sm font-black text-slate-700">
                      {selectedCustomer.name}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">
                    Email
                  </label>
                  <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100">
                    <p className="text-sm font-black text-slate-700">
                      {selectedCustomer.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">
                    Phone
                  </label>
                  <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100">
                    <p className="text-sm font-black text-slate-700">
                      {selectedCustomer.phone}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">
                    City
                  </label>
                  <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100">
                    <p className="text-sm font-black text-slate-700">
                      {selectedCustomer.city}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">
                  Address
                </label>
                <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100">
                  <p className="text-sm font-black text-slate-700">
                    {selectedCustomer.address}
                  </p>
                </div>
              </div>

              {/* Statistics / Thống kê */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-500 mb-1">
                    Total Orders
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {selectedCustomer.totalOrders}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-500 mb-1">
                    Success
                  </p>
                  <p className="text-2xl font-black text-emerald-600">
                    {selectedCustomer.successDeliveries}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-500 mb-1">
                    Failed
                  </p>
                  <p className="text-2xl font-black text-rose-600">
                    {selectedCustomer.failedDeliveries}
                  </p>
                </div>
              </div>

              {/* Shipment History / Lịch sử Vận đơn */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-2">
                  <Package size={16} /> Shipment History
                </label>
                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                  {selectedCustomer.shipments &&
                  selectedCustomer.shipments.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {selectedCustomer.shipments.map((shipment) => (
                        <div
                          key={shipment.id}
                          className="p-4 flex items-center justify-between hover:bg-white transition-colors cursor-pointer group/shipment"
                          onClick={() => handleViewShipmentDetails(shipment.id)}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-black text-slate-900">
                              {shipment.trackingId}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(
                                shipment.createdDate,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                shipment.status === "DELIVERED" ||
                                shipment.status === "DELIVERED_SUCCESS"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : shipment.status === "CANCELLED" ||
                                      shipment.status === "DELIVERY_FAILED"
                                    ? "bg-rose-50 text-rose-600"
                                    : "bg-orange-50 text-orange-600"
                              }`}
                            >
                              {shipment.status}
                            </span>
                            {loadingShipmentId === shipment.id ? (
                              <Loader2
                                size={16}
                                className="animate-spin text-orange-500"
                              />
                            ) : (
                              <ChevronRight
                                size={16}
                                className="text-slate-300 group-hover/shipment:text-slate-500"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      No shipment history available
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-center sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-full max-w-xs py-3.5 bg-slate-900 text-white border border-slate-800 rounded-2xl font-black shadow-lg hover:bg-black transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW: SHIPMENT DETAILS MODAL / MODAL CHI TIẾT VẬN ĐƠN --- */}
      {selectedShipment && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedShipment(null)}
          ></div>
          <div className="relative bg-white rounded-[40px] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-8 pb-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center border border-orange-100">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Shipment Details
                  </h3>
                  <p className="text-[10px] font-black text-orange-600 tracking-widest uppercase">
                    {selectedShipment.trackingId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShipment(null)}
                className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto space-y-8 scrollbar-hide">
              {/* Sender & Receiver / Người gửi & Người nhận */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sender */}
                <div className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <UserSquare size={18} className="text-slate-400" />
                    <h4 className="font-bold text-slate-600 text-sm">Sender</h4>
                  </div>
                  <div className="space-y-1 pl-7">
                    <p className="font-bold text-slate-800">
                      {selectedShipment.sender.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {selectedShipment.sender.phone}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedShipment.sender.address}
                    </p>
                  </div>
                </div>
                {/* Receiver */}
                <div className="space-y-3 p-5 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <UserSquare size={18} className="text-slate-400" />
                    <h4 className="font-bold text-slate-600 text-sm">
                      Receiver
                    </h4>
                  </div>
                  <div className="space-y-1 pl-7">
                    <p className="font-bold text-slate-800">
                      {selectedShipment.receiver.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {selectedShipment.receiver.phone}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedShipment.receiver.address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipment Info / Thông tin Vận đơn */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <label className="text-xs font-bold text-slate-400">
                      Status
                    </label>
                    <p
                      className={`text-sm font-black ${
                        selectedShipment.status === "DELIVERED_SUCCESS"
                          ? "text-emerald-600"
                          : selectedShipment.status === "DELIVERY_FAILED"
                            ? "text-rose-600"
                            : "text-slate-800"
                      }`}
                    >
                      {selectedShipment.status}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <label className="text-xs font-bold text-slate-400">
                      Service Type
                    </label>
                    <p className="text-sm font-black text-slate-800">
                      {selectedShipment.serviceType}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <label className="text-xs font-bold text-slate-400">
                      Booking Date
                    </label>
                    <p className="text-sm font-black text-slate-800">
                      {new Date(selectedShipment.bookingDate).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <label className="text-xs font-bold text-slate-400">
                      ETA
                    </label>
                    <p className="text-sm font-black text-slate-800">
                      {selectedShipment.eta
                        ? new Date(selectedShipment.eta).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Item & Pricing Details / Chi tiết Gói hàng & Giá cả */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package size={18} className="text-slate-400" />
                    <h4 className="font-bold text-slate-600 text-sm">
                      Package Details
                    </h4>
                  </div>
                  <div className="space-y-2 pl-7">
                    <p className="text-sm">
                      <span className="font-semibold text-slate-500">
                        Type:
                      </span>{" "}
                      <span className="font-bold text-slate-800">
                        {selectedShipment.details.type}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-slate-500">
                        Weight:
                      </span>{" "}
                      <span className="font-bold text-slate-800">
                        {selectedShipment.details.weight}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-slate-500">
                        Dimensions:
                      </span>{" "}
                      <span className="font-bold text-slate-800">
                        {selectedShipment.details.dimensions}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-slate-500">
                        Actual Weight:
                      </span>{" "}
                      <span className="font-bold text-slate-800">
                        {selectedShipment.actualWeight || "N/A"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CircleDollarSign size={18} className="text-slate-400" />
                    <h4 className="font-bold text-slate-600 text-sm">
                      Payment & Pricing
                    </h4>
                  </div>
                  <div className="space-y-2 pl-7">
                    <p className="text-sm">
                      <span className="font-semibold text-slate-500">
                        Total:
                      </span>{" "}
                      <span className="font-bold text-slate-800 text-lg">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(selectedShipment.pricing.total)}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-slate-500">
                        Payment Method:
                      </span>{" "}
                      <span className="font-bold text-slate-800">
                        {selectedShipment.paymentMethod}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-slate-500">
                        Payment Status:
                      </span>{" "}
                      <span
                        className={`font-bold ${selectedShipment.paymentStatus === "CONFIRMED" ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {selectedShipment.paymentStatus}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-center sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setSelectedShipment(null)}
                className="w-full max-w-xs py-3.5 bg-slate-900 text-white border border-slate-800 rounded-2xl font-black shadow-lg hover:bg-black transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW: CUSTOM CONFIRM MODAL (Replaces window.confirm) --- */}
      {/* Provides a safer, styled confirmation dialog before critical actions */}
      {/* Cung cấp hộp thoại xác nhận an toàn, có kiểu dáng trước các hành động quan trọng */}
      {confirmAction && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setConfirmAction(null)}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
            {/* Warning Icon / Biểu tượng cảnh báo */}
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border-4 ${
                confirmAction.newStatus === "Blocked"
                  ? "bg-rose-50 text-rose-500 border-rose-100"
                  : "bg-emerald-50 text-emerald-500 border-emerald-100"
              }`}
            >
              {confirmAction.newStatus === "Blocked" ? (
                <AlertTriangle size={32} strokeWidth={3} />
              ) : (
                <Unlock size={32} strokeWidth={3} />
              )}
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-2">
              {confirmAction.newStatus === "Blocked"
                ? "Block Customer?"
                : "Activate Customer?"}
            </h3>

            <p className="text-sm font-medium text-slate-500 mb-8 max-w-[280px]">
              Are you sure you want to change status of
              <span className="text-slate-900 font-bold">
                {" "}
                {confirmAction.customer.name}{" "}
              </span>
              to{" "}
              <span
                className={`font-bold ${
                  confirmAction.newStatus === "Blocked"
                    ? "text-rose-600"
                    : "text-emerald-600"
                }`}
              >
                {confirmAction.newStatus}
              </span>
              ?
            </p>

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeStatusChange}
                className={`flex-1 py-3.5 text-white rounded-2xl font-black shadow-lg transition-all active:scale-95 ${
                  confirmAction.newStatus === "Blocked"
                    ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
