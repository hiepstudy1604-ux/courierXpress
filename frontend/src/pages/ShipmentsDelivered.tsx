import React, { useEffect, useMemo, useState } from "react";
import type { User } from "../types";
import { CourierStatus, UserRole } from "../types";
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

type DeliveredTab = "DELIVERED" | "CLOSED";

type DashboardView =
    | "DASHBOARD"
    | "SHIPMENTS_BOOKED"
    | "SHIPMENTS_PICKUP"
    | "SHIPMENTS_IN_TRANSIT"
    | "SHIPMENTS_DELIVERED"
    | "SHIPMENTS_RETURN"
    | "SHIPMENTS_ISSUE"
    | "SHIPMENT_CREATE"
    | "AGENT_LIST"
    | "AGENT_CREATE"
    | "BILLING"
    | "CUSTOMERS"
    | "REPORTS"
    | "TRACKING"
    | "NOTIFICATIONS"
    | "WALLET"
    | "PROFILE";

const deliveredTabToStatuses: Record<DeliveredTab, CourierStatus[]> = {
    DELIVERED: [CourierStatus.DELIVERED_SUCCESS],
    CLOSED: [CourierStatus.CLOSED],
};

const getStatusConfig = (status: CourierStatus) => {
    switch (status) {
        case CourierStatus.DELIVERED_SUCCESS:
            return { label: "DELIVERED", styles: "bg-emerald-50 text-emerald-600 border-emerald-100" };
        case CourierStatus.CLOSED:
            return { label: "CLOSED", styles: "bg-slate-50 text-slate-600 border-slate-100" };
        default:
            return { label: status, styles: "bg-slate-50 text-slate-600 border-slate-100" };
    }
};

const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
};

const formatMoney = (value: number | null | undefined) => {
    if (value == null) return "—";
    return `$${(value / 25000).toFixed(2)}`;
};

const calculateVolume = (dimensions: string): string => {
    if (!dimensions || dimensions === "—") return "—";
    const match = dimensions.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
    if (!match) return "—";
    const l = parseFloat(match[1]);
    const w = parseFloat(match[2]);
    const h = parseFloat(match[3]);
    if (Number.isNaN(l) || Number.isNaN(w) || Number.isNaN(h)) return "—";
    return ((l * w * h) / 1000000).toFixed(4);
};

interface DeliveredDetailProps {
    shipment: any;
    branches: any[];
    onBack: () => void;
    onMoveToIssue: () => void;
    onClose: () => void;
}

