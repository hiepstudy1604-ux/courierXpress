import React, { useEffect, useMemo, useState } from "react";
import { CourierStatus, User as UserType, UserRole } from "../types";
import {
    Search,
    Filter,
    Copy,
    MapPin,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Box,
    ClipboardCheck,
    ChevronDown,
    Phone,
    Loader2,
    XCircle,
} from "lucide-react";
import { CourierService, ShipmentService, BranchService } from "../services/api";

export type ShipmentPhase = "PICKUP" | "IN_TRANSIT" | "DELIVERED" | "RETURN" | "ISSUE";

const phaseToStatuses: Record<ShipmentPhase, CourierStatus[]> = {
    PICKUP: [
        CourierStatus.PICKUP_SCHEDULED,
        CourierStatus.PICKUP_RESCHEDULED,
        CourierStatus.ON_THE_WAY_PICKUP,
        CourierStatus.VERIFIED_ITEM,
        CourierStatus.ADJUST_ITEM,
        CourierStatus.CONFIRMED_PRICE,
        CourierStatus.ADJUSTED_PRICE,
        CourierStatus.PENDING_PAYMENT,
        CourierStatus.CONFIRM_PAYMENT,
        CourierStatus.PICKUP_COMPLETED,
    ],
    IN_TRANSIT: [
        CourierStatus.IN_ORIGIN_WAREHOUSE,
        CourierStatus.IN_TRANSIT,
        CourierStatus.IN_DEST_WAREHOUSE,
        CourierStatus.OUT_FOR_DELIVERY,
    ],
    DELIVERED: [CourierStatus.DELIVERED_SUCCESS, CourierStatus.CLOSED],
    RETURN: [
        CourierStatus.RETURN_CREATED,
        CourierStatus.RETURN_IN_TRANSIT,
        CourierStatus.RETURNED_TO_ORIGIN,
        CourierStatus.RETURN_COMPLETED,
        CourierStatus.DISPOSED,
    ],
    ISSUE: [CourierStatus.DELIVERY_FAILED],
};

const getStatusConfig = (status: CourierStatus) => {
    switch (status) {
        case CourierStatus.BRANCH_ASSIGNED:
            return { label: "BRANCH ASSIGNED", styles: "bg-blue-50 text-blue-600 border-blue-100" };
        case CourierStatus.BOOKED:
            return { label: "BOOKED", styles: "bg-amber-50 text-amber-600 border-amber-100" };
        case CourierStatus.PRICE_ESTIMATED:
            return { label: "PRICE ESTIMATED", styles: "bg-yellow-50 text-yellow-700 border-yellow-100" };

        case CourierStatus.PICKUP_SCHEDULED:
            return { label: "PICKUP SCHEDULED", styles: "bg-cyan-50 text-cyan-600 border-cyan-100" };
        case CourierStatus.PICKUP_RESCHEDULED:
            return { label: "PICKUP RESCHEDULED", styles: "bg-amber-50 text-amber-700 border-amber-100" };
        case CourierStatus.ON_THE_WAY_PICKUP:
            return { label: "ON THE WAY PICKUP", styles: "bg-orange-50 text-orange-600 border-orange-100" };
        case CourierStatus.VERIFIED_ITEM:
            return { label: "VERIFIED ITEM", styles: "bg-teal-50 text-teal-600 border-teal-100" };
        case CourierStatus.ADJUST_ITEM:
            return { label: "ADJUST ITEM", styles: "bg-amber-50 text-amber-700 border-amber-100" };
        case CourierStatus.CONFIRMED_PRICE:
            return { label: "CONFIRMED PRICE", styles: "bg-yellow-50 text-yellow-700 border-yellow-100" };
        case CourierStatus.ADJUSTED_PRICE:
            return { label: "ADJUSTED PRICE", styles: "bg-orange-50 text-orange-700 border-orange-100" };
        case CourierStatus.PENDING_PAYMENT:
            return { label: "PENDING PAYMENT", styles: "bg-rose-50 text-rose-600 border-rose-100" };
        case CourierStatus.CONFIRM_PAYMENT:
            return { label: "CONFIRM PAYMENT", styles: "bg-green-50 text-green-600 border-green-100" };
        case CourierStatus.PICKUP_COMPLETED:
            return { label: "PICKUP COMPLETED", styles: "bg-emerald-50 text-emerald-600 border-emerald-100" };

        case CourierStatus.IN_ORIGIN_WAREHOUSE:
            return { label: "IN ORIGIN WAREHOUSE", styles: "bg-purple-50 text-purple-600 border-purple-100" };
        case CourierStatus.IN_TRANSIT:
            return { label: "IN TRANSIT", styles: "bg-orange-50 text-orange-600 border-orange-100" };
        case CourierStatus.IN_DEST_WAREHOUSE:
            return { label: "IN DEST WAREHOUSE", styles: "bg-violet-50 text-violet-600 border-violet-100" };

        case CourierStatus.OUT_FOR_DELIVERY:
            return { label: "OUT FOR DELIVERY", styles: "bg-orange-50 text-orange-600 border-orange-100" };
        case CourierStatus.DELIVERED_SUCCESS:
            return { label: "DELIVERED", styles: "bg-emerald-50 text-emerald-600 border-emerald-100" };
        case CourierStatus.DELIVERY_FAILED:
            return { label: "DELIVERY FAILED", styles: "bg-rose-50 text-rose-600 border-rose-100" };

        case CourierStatus.RETURN_CREATED:
            return { label: "RETURN CREATED", styles: "bg-pink-50 text-pink-600 border-pink-100" };
        case CourierStatus.RETURN_IN_TRANSIT:
            return { label: "RETURN IN TRANSIT", styles: "bg-pink-50 text-pink-600 border-pink-100" };
        case CourierStatus.RETURNED_TO_ORIGIN:
            return { label: "RETURNED TO ORIGIN", styles: "bg-pink-50 text-pink-600 border-pink-100" };
        case CourierStatus.RETURN_COMPLETED:
            return { label: "RETURN COMPLETED", styles: "bg-emerald-50 text-emerald-600 border-emerald-100" };
        case CourierStatus.DISPOSED:
            return { label: "DISPOSED", styles: "bg-gray-50 text-gray-600 border-gray-100" };

        case CourierStatus.CLOSED:
            return { label: "CLOSED", styles: "bg-slate-50 text-slate-600 border-slate-100" };

        default:
            return { label: status, styles: "bg-slate-50 text-slate-600 border-slate-100" };
    }
};

interface Props {
    user: UserType;
    phase: ShipmentPhase;
    title: string;
}

export const ShipmentListPhasePage: React.FC<Props> = ({ user, phase, title }) => {
    const isCustomer = user.role === UserRole.CUSTOMER;
    const isAdmin = user.role === UserRole.ADMIN;

    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [filters, setFilters] = useState({
        orderId: "",
        phone: "",
        branch: "",
        serviceType: "",
    });

    const [couriers, setCouriers] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCouriers = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const params: any = { per_page: 1000 };
                let response;
                try {
                    response = await ShipmentService.getAll(params);
                } catch (err) {
                    response = await CourierService.getAll(params);
                }
                if (response.data.success) {
                    const transformedData = response.data.data.map((courier: any) => ({
                        id: courier.id,
                        trackingId: courier.trackingId,
                        branch: courier.branchName || courier.branch_name || courier.branch?.name || courier.branch || courier.branchId || "N/A",
                        vehicleType: courier.vehicleType || "N/A",
                        sender: courier.sender,
                        receiver: courier.receiver,
                        route: {
                            pickup: courier.sender.address,
                            delivery: courier.receiver.address,
                        },
                        serviceType: courier.serviceType || "Standard",
                        product: {
                            category: courier.details.type,
                            weight: courier.actualWeight || courier.details.weight || "N/A",
                            dimensions: courier.details.dimensions || "N/A",
                        },
                        fee: courier.pricing.total,
                        status: courier.status,
                        bookingDate: courier.bookingDate,
                        eta: courier.eta,
                        pickupWindow: courier.pickupWindow,
                        actualWeight: courier.actualWeight,
                        paymentMethod: courier.paymentMethod,
                        paymentStatus: courier.paymentStatus,
                    }));
                    setCouriers(transformedData);
                } else {
                    setError("Failed to load shipments");
                }
            } catch (err: any) {
                console.error("Error fetching shipments:", err);
                setError(err.response?.data?.message || "Failed to load shipments");
            } finally {
                setIsLoading(false);
            }
        };
        fetchCouriers();
    }, [user]);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await BranchService.getAll();
                if (response.data.success || response.data.data) {
                    setBranches(response.data.data || response.data);
                }
            } catch (err) {
                console.error("Error fetching branches:", err);
            }
        };
        if (isAdmin) fetchBranches();
    }, [isAdmin]);

    useEffect(() => setCurrentPage(1), [phase]);

    // (Booked-specific vehicle fetching moved to `ShipmentsBooked.tsx`)

    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const resetFilters = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setFilters({ orderId: "", phone: "", branch: "", serviceType: "" });
    };

    const filteredByPhase = useMemo(() => {
        const allowed = phaseToStatuses[phase];
        return couriers.filter((item) => allowed.includes(item.status as CourierStatus));
    }, [couriers, phase]);

    const finalData = useMemo(() => {
        return filteredByPhase.filter((item) => {
            return (
                item.id.toLowerCase().includes(filters.orderId.toLowerCase()) &&
                (isCustomer ||
                    item.sender.phone.includes(filters.phone) ||
                    item.receiver.phone.includes(filters.phone)) &&
                (user.role === UserRole.AGENT ||
                    user.role === UserRole.CUSTOMER ||
                    filters.branch === "" ||
                    String(item.branch).toLowerCase() === String(filters.branch).toLowerCase()) &&
                (filters.serviceType === "" || item.serviceType.toLowerCase() === filters.serviceType.toLowerCase())
            );
        });
    }, [filteredByPhase, filters, user, isCustomer]);

    const itemsPerPage = 10;
    const totalPages = Math.ceil(finalData.length / itemsPerPage);
    const paginatedData = finalData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // (Booked-specific selection state moved to `ShipmentsBooked.tsx`)

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
            </div>

            <section className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden transition-all">
                <div className="p-4 px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowFilters(!showFilters)}>
                        <Filter size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                        <span className="font-bold text-slate-700 text-sm uppercase tracking-wider">Filters</span>
                        <ChevronDown
                            size={18}
                            className={`text-slate-400 transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`}
                        />
                    </div>

                    {showFilters && (
                        <button
                            onClick={resetFilters}
                            className="flex items-center gap-2 text-slate-400 hover:text-[#f97316] text-xs font-bold transition-all px-3 py-1.5 hover:bg-orange-50 rounded-lg group"
                            title="Reset Filters"
                        >
                            <RotateCcw size={14} className="group-active:rotate-180 transition-transform" />
                            Reset All
                        </button>
                    )}
                </div>

                {showFilters && (
                    <div className="p-6 flex flex-col md:flex-row flex-wrap gap-6 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-2 flex-1 min-w-[280px]">
                            <label className="text-sm font-bold text-slate-700 ml-1">Tracking ID</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input
                                    type="text"
                                    placeholder="CX-88..."
                                    value={filters.orderId}
                                    onChange={(e) => {
                                        setFilters({ ...filters, orderId: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900"
                                />
                            </div>
                        </div>

                        {!isCustomer && (
                            <div className="space-y-2 flex-1 min-w-[280px]">
                                <label className="text-sm font-bold text-slate-700 ml-1">Phone Number</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        type="text"
                                        placeholder="Search phone..."
                                        value={filters.phone}
                                        onChange={(e) => {
                                            setFilters({ ...filters, phone: e.target.value });
                                            setCurrentPage(1);
                                        }}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900"
                                    />
                                </div>
                            </div>
                        )}

                        {user.role === UserRole.ADMIN && (
                            <div className="space-y-2 flex-1 min-w-[280px]">
                                <label className="text-sm font-bold text-slate-700 ml-1">Branch</label>
                                <div className="relative">
                                    <MapPin
                                        size={16}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                                    />
                                    <select
                                        aria-label="Filter by branch"
                                        value={filters.branch}
                                        onChange={(e) => {
                                            setFilters({ ...filters, branch: e.target.value });
                                            setCurrentPage(1);
                                        }}
                                        className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900 appearance-none cursor-pointer"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map((branch) => (
                                            <option key={branch.id || branch.branch_id} value={branch.name || branch.branch_code}>
                                                {branch.name || branch.branch_code}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown
                                        size={14}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
            <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1500px]">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-4 py-5 text-[10px] font-bold text-slate-500">
                                    Shipment ID
                                </th>
                                {!isCustomer && (
                                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500">
                                        Branch
                                    </th>
                                )}
                                {!isCustomer && (
                                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500">
                                        Fleet
                                    </th>
                                )}
                                <th className="px-4 py-5 text-[10px] font-bold text-slate-500">
                                    Pickup address
                                </th>
                                <th className="px-4 py-5 text-[10px] font-bold text-slate-500">
                                    Delivery address
                                </th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Box size={14} />
                                        Weight
                                    </div>
                                </th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Box size={14} />
                                        Dimensions
                                    </div>
                                </th>
                                <th className="px-4 py-5 text-[10px] font-bold text-slate-500 text-right">
                                    Fee
                                </th>
                                <th className="px-4 py-5 text-[10px] font-bold text-slate-500 text-center">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={isCustomer ? 7 : 9} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <Loader2 size={32} className="animate-spin text-[#f97316]" />
                                            <p className="text-sm font-semibold text-slate-500">Loading shipments...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={isCustomer ? 7 : 9} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <XCircle size={32} className="text-rose-500" />
                                            <p className="text-sm font-semibold text-slate-700">{error}</p>
                                            <button
                                                onClick={() => window.location.reload()}
                                                className="px-4 py-2 bg-[#f97316] text-white rounded-lg font-bold text-sm hover:bg-[#ea580c] transition-all"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((row) => {
                                    const statusInfo = getStatusConfig(row.status as CourierStatus);
                                    return (
                                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-4 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-slate-900 leading-none">
                                                        {row.id}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopy(row.id)}
                                                        className="p-1.5 text-slate-300 hover:text-orange-600 transition-all hover:bg-orange-50 rounded-lg"
                                                        title="Copy ID"
                                                        aria-label="Copy shipment id"
                                                    >
                                                        {copiedId === row.id ? (
                                                            <ClipboardCheck size={14} className="text-emerald-500" />
                                                        ) : (
                                                            <Copy size={14} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                            {!isCustomer && (
                                                <td className="px-4 py-5">
                                                    <p className="text-sm font-bold text-slate-900 leading-none whitespace-nowrap">
                                                        {row.branch}
                                                    </p>
                                                </td>
                                            )}
                                            {!isCustomer && (
                                                <td className="px-4 py-5">
                                                    <p className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                                                        {row.vehicleType}
                                                    </p>
                                                </td>
                                            )}
                                            <td className="px-4 py-5 max-w-[200px]">
                                                <p className="text-xs font-bold text-slate-900 truncate" title={row.route.pickup}>
                                                    {row.route.pickup}
                                                </p>
                                            </td>
                                            <td className="px-4 py-5 max-w-[200px]">
                                                <p className="text-xs font-bold text-slate-900 truncate" title={row.route.delivery}>
                                                    {row.route.delivery}
                                                </p>
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                <p className="text-sm font-bold text-slate-900 whitespace-nowrap">
                                                    {row.actualWeight || row.product.weight}
                                                </p>
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                    {row.product.dimensions}
                                                </p>
                                            </td>
                                            <td className="px-4 py-5 text-right">
                                                <p className="text-sm font-black text-slate-900 whitespace-nowrap">
                                                    ${(row.fee / 25000).toFixed(2)}
                                                </p>
                                                {row.paymentMethod && (
                                                    <p className="text-[10px] text-slate-400 font-medium">{row.paymentMethod}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                <span
                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${statusInfo.styles}`}
                                                >
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={isCustomer ? 7 : 9} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-300">
                                            <Box size={64} strokeWidth={1} />
                                            <div className="space-y-1">
                                                <p className="text-lg font-black text-slate-400">No shipments found</p>
                                                <p className="text-sm font-medium">Try adjusting your filters.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                    <p className="text-xs font-bold text-slate-500">
                        Showing{" "}
                        <span className="text-slate-900 font-black">
                            {finalData.length > 0 ? Math.min(finalData.length, (currentPage - 1) * itemsPerPage + 1) : 0}-
                            {Math.min(finalData.length, currentPage * itemsPerPage)}
                        </span>{" "}
                        of <span className="text-slate-900 font-black">{finalData.length}</span> shipments
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            aria-label="Previous page"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            className="p-2.5 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 transition-all shadow-sm bg-white text-slate-600"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1.5">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all border ${
                                        currentPage === i + 1
                                            ? "bg-slate-900 text-white shadow-lg border-slate-900"
                                            : "bg-white text-slate-400 border-slate-200 hover:text-slate-900 hover:border-slate-400"
                                    }`}
                                    aria-label={`Page ${i + 1}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            aria-label="Next page"
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            className="p-2.5 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 transition-all shadow-sm bg-white text-slate-600"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