const DeliveredDetail: React.FC<DeliveredDetailProps> = ({ shipment, branches, onBack, onMoveToIssue, onClose }) => {
    const trackingId = shipment.trackingId || shipment.id;
    const createdAt = shipment.bookingDate;
    const updatedAt = shipment.updatedAt || shipment.updated_at || shipment.updateAt || null;
    const serviceType = shipment.serviceType || "Standard";

    const sender = shipment.sender || {};
    const receiver = shipment.receiver || {};

    const goodsType = shipment.product?.category || shipment.details?.type || "—";
    const declaredValue = shipment.declaredValue || shipment.details?.declared_value || null;

    const pickupBranchId = shipment.branch_id || shipment.branchId || shipment.branch || null;
    const pickupBranchObj = branches.find((b) => (b.id || b.branch_id)?.toString() === pickupBranchId?.toString());
    const pickupBranchLabel = pickupBranchObj?.name || pickupBranchObj?.branch_code || pickupBranchId || "—";

    const estimatedDimensions = shipment.product?.dimensions || shipment.details?.dimensions || "—";
    const estimatedWeight = shipment.product?.weight || shipment.details?.weight || shipment.actualWeight || "—";
    const estimatedVolume = calculateVolume(estimatedDimensions);

    const actualDimensions = shipment.details?.actual_dimensions || shipment.actualDimensions || "—";
    const actualWeight = shipment.actualWeight || shipment.details?.actual_weight || "—";
    const actualVolume = calculateVolume(actualDimensions);

    const estimatedCharge = shipment.fee ?? shipment.pricing?.total ?? null;
    const actualCharge =
        shipment.actualFee || shipment.pricing?.adjusted_total || shipment.pricing?.total || estimatedCharge || null;

    const [hasCheckedProof, setHasCheckedProof] = useState(false);

    const handleMoveToIssue = () => {
        alert("Move to issue (demo): Status → ISSUE. Navigating to Issue page.");
        onMoveToIssue();
    };

    const handleClose = () => {
        if (!hasCheckedProof) return;
        alert("Close (demo): Status → CLOSED. Switching to Closed tab.");
        onClose();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                    ← Back to list
                </button>
                <span className="text-xs font-semibold text-slate-400">Delivered detail</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 tracking-wide">Shipment Summary</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 tracking-wide">Tracking Id</p>
                                <p className="text-sm font-black text-slate-900">{trackingId}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(trackingId)}
                                className="inline-flex items-center px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-500 hover:bg-slate-50"
                            >
                                Copy
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 mt-2">
                            <div>
                                <p className="font-semibold text-slate-400 mb-0.5">Created At</p>
                                <p className="font-medium">{formatDateTime(createdAt)}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-400 mb-0.5">Last Update</p>
                                <p className="font-medium">{formatDateTime(updatedAt)}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 mt-2">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-slate-400 tracking-wide mb-0.5">
                                    Service Type
                                </p>
                                <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-white">
                                    {serviceType}
                                </span>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 tracking-wide mb-0.5">Status</p>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    Delivered success
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Estimated Charge</p>
                                <p className="text-base font-black text-slate-900">{formatMoney(estimatedCharge)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Actual Charge</p>
                                <p className="text-base font-black text-slate-900">{formatMoney(actualCharge)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">Sender</p>
                        <p className="text-sm font-bold text-slate-900">{sender.name || "—"}</p>
                        <p className="text-xs text-slate-600">{sender.phone || "—"}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sender.address || "—"}</p>
                    </div>
                    <div className="border-t border-slate-100 pt-3">
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">Receiver</p>
                        <p className="text-sm font-bold text-slate-900">{receiver.name || "—"}</p>
                        <p className="text-xs text-slate-600">{receiver.phone || "—"}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{receiver.address || "—"}</p>
                    </div>
                    <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Branch</p>
                            <p className="font-medium text-slate-700">{pickupBranchLabel}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Delivery Branch</p>
                            <p className="font-medium text-slate-500">—</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold text-slate-400">Parcel Info</p>
                    </div>
                    <div className="space-y-2 text-xs text-slate-700">
                        <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-slate-500">Goods Type</span>
                            <span className="font-bold text-slate-900">{goodsType}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-slate-500">Declared Value</span>
                            <span className="font-bold text-slate-900">
                                {declaredValue != null ? `${declaredValue} VND` : "—"}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                            <div className="space-y-1">
                                <p className="font-semibold text-slate-400">Est. Volume (m³)</p>
                                <p className="text-xs font-bold text-slate-900">{estimatedVolume}</p>
                                <p className="font-semibold text-slate-400">Est. Dimensions (L x W x H)</p>
                                <p className="text-xs font-bold text-slate-900">{estimatedDimensions}</p>
                                <p className="font-semibold text-slate-400">Est. Weight</p>
                                <p className="text-xs font-bold text-slate-900">{estimatedWeight}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-slate-400">Actual Volume (m³)</p>
                                <p className="text-xs font-bold text-slate-900">{actualVolume}</p>
                                <p className="font-semibold text-slate-400">Actual Dimensions (L x W x H)</p>
                                <p className="text-xs font-bold text-slate-900">{actualDimensions}</p>
                                <p className="font-semibold text-slate-400">Actual Weight</p>
                                <p className="text-xs font-bold text-slate-900">{actualWeight}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-slate-900">Reconciliation checkpoint</h2>
                        <span className="text-[11px] font-semibold text-slate-400">ID: {trackingId}</span>
                    </div>

                    <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hasCheckedProof}
                            onChange={(e) => setHasCheckedProof(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm font-semibold text-slate-700">Verified delivery proof and result</span>
                    </label>

                    <div className="flex flex-wrap justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleMoveToIssue}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
                        >
                            Move to issue
                        </button>

                        {!isCustomer && (
                            <button
                                type="button"
                                disabled={!hasCheckedProof}
                                onClick={handleClose}
                                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ShipmentsDelivered({ user, setView }: { user: User; setView: (view: DashboardView) => void }) {
    const isCustomer = user.role === UserRole.CUSTOMER;
    const isAdmin = user.role === UserRole.ADMIN;

    const [activeTab, setActiveTab] = useState<DeliveredTab>("DELIVERED");
    const [selectedShipment, setSelectedShipment] = useState<any | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [filters, setFilters] = useState({
        orderId: "",
        branch: "",
        serviceType: "",
    });

    const [rows, setRows] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params: any = { per_page: 1000 };
                let response;
                try {
                    response = await ShipmentService.getAll(params);
                } catch {
                    response = await CourierService.getAll(params);
                }

                if (response.data.success) {
                    const transformed = response.data.data.map((courier: any) => ({
                        id: courier.id,
                        trackingId: courier.trackingId,
                        branch: courier.branchId || "N/A",
                        branchId: courier.branchId,
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
                            weight: courier.details.weight,
                            dimensions: courier.details.dimensions,
                        },
                        details: courier.details,
                        fee: courier.pricing?.total ?? courier.fee,
                        pricing: courier.pricing,
                        status: courier.status,
                        bookingDate: courier.bookingDate,
                        updatedAt: courier.updatedAt,
                        actualWeight: courier.actualWeight,
                        actualFee: courier.actualFee,
                        paymentMethod: courier.paymentMethod,
                    }));

                    setRows(transformed);
                } else {
                    setError("Failed to load shipments");
                }
            } catch (e: any) {
                console.error("Error fetching shipments:", e);
                setError(e.response?.data?.message || "Failed to load shipments");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await BranchService.getAll();
                if (response.data.success || response.data.data) {
                    setBranches(response.data.data || response.data);
                }
            } catch (e) {
                console.error("Error fetching branches:", e);
            }
        };
        if (isAdmin) fetchBranches();
    }, [isAdmin]);

    useEffect(() => setCurrentPage(1), [activeTab]);

    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const resetFilters = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setFilters({ orderId: "", branch: "", serviceType: "" });
    };

    const filteredByTab = useMemo(() => {
        const allowed = deliveredTabToStatuses[activeTab];
        return rows.filter((r) => allowed.includes(r.status as CourierStatus));
    }, [rows, activeTab]);

    const finalData = useMemo(() => {
        return filteredByTab.filter((item) => {
            let branchMatches = true;
            if (user.role !== UserRole.AGENT && user.role !== UserRole.CUSTOMER && filters.branch !== "") {
                // Find the branch that matches the filter value (by name or branch_code)
                const selectedBranch = branches.find((b) => (b.name || b.branch_code) === filters.branch);
                if (selectedBranch) {
                    // Match against the branch ID
                    branchMatches = item.branch === (selectedBranch.id || selectedBranch.branch_id)?.toString();
                } else {
                    branchMatches = false;
                }
            }

            return (
                item.id.toLowerCase().includes(filters.orderId.toLowerCase()) &&
                branchMatches &&
                (filters.serviceType === "" || item.serviceType.toLowerCase() === filters.serviceType.toLowerCase())
            );
        });
    }, [filteredByTab, filters, user, isCustomer, branches]);

    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(finalData.length / itemsPerPage));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedData = finalData.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

    if (activeTab === "DELIVERED" && selectedShipment) {
        return (
            <DeliveredDetail
                shipment={selectedShipment}
                branches={branches}
                onBack={() => setSelectedShipment(null)}
                onMoveToIssue={() => {
                    setSelectedShipment(null);
                    setView("SHIPMENTS_ISSUE");
                }}
                onClose={() => {
                    setSelectedShipment(null);
                    setActiveTab("CLOSED");
                }}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Delivered Shipments</h1>
            </div>

            {!isCustomer && (
                <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-sm p-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {[
                            { id: "DELIVERED" as DeliveredTab, label: "Delivered", Icon: MapPin },
                            { id: "CLOSED" as DeliveredTab, label: "Closed", Icon: MapPin },
                        ].map(({ id, label, Icon }) => {
                            const active = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(id);
                                        setSelectedShipment(null);
                                    }}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                                        active
                                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm"
                                            : "bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <Icon size={18} className={active ? "text-white" : "text-slate-400"} />
                                    <span className="leading-none">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <section className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden transition-all">
                <div className="p-4 px-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                        <span className="font-bold text-slate-700 text-sm uppercase tracking-wider">Filters</span>
                        <ChevronDown
                            size={18}
                            className={`text-slate-400 transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`}
                        />
                    </div>

                    {showFilters && (
                        <button
                            type="button"
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
                                            <option
                                                key={branch.id || branch.branch_id}
                                                value={branch.name || branch.branch_code}
                                            >
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
                                <th className="px-4 py-5 text-[10px] font-bold text-slate-500">Tracking ID</th>
                                {!isCustomer && (
                                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500">Branch</th>
                                )}
                                {!isCustomer && (
                                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500">Fleet</th>
                                )}
                                <th className="px-4 py-5 text-[10px] font-bold text-slate-500">Pickup address</th>
                                <th className="px-4 py-5 text-[10px] font-bold text-slate-500">Delivery address</th>
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
                                <th className="px-4 py-5 text-[10px] font-bold text-slate-500 text-right">Fee</th>
                                <th className="px-4 py-5 text-[10px] font-bold text-slate-500 text-center">Status</th>
                                {!isCustomer && activeTab === "DELIVERED" && (
                                    <th className="px-4 py-5 text-[10px] font-bold text-slate-500 text-right">
                                        Action
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={isCustomer ? 7 : activeTab === "DELIVERED" ? 10 : 9}
                                        className="px-6 py-20 text-center"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <Loader2 size={32} className="animate-spin text-[#f97316]" />
                                            <p className="text-sm font-semibold text-slate-500">Loading shipments...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td
                                        colSpan={isCustomer ? 7 : activeTab === "DELIVERED" ? 10 : 9}
                                        className="px-6 py-20 text-center"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <XCircle size={32} className="text-rose-500" />
                                            <p className="text-sm font-semibold text-slate-700">{error}</p>
                                            <button
                                                type="button"
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
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-black text-slate-900 leading-none truncate">
                                                            {row.trackingId || row.id}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            ID: {row.id}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
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
                                                <p
                                                    className="text-xs font-bold text-slate-900 truncate"
                                                    title={row.route.pickup}
                                                >
                                                    {row.route.pickup}
                                                </p>
                                            </td>
                                            <td className="px-4 py-5 max-w-[200px]">
                                                <p
                                                    className="text-xs font-bold text-slate-900 truncate"
                                                    title={row.route.delivery}
                                                >
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
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        {row.paymentMethod}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                <span
                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${statusInfo.styles}`}
                                                >
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            {!isCustomer && activeTab === "DELIVERED" && (
                                                <td className="px-4 py-5 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedShipment(row)}
                                                        className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                                                    >
                                                        View detail
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={isCustomer ? 7 : activeTab === "DELIVERED" ? 10 : 9}
                                        className="py-32 text-center"
                                    >
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
                            {finalData.length > 0
                                ? Math.min(finalData.length, (currentPage - 1) * itemsPerPage + 1)
                                : 0}
                            -{Math.min(finalData.length, currentPage * itemsPerPage)}
                        </span>{" "}
                        of <span className="text-slate-900 font-black">{finalData.length}</span> shipments
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            aria-label="Previous page"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            className="p-2.5 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 transition-all shadow-sm bg-white text-slate-600"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1.5">
                            {(() => {
                                const maxVisible = 7;
                                const total = totalPages;
                                const current = safePage;

                                const pages: number[] = [];
                                const pushRange = (start: number, end: number) => {
                                    for (let p = start; p <= end; p++) pages.push(p);
                                };

                                if (total <= maxVisible) {
                                    pushRange(1, total);
                                } else {
                                    const left = Math.max(1, current - 2);
                                    const right = Math.min(total, current + 2);

                                    pages.push(1);
                                    if (left > 2) pages.push(-1);
                                    pushRange(Math.max(2, left), Math.min(total - 1, right));
                                    if (right < total - 1) pages.push(-1);
                                    pages.push(total);
                                }

                                return pages.map((p, idx) => {
                                    if (p === -1) {
                                        return (
                                            <span
                                                key={`ellipsis-${idx}`}
                                                className="w-9 text-center text-xs font-black text-slate-300"
                                            >
                                                …
                                            </span>
                                        );
                                    }

                                    return (
                                        <button
                                            type="button"
                                            key={p}
                                            onClick={() => setCurrentPage(p)}
                                            className={`w-9 h-9 rounded-xl text-xs font-black transition-all border ${
                                                current === p
                                                    ? "bg-slate-900 text-white shadow-lg border-slate-900"
                                                    : "bg-white text-slate-400 border-slate-200 hover:text-slate-900 hover:border-slate-400"
                                            }`}
                                            aria-label={`Page ${p}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                        <button
                            type="button"
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
}
