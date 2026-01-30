import React, { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "../types";
import { CourierStatus, UserRole } from "../types";
import {
    Search,
    Filter,
    Copy,
    Truck,
    PackageSearch,
    DollarSign,
    CreditCard,
    PackageCheck,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Box,
    ClipboardCheck,
    ChevronDown,
    Loader2,
    XCircle,
    Image as ImageIcon,
} from "lucide-react";
import { CourierService, ShipmentService, BranchService } from "../services/api";

type PickupTab = "ON_THE_WAY" | "CHECK_ITEM" | "CHECK_PRICE" | "PAYMENT_CONFIRM" | "PICKUP_COMPLETE";

const pickupTabToStatuses: Record<PickupTab, CourierStatus[]> = {
    ON_THE_WAY: [CourierStatus.ON_THE_WAY_PICKUP],
    CHECK_ITEM: [CourierStatus.VERIFIED_ITEM, CourierStatus.ADJUST_ITEM],
    CHECK_PRICE: [CourierStatus.CONFIRMED_PRICE, CourierStatus.ADJUSTED_PRICE],
    PAYMENT_CONFIRM: [CourierStatus.PENDING_PAYMENT, CourierStatus.CONFIRM_PAYMENT],
    PICKUP_COMPLETE: [CourierStatus.PICKUP_COMPLETED, CourierStatus.PICKUP_COMPLETE],
};

const getStatusConfig = (status: CourierStatus) => {
    switch (status) {
        case CourierStatus.ON_THE_WAY_PICKUP:
            return { label: "ON THE WAY PICKUP", styles: "bg-orange-50 text-orange-600 border-orange-100" };
        case CourierStatus.VERIFIED_ITEM:
            return { label: "VERIFIED ITEM", styles: "bg-teal-50 text-teal-600 border-teal-100" };
        case CourierStatus.ADJUST_ITEM:
            return { label: "ADJUST ITEM", styles: "bg-amber-50 text-amber-700 border-amber-100" };
        case CourierStatus.CONFIRMED_PRICE:
            return { label: "CONFIRMED PRICE", styles: "bg-yellow-50 text-yellow-600 border-yellow-100" };
        case CourierStatus.ADJUSTED_PRICE:
            return { label: "ADJUSTED PRICE", styles: "bg-orange-50 text-orange-700 border-orange-100" };
        case CourierStatus.PENDING_PAYMENT:
            return { label: "PENDING PAYMENT", styles: "bg-rose-50 text-rose-600 border-rose-100" };
        case CourierStatus.CONFIRM_PAYMENT:
            return { label: "CONFIRM PAYMENT", styles: "bg-green-50 text-green-600 border-green-100" };
        case CourierStatus.PICKUP_COMPLETED:
            return { label: "PICKUP COMPLETE", styles: "bg-emerald-50 text-emerald-600 border-emerald-100" };
        default:
            return { label: status, styles: "bg-slate-50 text-slate-600 border-slate-100" };
    }
};

interface OnTheWayPickupDetailProps {
    shipment: any;
    branches: any[];
    onBack: () => void;
    onGoToCheckItem: () => void;
}

const OnTheWayPickupDetail: React.FC<OnTheWayPickupDetailProps> = ({ shipment, branches, onBack, onGoToCheckItem }) => {
    const trackingId = shipment.trackingId || shipment.id;
    const createdAt = shipment.bookingDate;
    const updatedAt = shipment.updatedAt || shipment.updated_at || null;
    const serviceType = shipment.serviceType || "Standard";

    const sender = shipment.sender || {};
    const receiver = shipment.receiver || {};

    const declaredValue = shipment.declaredValue || shipment.details?.declared_value || null;
    const estimatedDimensions = shipment.product?.dimensions || shipment.details?.dimensions || "—";
    const estimatedWeight = shipment.product?.weight || shipment.details?.weight || shipment.actualWeight || "—";

    const pickupBranchId = shipment.branch_id || shipment.branchId || shipment.branch || null;
    const pickupBranchObj = branches.find((b) => (b.id || b.branch_id)?.toString() === pickupBranchId?.toString());
    const pickupBranchLabel = pickupBranchObj?.name || pickupBranchObj?.branch_code || pickupBranchId || "—";

    const vehicleType =
        shipment.vehicleType ||
        shipment.vehicle_type ||
        shipment.vehicle?.type ||
        shipment.vehicle?.vehicle_type ||
        "—";

    const latestPickupWindowStart: string = shipment.pickupWindow?.start || shipment.pickupWindowStart || "";
    const latestPickupWindowEnd: string = shipment.pickupWindow?.end || shipment.pickupWindowEnd || "";
    const latestPickupShift = shipment.pickupShift || "";

    const formatDateTime = (value: string | null | undefined) => {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString();
    };

    const formatPickupShift = (shift: string) => {
        switch (shift?.toUpperCase()) {
            case "MORNING":
                return "Morning";
            case "AFTERNOON":
                return "Afternoon";
            case "EVENING":
                return "Evening";
            default:
                return "—";
        }
    };

    // Calculate estimated volume from dimensions (L x W x H in cm, convert to m³)
    const calculateVolume = (dimensions: string): string => {
        if (!dimensions || dimensions === "—") return "—";
        const match = dimensions.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
        if (!match) return "—";
        const l = parseFloat(match[1]);
        const w = parseFloat(match[2]);
        const h = parseFloat(match[3]);
        if (Number.isNaN(l) || Number.isNaN(w) || Number.isNaN(h)) return "—";
        const volumeM3 = (l * w * h) / 1000000; // Convert cm³ to m³
        return volumeM3.toFixed(4);
    };

    const estimatedVolume = calculateVolume(estimatedDimensions);

    // Check item state
    const [verifiedDimensions, setVerifiedDimensions] = useState(false);
    const [verifiedWeight, setVerifiedWeight] = useState(false);
    const [verifiedImage, setVerifiedImage] = useState(false);

    const allVerified = verifiedDimensions && verifiedWeight && verifiedImage;

    const handleVerifiedItem = () => {
        if (!allVerified) return;
        alert("Verified item (demo): Status → VERIFIED_ITEM. Moving to Check Item tab.");
        onGoToCheckItem();
    };

    const handleAdjustItem = () => {
        if (allVerified) return;
        alert("Adjust item (demo): Status → ADJUST_ITEM. Moving to Check Item tab.");
        onGoToCheckItem();
    };

    // Get image URL (from shipment.details.images or shipment.images)
    const imageUrl = shipment.details?.images?.[0] || shipment.images?.[0] || shipment.image || null;

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
                <span className="text-xs font-semibold text-slate-400">On The Way Pickup Detail</span>
            </div>

            {/* Header 3 Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Card 1: Shipment Summary */}
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
                                <p className="font-medium">{createdAt || "—"}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-400 mb-0.5">Last Update</p>
                                <p className="font-medium">{updatedAt || "—"}</p>
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
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">
                                    Set On The Way Pickup
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Estimated Charge</p>
                                <p className="text-base font-black text-slate-900">
                                    {shipment?.fee ? `${(shipment.fee / 25000).toFixed(2)} USD` : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Actual Charge</p>
                                <p className="text-sm font-medium text-slate-400">—</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Parties */}
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

                {/* Card 3: Parcel Info */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">Goods Type</p>
                        <p className="text-sm font-bold text-slate-900">{shipment.details?.type || "Parcel"}</p>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">Declared Value</p>
                        <p className="text-sm font-medium text-slate-900">
                            {declaredValue != null ? `${declaredValue.toLocaleString()} VND` : "—"}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Estimated Volume (m³)</p>
                            <p className="font-medium text-slate-700">{estimatedVolume}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Actual Volume (m³)</p>
                            <p className="font-medium text-slate-500">—</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Estimated Dimensions</p>
                            <p className="font-medium text-slate-700">{estimatedDimensions}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Actual Dimensions</p>
                            <p className="font-medium text-slate-500">—</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Estimated Weight</p>
                            <p className="font-medium text-slate-700">{estimatedWeight}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Actual Weight</p>
                            <p className="font-medium text-slate-500">—</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
                <div className="lg:col-span-12 space-y-6">
                    {/* Information Section */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-slate-900">Information</h2>
                            <span className="text-[11px] font-semibold text-slate-400">
                                State: Set On The Way Pickup
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-1">Sender</p>
                                <p className="text-sm font-bold text-slate-900">{sender.name || "—"}</p>
                                <p className="text-xs text-slate-600">{sender.phone || "—"}</p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sender.address || "—"}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Branch</p>
                                    <p className="text-xs font-semibold text-slate-800">{pickupBranchLabel}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Vehicle Type</p>
                                    <p className="text-xs font-semibold text-slate-800">{vehicleType}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Window</p>
                                    <p className="text-xs font-semibold text-slate-800">
                                        {latestPickupWindowStart || latestPickupWindowEnd
                                            ? `${formatDateTime(latestPickupWindowStart || latestPickupWindowEnd)}`
                                            : "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Shift</p>
                                    <p className="text-xs font-semibold text-slate-800">
                                        {formatPickupShift(latestPickupShift)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Check Item Section */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-slate-900">Check Item</h2>
                        </div>

                        <div className="space-y-0">
                            {/* Kích thước ước tính */}
                            <div className="py-4 px-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-semibold text-slate-400 mb-0.5">
                                            Estimated Dimensions (L x W x H)
                                        </p>
                                        <p className="text-xs font-semibold text-slate-800">{estimatedDimensions}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                        <input
                                            type="checkbox"
                                            id="verifiedDimensions"
                                            checked={verifiedDimensions}
                                            onChange={(e) => setVerifiedDimensions(e.target.checked)}
                                            className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 focus:ring-2"
                                        />
                                        <label
                                            htmlFor="verifiedDimensions"
                                            className="text-xs font-semibold text-slate-700 cursor-pointer"
                                        >
                                            Confirmed
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <hr className="border-t border-slate-100 mx-2" />

                            {/* Thể tích ước tính */}
                            <div className="py-4 px-2">
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Estimated Volume (m³)</p>
                                <p className="text-xs font-semibold text-slate-800">{estimatedVolume}</p>
                            </div>
                            <hr className="border-t border-slate-100 mx-2" />

                            {/* Cân nặng ước tính */}
                            <div className="py-4 px-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-semibold text-slate-400 mb-0.5">
                                            Estimated Weight
                                        </p>
                                        <p className="text-xs font-semibold text-slate-800">{estimatedWeight}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                        <input
                                            type="checkbox"
                                            id="verifiedWeight"
                                            checked={verifiedWeight}
                                            onChange={(e) => setVerifiedWeight(e.target.checked)}
                                            className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 focus:ring-2"
                                        />
                                        <label
                                            htmlFor="verifiedWeight"
                                            className="text-xs font-semibold text-slate-700 cursor-pointer"
                                        >
                                            Confirmed
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <hr className="border-t border-slate-100 mx-2" />

                            {/* Ảnh đơn hàng */}
                            <div className="py-4 px-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Order Photo</p>
                                    <div className="flex items-center gap-2 ml-2">
                                        <input
                                            type="checkbox"
                                            id="verifiedImage"
                                            checked={verifiedImage}
                                            onChange={(e) => setVerifiedImage(e.target.checked)}
                                            className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 focus:ring-2"
                                        />
                                        <label
                                            htmlFor="verifiedImage"
                                            className="text-xs font-semibold text-slate-700 cursor-pointer"
                                        >
                                            Confirmed
                                        </label>
                                    </div>
                                </div>
                                {imageUrl ? (
                                    <div className="mt-2">
                                        <img
                                            src={imageUrl}
                                            alt="Order"
                                            className="w-full max-w-[200px] h-auto rounded-lg border border-slate-200"
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-2 flex items-center justify-center w-full max-w-[200px] h-32 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                                        <div className="text-center">
                                            <ImageIcon size={24} className="mx-auto text-slate-400 mb-1" />
                                            <p className="text-xs text-slate-400">No image</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-wrap gap-3 justify-end mt-6">
                            <button
                                type="button"
                                onClick={handleAdjustItem}
                                disabled={allVerified}
                                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500 border-amber-500 text-white hover:bg-amber-600"
                            >
                                Adjust Item
                            </button>
                            <button
                                type="button"
                                onClick={handleVerifiedItem}
                                disabled={!allVerified}
                                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                            >
                                Verified Item
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface CheckItemDetailProps {
    shipment: any;
    branches: any[];
    onBack: () => void;
    onGoToCheckPrice: () => void;
    onGoToClosed: () => void;
    onUpdateShipmentStatus: (shipmentId: string, nextStatus: CourierStatus) => Promise<void>;
}

const CheckItemDetail: React.FC<CheckItemDetailProps> = ({
    shipment,
    branches,
    onBack,
    onGoToCheckPrice,
    onGoToClosed,
    onUpdateShipmentStatus,
}) => {
    const trackingId = shipment.trackingId || shipment.id;
    const createdAt = shipment.bookingDate;
    const updatedAt = shipment.updatedAt || shipment.updated_at || null;
    const serviceType = shipment.serviceType || "Standard";

    const sender = shipment.sender || {};
    const receiver = shipment.receiver || {};

    const declaredValue = shipment.declaredValue || shipment.details?.declared_value || null;
    const goodsType = shipment.product?.category || shipment.details?.type || "—";

    const pickupBranchId = shipment.branch_id || shipment.branchId || shipment.branch || null;
    const pickupBranchObj = branches.find((b) => (b.id || b.branch_id)?.toString() === pickupBranchId?.toString());
    const pickupBranchLabel = pickupBranchObj?.name || pickupBranchObj?.branch_code || pickupBranchId || "—";

    const vehicleType =
        shipment.vehicleType ||
        shipment.vehicle_type ||
        shipment.vehicle?.type ||
        shipment.vehicle?.vehicle_type ||
        "—";

    const latestPickupWindowStart: string = shipment.pickupWindow?.start || shipment.pickupWindowStart || "";
    const latestPickupWindowEnd: string = shipment.pickupWindow?.end || shipment.pickupWindowEnd || "";
    const latestPickupShift = shipment.pickupShift || "";

    const estimatedDimensions = shipment.product?.dimensions || shipment.details?.dimensions || "—";
    const estimatedWeight = shipment.product?.weight || shipment.details?.weight || shipment.actualWeight || "—";
    const estimatedVolume = (() => {
        const match = estimatedDimensions?.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
        if (!match) return "—";
        const [l, w, h] = match.slice(1).map((v: string) => parseFloat(v));
        if (l && w && h) return ((l * w * h) / 1000000).toFixed(4);
        return "—";
    })();

    const actualDimensions = shipment.details?.actual_dimensions || shipment.actualDimensions || "—";
    const actualWeight = shipment.actualWeight || shipment.details?.actual_weight || "—";
    const actualVolume = (() => {
        const match = actualDimensions?.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
        if (!match) return "—";
        const [l, w, h] = match.slice(1).map((v: string) => parseFloat(v));
        if (l && w && h) return ((l * w * h) / 1000000).toFixed(4);
        return "—";
    })();

    const formatDateTime = (value: string | null | undefined) => {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString();
    };

    const formatPickupShift = (shift: string) => {
        switch (shift?.toUpperCase()) {
            case "MORNING":
                return "Morning";
            case "AFTERNOON":
                return "Afternoon";
            case "EVENING":
                return "Evening";
            default:
                return "—";
        }
    };

    const status = shipment.status as CourierStatus;
    const isVerifiedItem = status === CourierStatus.VERIFIED_ITEM;

    const estimatedCharge = shipment.fee ?? shipment.pricing?.total ?? null;

    const actualCharge = (() => {
        if (estimatedCharge == null) return null;
        const estVol = parseFloat(estimatedVolume);
        const actVol = parseFloat(actualVolume);
        const volRatio = !Number.isNaN(estVol) && !Number.isNaN(actVol) && estVol > 0 ? actVol / estVol : 1;

        const estW = parseFloat(String(estimatedWeight));
        const actW = parseFloat(String(actualWeight));
        const weightRatio = !Number.isNaN(estW) && !Number.isNaN(actW) && estW > 0 ? actW / estW : 1;

        const ratio = Math.max(volRatio, weightRatio, 1);
        return Math.round(estimatedCharge * ratio);
    })();

    const priceDiff = (() => {
        if (estimatedCharge == null || actualCharge == null) return null;
        return Math.abs(actualCharge - estimatedCharge);
    })();

    const adjustedCharge = actualCharge;

    const formatMoney = (value: number | null | undefined) => {
        if (value == null) return "—";
        return `${(value / 25000).toFixed(2)}`;
    };

    const handleConfirmPrice = async () => {
        const nextStatus = isVerifiedItem ? CourierStatus.CONFIRMED_PRICE : CourierStatus.ADJUSTED_PRICE;
        await onUpdateShipmentStatus(shipment.id, nextStatus);
        onGoToCheckPrice();
    };

    const handleCancel = async () => {
        await onUpdateShipmentStatus(shipment.id, CourierStatus.CLOSED);
        onGoToClosed();
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
                <span className="text-xs font-semibold text-slate-400">Check Item Detail</span>
            </div>

            {/* Header 3 Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Card 1: Shipment Summary */}
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
                                <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        isVerifiedItem
                                            ? "bg-teal-50 text-teal-700 border border-teal-100"
                                            : "bg-amber-50 text-amber-700 border border-amber-100"
                                    }`}
                                >
                                    {isVerifiedItem ? "Verified Item" : "Adjust Item"}
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
                                <p className="text-sm font-medium text-slate-400">—</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Parties */}
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

                {/* Card 3: Parcel Info */}
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
                                {declaredValue ? `${declaredValue} VND` : "—"}
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

            {/* Main Content */}
            <div className="space-y-6">
                {/* Information Section */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-900">Information</h2>
                        <span className="text-[11px] font-semibold text-slate-400">
                            State: {isVerifiedItem ? "Verified Item" : "Adjust Item"}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-1">Sender</p>
                            <p className="text-sm font-bold text-slate-900">{sender.name || "—"}</p>
                            <p className="text-xs text-slate-600">{sender.phone || "—"}</p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sender.address || "—"}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Branch</p>
                                <p className="text-xs font-semibold text-slate-800">{pickupBranchLabel}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Vehicle Type</p>
                                <p className="text-xs font-semibold text-slate-800">{vehicleType}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Window</p>
                                <p className="text-xs font-semibold text-slate-800">
                                    {latestPickupWindowStart || latestPickupWindowEnd
                                        ? `${formatDateTime(latestPickupWindowStart || latestPickupWindowEnd)}`
                                        : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Shift</p>
                                <p className="text-xs font-semibold text-slate-800">
                                    {formatPickupShift(latestPickupShift)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Parcel Info Section */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-900">Parcel Info</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Column 1: Estimated */}
                            <div>
                                <div className="p-3 bg-slate-50 rounded-xl mb-3">
                                    <h3 className="text-xs font-bold text-slate-700 mb-2">Estimated (From Booking)</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">
                                                Volume (m³)
                                            </p>
                                            <p className="text-sm font-semibold text-slate-900">{estimatedVolume}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">
                                                Dimensions (L x W x H)
                                            </p>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {estimatedDimensions}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Weight</p>
                                            <p className="text-sm font-semibold text-slate-900">{estimatedWeight}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">
                                                Estimated Charge
                                            </p>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {formatMoney(estimatedCharge)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Actual */}
                            <div>
                                <div className="p-3 bg-blue-50 rounded-xl mb-3 border border-blue-100">
                                    <h3 className="text-xs font-bold text-blue-700 mb-2">Actual (From Check Item)</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">
                                                Volume (m³)
                                            </p>
                                            <p className="text-sm font-semibold text-slate-900">{actualVolume}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">
                                                Dimensions (L x W x H)
                                            </p>
                                            <p className="text-sm font-semibold text-slate-900">{actualDimensions}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Weight</p>
                                            <p className="text-sm font-semibold text-slate-900">{actualWeight}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 mb-0.5">
                                                Actual Charge
                                            </p>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {formatMoney(actualCharge)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Price Adjustment */}
                        <div className="border-t border-slate-100 pt-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Price Difference</p>
                                    <p className="text-sm font-bold text-rose-600">
                                        {priceDiff != null ? formatMoney(priceDiff) : "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Adjusted Charge</p>
                                    <p className="text-sm font-bold text-blue-600">{formatMoney(adjustedCharge)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-between items-center pt-2">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleConfirmPrice}
                            className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                        >
                            {isVerifiedItem ? "Confirm Price" : "Adjust Price"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface CheckPriceDetailProps {
    shipment: any;
    branches: any[];
    onBack: () => void;
    onConfirmPayment: () => void;
    onUpdateShipmentStatus: (shipmentId: string, nextStatus: CourierStatus, payload?: any) => Promise<void>;
}

const CheckPriceDetail: React.FC<CheckPriceDetailProps> = ({
    shipment,
    branches,
    onBack,
    onConfirmPayment,
    onUpdateShipmentStatus,
}) => {
    const trackingId = shipment.trackingId || shipment.id;
    const createdAt = shipment.bookingDate;
    const updatedAt = shipment.updatedAt || shipment.updated_at || null;
    const serviceType = shipment.serviceType || "Standard";

    const shipmentStatus = shipment.status as CourierStatus;
    const isConfirmedPrice = shipmentStatus === CourierStatus.CONFIRMED_PRICE;

    const sender = shipment.sender || {};
    const receiver = shipment.receiver || {};

    const pickupBranchId = shipment.branch_id || shipment.branchId || shipment.branch || null;
    const pickupBranchObj = branches.find((b) => (b.id || b.branch_id)?.toString() === pickupBranchId?.toString());
    const pickupBranchLabel = pickupBranchObj?.name || pickupBranchObj?.branch_code || pickupBranchId || "—";

    const vehicleType =
        shipment.vehicleType ||
        shipment.vehicle_type ||
        shipment.vehicle?.type ||
        shipment.vehicle?.vehicle_type ||
        "—";

    const latestPickupWindowStart: string = shipment.pickupWindow?.start || shipment.pickupWindowStart || "";
    const latestPickupWindowEnd: string = shipment.pickupWindow?.end || shipment.pickupWindowEnd || "";
    const latestPickupShift = shipment.pickupShift || "";

    const estimatedCharge = shipment.fee ?? shipment.pricing?.total ?? null;

    const formatDateTime = (value: string | null | undefined) => {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString();
    };

    const formatPickupShift = (shift: string) => {
        switch (shift?.toUpperCase()) {
            case "MORNING":
                return "Morning";
            case "AFTERNOON":
                return "Afternoon";
            case "EVENING":
                return "Evening";
            default:
                return "—";
        }
    };

    const formatMoney = (value: number | null | undefined) => {
        if (value == null) return "—";
        return `$${(value / 25000).toFixed(2)}`;
    };

    // Payment method state
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");
    const amountToCollect = estimatedCharge;

    // Get shipment details for display
    const goodsType = shipment.product?.category || shipment.details?.type || "—";
    const declaredValue = shipment.declaredValue || shipment.details?.declared_value || null;

    // Dimensions and weight for display
    const estimatedDimensions = shipment.product?.dimensions || shipment.details?.dimensions || "—";
    const estimatedWeight = shipment.product?.weight || shipment.details?.weight || shipment.actualWeight || "—";
    const estimatedVolume = (() => {
        const match = estimatedDimensions?.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
        if (!match) return "—";
        const [l, w, h] = match.slice(1).map((v: string) => parseFloat(v));
        if (l && w && h) return ((l * w * h) / 1000000).toFixed(4);
        return "—";
    })();

    const actualDimensions = shipment.details?.actual_dimensions || shipment.actualDimensions || "—";
    const actualWeight = shipment.actualWeight || shipment.details?.actual_weight || "—";
    const actualVolume = (() => {
        const match = actualDimensions?.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
        if (!match) return "—";
        const [l, w, h] = match.slice(1).map((v: string) => parseFloat(v));
        if (l && w && h) return ((l * w * h) / 1000000).toFixed(4);
        return "—";
    })();

    const actualCharge =
        shipment.actualFee || shipment.pricing?.adjusted_total || shipment.pricing?.total || estimatedCharge || null;

    const [cashAmountCollected, setCashAmountCollected] = useState<string>("");

    const cashDiff = useMemo(() => {
        const target = amountToCollect ?? 0;
        const collected = parseFloat(cashAmountCollected || "0");
        if (!cashAmountCollected) return { label: "—", cls: "text-slate-500" };
        const diff = collected - target;
        if (Math.abs(diff) < 0.00001) return { label: "Matched", cls: "text-emerald-600" };
        if (diff > 0) return { label: `Over: ${formatMoney(diff)}`, cls: "text-amber-600" };
        return { label: `Short: ${formatMoney(Math.abs(diff))}`, cls: "text-rose-600" };
    }, [cashAmountCollected, amountToCollect]);

    const transferBank = "VP Bank";
    const transferAccountNumber = "123456789";
    const transferAccountName = "Nguyen Van A";
    const [transferAmount, setTransferAmount] = useState<number>(() => amountToCollect ?? 0);
    const transferNote = `CX-${trackingId}`;

    useEffect(() => {
        if (amountToCollect != null) {
            setTransferAmount(amountToCollect);
        }
    }, [amountToCollect]);

    const handleCopyText = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch (e) {
            console.error(e);
        }
    };

    const handleConfirmPayment = async () => {
        const payload = {
            amount: paymentMethod === "TRANSFER" ? transferAmount : (amountToCollect ?? 0),
            currency: "VND",
            method: paymentMethod === "TRANSFER" ? "BANK_TRANSFER" : "CASH",
            provider: "INTERNAL",
        };

        await onUpdateShipmentStatus(shipment.id, CourierStatus.PAYMENT_CONFIRMED, payload);
        onConfirmPayment();
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
                <span className="text-xs font-semibold text-slate-400">Check Price Detail</span>
            </div>

            {/* Header 3 Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Card 1: Shipment Summary */}
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
                                <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                        isConfirmedPrice
                                            ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                                            : "bg-orange-50 text-orange-700 border-orange-100"
                                    }`}
                                >
                                    {isConfirmedPrice ? "Confirm price" : "Adjusted price"}
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

                {/* Card 2: Parties */}
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

                {/* Card 3: Parcel Info */}
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
                                {declaredValue ? `${declaredValue} VND` : "—"}
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

            {/* Main content */}
            <div className="space-y-6">
                {/* Information */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-slate-900">Information</h2>
                        <span className="text-[11px] font-semibold text-slate-400">
                            State: {isConfirmedPrice ? "Confirm price" : "Adjusted price"}
                        </span>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-1">Sender</p>
                            <p className="text-sm font-bold text-slate-900">{sender.name || "—"}</p>
                            <p className="text-xs text-slate-600">{sender.phone || "—"}</p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sender.address || "—"}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Branch</p>
                                <p className="text-xs font-semibold text-slate-800">{pickupBranchLabel}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Vehicle Type</p>
                                <p className="text-xs font-semibold text-slate-800">{vehicleType}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Window</p>
                                <p className="text-xs font-semibold text-slate-800">
                                    {latestPickupWindowStart && latestPickupWindowEnd
                                        ? `${formatDateTime(latestPickupWindowStart)} → ${formatDateTime(latestPickupWindowEnd)}`
                                        : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Shift</p>
                                <p className="text-xs font-semibold text-slate-800">
                                    {formatPickupShift(latestPickupShift)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment method */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-900">Payment method</h2>
                    </div>

                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">Amount to collect</p>
                        <input
                            aria-label="Amount to collect"
                            type="text"
                            readOnly
                            value={formatMoney(amountToCollect)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setPaymentMethod("CASH")}
                            className={`p-4 rounded-2xl border text-left transition-colors ${
                                paymentMethod === "CASH"
                                    ? "border-orange-400 bg-orange-50"
                                    : "border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            <p className="text-xs font-bold text-slate-900">Cash</p>
                            <p className="text-[11px] font-semibold text-slate-500">Collect cash from customer</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentMethod("TRANSFER")}
                            className={`p-4 rounded-2xl border text-left transition-colors ${
                                paymentMethod === "TRANSFER"
                                    ? "border-orange-400 bg-orange-50"
                                    : "border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            <p className="text-xs font-bold text-slate-900">Bank transfer</p>
                            <p className="text-[11px] font-semibold text-slate-500">Customer transfers via bank</p>
                        </button>
                    </div>

                    {/* CASH panel */}
                    <div
                        className={`rounded-2xl border p-4 ${paymentMethod === "CASH" ? "border-slate-200" : "border-slate-100 opacity-50"}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-slate-900">Cash</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="md:col-span-2">
                                <p className="text-[11px] font-semibold text-slate-400 mb-1">Amount collected</p>
                                <input
                                    aria-label="Cash amount collected"
                                    type="number"
                                    disabled={paymentMethod !== "CASH"}
                                    placeholder="Enter the amount collected"
                                    value={cashAmountCollected}
                                    onChange={(e) => setCashAmountCollected(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 disabled:bg-slate-50"
                                />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={paymentMethod !== "CASH"}
                                        onClick={() => setCashAmountCollected(String(amountToCollect ?? 0))}
                                        className="px-3 py-1.5 rounded-full text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        = Amount to collect
                                    </button>
                                </div>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-1">Difference</p>
                                <p className={`text-sm font-black ${cashDiff.cls}`}>{cashDiff.label}</p>
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            <button
                                type="button"
                                disabled={paymentMethod !== "CASH" || !cashAmountCollected}
                                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                Confirm collection
                            </button>
                        </div>
                    </div>

                    {/* TRANSFER panel */}
                    <div
                        className={`rounded-2xl border p-4 ${paymentMethod === "TRANSFER" ? "border-slate-200" : "border-slate-100 opacity-50"}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-slate-900">Transfer Panel</p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-1">Bank</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        aria-label="Bank account"
                                        type="text"
                                        readOnly
                                        value={transferBank}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopyText(transferBank)}
                                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-1">Account number</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        aria-label="Account number"
                                        type="text"
                                        readOnly
                                        value={transferAccountNumber}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopyText(transferAccountNumber)}
                                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-1">Account name</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        aria-label="Account name"
                                        type="text"
                                        readOnly
                                        value={transferAccountName}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopyText(transferAccountName)}
                                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-1">Amount</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        aria-label="Transfer amount"
                                        type="number"
                                        disabled={paymentMethod !== "TRANSFER"}
                                        value={transferAmount}
                                        onChange={(e) => setTransferAmount(parseFloat(e.target.value || "0"))}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 disabled:bg-slate-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopyText(String(transferAmount))}
                                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-1">Transfer description</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        aria-label="Transfer description"
                                        type="text"
                                        readOnly
                                        value={transferNote}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopyText(transferNote)}
                                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={handleConfirmPayment}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                        >
                            Confirm payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface PaymentConfirmDetailProps {
    shipment: any;
    branches: any[];
    onBack: () => void;
    onPickupComplete: () => void;
    onUpdateShipmentStatus: (shipmentId: string, status: CourierStatus, payload?: any) => Promise<void>;
    user: User;
}

const PaymentConfirmDetail: React.FC<PaymentConfirmDetailProps> = ({
    shipment,
    branches,
    onBack,
    onPickupComplete,
    onUpdateShipmentStatus,
    user,
}) => {
    const status = shipment.status as CourierStatus;
    const isConfirmed = status === CourierStatus.CONFIRM_PAYMENT;
    const trackingId = shipment.trackingId || shipment.id;
    const createdAt = shipment.bookingDate;
    const updatedAt = shipment.updatedAt || shipment.updated_at || null;
    const serviceType = shipment.serviceType || "Standard";

    const sender = shipment.sender || {};
    const receiver = shipment.receiver || {};

    const declaredValue = shipment.declaredValue || shipment.details?.declared_value || null;
    const goodsType = shipment.product?.category || shipment.details?.type || "—";

    const pickupBranchId = shipment.branch_id || shipment.branchId || shipment.branch || null;
    const pickupBranchObj = branches.find((b) => (b.id || b.branch_id)?.toString() === pickupBranchId?.toString());
    const pickupBranchLabel = pickupBranchObj?.name || pickupBranchObj?.branch_code || pickupBranchId || "—";

    const vehicleType =
        shipment.vehicleType ||
        shipment.vehicle_type ||
        shipment.vehicle?.type ||
        shipment.vehicle?.vehicle_type ||
        "—";

    const latestPickupWindowStart: string = shipment.pickupWindow?.start || shipment.pickupWindowStart || "";
    const latestPickupWindowEnd: string = shipment.pickupWindow?.end || shipment.pickupWindowEnd || "";
    const latestPickupShift = shipment.pickupShift || "";

    const estimatedDimensions = shipment.product?.dimensions || shipment.details?.dimensions || "—";
    const estimatedWeight = shipment.product?.weight || shipment.details?.weight || shipment.actualWeight || "—";
    const estimatedVolume = (() => {
        const match = estimatedDimensions?.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
        if (!match) return "—";
        const [l, w, h] = match.slice(1).map((v: string) => parseFloat(v));
        if (l && w && h) return ((l * w * h) / 1000000).toFixed(4);
        return "—";
    })();
    const estimatedCharge = shipment.fee ?? shipment.pricing?.total ?? null;

    const actualDimensions = shipment.details?.actual_dimensions || shipment.actualDimensions || "—";
    const actualWeight = shipment.actualWeight || shipment.details?.actual_weight || "—";
    const actualVolume = (() => {
        const match = actualDimensions?.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
        if (!match) return "—";
        const [l, w, h] = match.slice(1).map((v: string) => parseFloat(v));
        if (l && w && h) return ((l * w * h) / 1000000).toFixed(4);
        return "—";
    })();
    const actualCharge =
        shipment.actualFee || shipment.pricing?.adjusted_total || shipment.pricing?.total || estimatedCharge || null;

    const formatDateTime = (value: string | null | undefined) => {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString();
    };

    const formatPickupShift = (shift: string) => {
        switch (shift?.toUpperCase()) {
            case "MORNING":
                return "Morning";
            case "AFTERNOON":
                return "Afternoon";
            case "EVENING":
                return "Evening";
            default:
                return "—";
        }
    };

    const formatMoney = (value: number | null | undefined) => {
        if (value == null) return "—";
        return `$${(value / 25000).toFixed(2)}`;
    };

    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const isStaff = user.role === UserRole.ADMIN || user.role === UserRole.AGENT;
    const [confirmingPayment, setConfirmingPayment] = useState(false);
    const [completingPickup, setCompletingPickup] = useState(false);

    const handleConfirmPayment = async () => {
        if (!isStaff) return;
        try {
            setConfirmingPayment(true);
            await onUpdateShipmentStatus(shipment.id, CourierStatus.PAYMENT_CONFIRMED);
        } catch (e) {
            console.error(e);
            alert("Error: Could not confirm payment.");
        } finally {
            setConfirmingPayment(false);
        }
    };

    const handlePickupComplete = async () => {
        if (!isStaff) return;
        try {
            setCompletingPickup(true);
            await onUpdateShipmentStatus(shipment.id, CourierStatus.PICKUP_COMPLETED);
            onPickupComplete();
        } catch (e) {
            console.error(e);
            alert("Error: Could not mark pickup complete.");
        } finally {
            setCompletingPickup(false);
        }
    };

    const handleChooseFiles = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploadedImages((prev) => {
            const remainingSlots = Math.max(0, 4 - prev.length);
            const selected = files.slice(0, remainingSlots);
            const newUrls = selected.map((file) => URL.createObjectURL(file));
            return [...prev, ...newUrls];
        });
        // reset input so the same file can be chosen again if needed
        e.target.value = "";
    };

    const handleRemoveImage = (idx: number) => {
        setUploadedImages((prev) => {
            const next = [...prev];
            const [removed] = next.splice(idx, 1);
            if (removed?.startsWith("blob:")) {
                URL.revokeObjectURL(removed);
            }
            return next;
        });
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
                <span className="text-xs font-semibold text-slate-400">Payment Confirm Detail</span>
            </div>

            {/* Header 3 Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Card 1: Shipment Summary */}
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
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
                                    {isConfirmed ? "Confirm Payment" : "Pending Payment"}
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

                {/* Card 2: Parties */}
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

                {/* Card 3: Parcel Info */}
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
                                {declaredValue ? `${declaredValue} VND` : "—"}
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

            {/* Main Content */}
            <div className="space-y-4">
                {/* Information */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-slate-900">Information</h2>
                        <span className="text-[11px] font-semibold text-slate-400">
                            State: {isConfirmed ? "Confirm Payment" : "Pending Payment"}
                        </span>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-1">Sender</p>
                            <p className="text-sm font-bold text-slate-900">{sender.name || "—"}</p>
                            <p className="text-xs text-slate-600">{sender.phone || "—"}</p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sender.address || "—"}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Branch</p>
                                <p className="text-xs font-semibold text-slate-800">{pickupBranchLabel}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Vehicle Type</p>
                                <p className="text-xs font-semibold text-slate-800">{vehicleType}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Window</p>
                                <p className="text-xs font-semibold text-slate-800">
                                    {latestPickupWindowStart && latestPickupWindowEnd
                                        ? `${formatDateTime(latestPickupWindowStart)} → ${formatDateTime(latestPickupWindowEnd)}`
                                        : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Shift</p>
                                <p className="text-xs font-semibold text-slate-800">
                                    {formatPickupShift(latestPickupShift)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Waybill & Upload */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-bold text-slate-900">Waybill & Proof</h2>
                        <span className="text-[11px] font-semibold text-slate-400">Max 4 images</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        <div className="md:col-span-1 space-y-2">
                            <p className="text-xs text-slate-600">Print Waybill</p>
                            <button
                                type="button"
                                className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold border bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                                Download / Print
                            </button>
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <div className="flex flex-wrap gap-3">
                                {uploadedImages.map((url, idx) => (
                                    <div
                                        key={url}
                                        className="relative w-28 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-50"
                                    >
                                        <img
                                            src={url}
                                            alt={`Proof ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(idx)}
                                            className="absolute top-1 right-1 bg-white/90 border border-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm hover:bg-rose-50 hover:text-rose-600"
                                            aria-label={`Remove proof image ${idx + 1}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                {uploadedImages.length < 4 && (
                                    <button
                                        type="button"
                                        onClick={handleChooseFiles}
                                        className="w-28 h-20 rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-400 hover:border-orange-400 hover:text-orange-500 flex items-center justify-center"
                                    >
                                        + Upload
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                    aria-label="Upload proof images"
                                />
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Demo only: click Upload to add placeholder images (max 4).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-end">
                    {isStaff && (
                        <button
                            type="button"
                            onClick={handleConfirmPayment}
                            disabled={confirmingPayment || isConfirmed}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                confirmingPayment || isConfirmed
                                    ? "bg-slate-200 border-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                            }`}
                        >
                            {confirmingPayment && <Loader2 size={14} className="animate-spin" />}
                            Confirm payment
                        </button>
                    )}

                    {isStaff && (
                        <button
                            type="button"
                            onClick={handlePickupComplete}
                            disabled={completingPickup}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                completingPickup
                                    ? "bg-slate-200 border-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                            }`}
                        >
                            {completingPickup && <Loader2 size={14} className="animate-spin" />}
                            Pickup Complete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface PickupCompleteDetailProps {
    shipment: any;
    branches: any[];
    onBack: () => void;
    onCreatedReconciliation: () => void;
    onUpdateShipmentStatus: (shipmentId: string, status: CourierStatus, payload?: any) => Promise<void>;
    user: User;
}

const PickupCompleteDetail: React.FC<PickupCompleteDetailProps> = ({
    shipment,
    branches,
    onBack,
    onCreatedReconciliation,
    onUpdateShipmentStatus,
    user,
}) => {
    const trackingId = shipment.trackingId || shipment.id;
    const createdAt = shipment.bookingDate;
    const updatedAt = shipment.updatedAt || shipment.updated_at || null;
    const serviceType = shipment.serviceType || "Standard";

    const sender = shipment.sender || {};
    const receiver = shipment.receiver || {};

    const declaredValue = shipment.declaredValue || shipment.details?.declared_value || null;
    const goodsType = shipment.product?.category || shipment.details?.type || "—";

    const pickupBranchId = shipment.branch_id || shipment.branchId || shipment.branch || null;
    const pickupBranchObj = branches.find((b) => (b.id || b.branch_id)?.toString() === pickupBranchId?.toString());
    const pickupBranchLabel = pickupBranchObj?.name || pickupBranchObj?.branch_code || pickupBranchId || "—";

    const vehicleType =
        shipment.vehicleType ||
        shipment.vehicle_type ||
        shipment.vehicle?.type ||
        shipment.vehicle?.vehicle_type ||
        "—";

    const latestPickupWindowStart: string = shipment.pickupWindow?.start || shipment.pickupWindowStart || "";
    const latestPickupWindowEnd: string = shipment.pickupWindow?.end || shipment.pickupWindowEnd || "";
    const latestPickupShift = shipment.pickupShift || "";

    const estimatedDimensions = shipment.product?.dimensions || shipment.details?.dimensions || "—";
    const estimatedWeight = shipment.product?.weight || shipment.details?.weight || shipment.actualWeight || "—";
    const estimatedVolume = (() => {
        const match = estimatedDimensions?.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
        if (!match) return "—";
        const [l, w, h] = match.slice(1).map((v: string) => parseFloat(v));
        if (l && w && h) return ((l * w * h) / 1000000).toFixed(4);
        return "—";
    })();

    const estimatedCharge = shipment.fee ?? shipment.pricing?.total ?? null;

    const actualDimensions = shipment.details?.actual_dimensions || shipment.actualDimensions || "—";
    const actualWeight = shipment.actualWeight || shipment.details?.actual_weight || "—";
    const actualVolume = (() => {
        const match = actualDimensions?.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
        if (!match) return "—";
        const [l, w, h] = match.slice(1).map((v: string) => parseFloat(v));
        if (l && w && h) return ((l * w * h) / 1000000).toFixed(4);
        return "—";
    })();

    const actualCharge =
        shipment.actualFee || shipment.pricing?.adjusted_total || shipment.pricing?.total || estimatedCharge || null;

    const formatDateTime = (value: string | null | undefined) => {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString();
    };

    const formatPickupShift = (shift: string) => {
        switch (shift?.toUpperCase()) {
            case "MORNING":
                return "Morning";
            case "AFTERNOON":
                return "Afternoon";
            case "EVENING":
                return "Evening";
            default:
                return "—";
        }
    };

    const formatMoney = (value: number | null | undefined) => {
        if (value == null) return "—";
        return `$${(value / 25000).toFixed(2)}`;
    };

    const [reconShift, setReconShift] = useState<"SHIFT_1" | "SHIFT_2" | "">("");
    const [checkInTime, setCheckInTime] = useState<string>(() => {
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    });

    const isStaff = user.role === UserRole.ADMIN || user.role === UserRole.AGENT;
    const [creatingRecon, setCreatingRecon] = useState(false);

    const handleCreateReconciliation = async () => {
        if (!isStaff) return;
        if (!reconShift) {
            alert("Please choose shift.");
            return;
        }

        try {
            setCreatingRecon(true);
            await onUpdateShipmentStatus(shipment.id, CourierStatus.IN_ORIGIN_WAREHOUSE, {
                reconShift,
                checkInTime,
            });
            onCreatedReconciliation();
        } catch (e) {
            console.error(e);
            alert("Error: Could not create reconciliation session.");
        } finally {
            setCreatingRecon(false);
        }
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
                <span className="text-xs font-semibold text-slate-400">Pickup Complete Detail</span>
            </div>

            {/* Header 3 Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Card 1: Shipment Summary */}
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
                                    Pickup complete
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

                {/* Card 2: Parties */}
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

                {/* Card 3: Parcel Info */}
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
                                {declaredValue ? `${declaredValue} VND` : "—"}
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

            <div className="space-y-6">
                {/* Information */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-slate-900">Information</h2>
                        <span className="text-[11px] font-semibold text-slate-400">State: Pickup complete</span>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-1">Sender</p>
                            <p className="text-sm font-bold text-slate-900">{sender.name || "—"}</p>
                            <p className="text-xs text-slate-600">{sender.phone || "—"}</p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sender.address || "—"}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Branch</p>
                                <p className="text-xs font-semibold text-slate-800">{pickupBranchLabel}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Vehicle Type</p>
                                <p className="text-xs font-semibold text-slate-800">{vehicleType}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Window</p>
                                <p className="text-xs font-semibold text-slate-800">
                                    {latestPickupWindowStart && latestPickupWindowEnd
                                        ? `${formatDateTime(latestPickupWindowStart)} → ${formatDateTime(latestPickupWindowEnd)}`
                                        : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Shift</p>
                                <p className="text-xs font-semibold text-slate-800">
                                    {formatPickupShift(latestPickupShift)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Create reconciliation session */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-slate-900">Create Reconciliation Session</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-12 space-y-4">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-2">Select shift</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <label
                                        className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${reconShift === "SHIFT_1" ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:bg-slate-50"}`}
                                    >
                                        <input
                                            type="radio"
                                            name="reconShift"
                                            checked={reconShift === "SHIFT_1"}
                                            onChange={() => setReconShift("SHIFT_1")}
                                            className="w-4 h-4"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">Ca 1</p>
                                            <p className="text-[11px] font-semibold text-slate-500">7h-12h</p>
                                        </div>
                                    </label>
                                    <label
                                        className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${reconShift === "SHIFT_2" ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:bg-slate-50"}`}
                                    >
                                        <input
                                            type="radio"
                                            name="reconShift"
                                            checked={reconShift === "SHIFT_2"}
                                            onChange={() => setReconShift("SHIFT_2")}
                                            className="w-4 h-4"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">Ca 2</p>
                                            <p className="text-[11px] font-semibold text-slate-500">13h-18h</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 mb-1">Check-in Time</p>
                                    <input
                                        aria-label="Check-in time"
                                        type="datetime-local"
                                        value={checkInTime}
                                        onChange={(e) => setCheckInTime(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900"
                                    />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 mb-1">
                                        Tracking ID for Reconciliation
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            aria-label="Tracking ID"
                                            type="text"
                                            value={trackingId}
                                            readOnly
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(trackingId)}
                                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                            title="Copy"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                {isStaff && (
                                    <button
                                        type="button"
                                        onClick={handleCreateReconciliation}
                                        disabled={creatingRecon}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                            creatingRecon
                                                ? "bg-slate-200 border-slate-200 text-slate-500 cursor-not-allowed"
                                                : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                                        }`}
                                    >
                                        {creatingRecon && <Loader2 size={14} className="animate-spin" />}
                                        Create Reconciliation Session
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ShipmentsPickup({ user }: { user: User }) {
    const isCustomer = user.role === UserRole.CUSTOMER;
    const isAdmin = user.role === UserRole.ADMIN;
    const isStaff = user.role === UserRole.ADMIN || user.role === UserRole.AGENT;

    const [activeTab, setActiveTab] = useState<PickupTab>("ON_THE_WAY");
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
                const allowedStatuses = pickupTabToStatuses[activeTab];
                const statusParam = allowedStatuses.join(",");

                const params: any = { per_page: 1000, status: statusParam };
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
                        branch: String(courier.branchId ?? courier.branch_id ?? ""),
                        vehicleType: courier.vehicleType || "N/A",
                        sender: courier.sender,
                        receiver: courier.receiver,
                        route: {
                            pickup: courier.sender.address,
                            delivery: courier.receiver.address,
                        },
                        serviceType: courier.serviceType || "Standard",
                        product: {
                            category: courier.details?.type,
                            weight: courier.details?.weight,
                            dimensions: courier.details?.dimensions,
                        },
                        details: courier.details,
                        fee: courier.fee,
                        actualWeight: courier.actualWeight,
                        status: courier.status,
                        bookingDate: courier.bookingDate,
                        updatedAt: courier.updatedAt,
                        paymentMethod: courier.paymentMethod,
                        pickupWindow: courier.pickupWindow,
                        pickupWindowStart: courier.pickupWindowStart,
                        pickupWindowEnd: courier.pickupWindowEnd,
                        pickupShift: courier.pickupShift,
                        branchId: courier.branchId,
                    }));

                    setRows(transformed);
                } else {
                    setError("Failed to fetch shipments");
                }
            } catch (e) {
                console.error(e);
                setError("Failed to fetch shipments");
            } finally {
                setLoading(false);
            }
        };

        if (activeTab === "PAYMENT_CONFIRM" && user.role === UserRole.CUSTOMER) {
            setRows([]);
            setLoading(false);
            return;
        }

        fetchData();
    }, [activeTab, user.role]);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const resp = await BranchService.getAll({ per_page: 1000 });
                if (resp.data?.success) {
                    setBranches(resp.data.data || []);
                }
            } catch (e) {
                console.error(e);
            }
        };
        if (isAdmin) fetchBranches();
    }, [isAdmin]);

    useEffect(() => setCurrentPage(1), [activeTab]);

    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    const filtered = useMemo(() => {
        const allowed = pickupTabToStatuses[activeTab];
        return rows.filter((r) => allowed.includes(r.status as CourierStatus));
    }, [rows, activeTab]);

    const finalData = useMemo(() => {
        return filtered.filter((item) => {
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
    }, [filtered, filters, user, isCustomer, branches]);

    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(finalData.length / itemsPerPage));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedData = finalData.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

    if (activeTab === "ON_THE_WAY" && selectedShipment) {
        return (
            <OnTheWayPickupDetail
                shipment={selectedShipment}
                branches={branches}
                onBack={() => setSelectedShipment(null)}
                onGoToCheckItem={() => {
                    setSelectedShipment(null);
                    setActiveTab("CHECK_ITEM");
                }}
            />
        );
    }

    const handleUpdateShipmentStatus = async (shipmentId: string, status: CourierStatus, payload?: any) => {
        try {
            await ShipmentService.updateStatus(shipmentId, { status: String(status), payload });
            setRows((prevRows) =>
                prevRows.map((row) =>
                    row.id === shipmentId ? { ...row, status, updatedAt: new Date().toISOString() } : row,
                ),
            );
        } catch (error) {
            console.error("Failed to update shipment status:", error);
            alert("Error: Could not update shipment status.");
            // Optionally re-throw or handle the error more gracefully
            throw error;
        }
    };

    if (activeTab === "CHECK_ITEM" && selectedShipment) {
        return (
            <CheckItemDetail
                shipment={selectedShipment}
                branches={branches}
                onBack={() => setSelectedShipment(null)}
                onGoToCheckPrice={() => {
                    setSelectedShipment(null);
                    setActiveTab("CHECK_PRICE");
                }}
                onGoToClosed={() => {
                    setSelectedShipment(null);
                }}
                onUpdateShipmentStatus={handleUpdateShipmentStatus}
            />
        );
    }

    if (activeTab === "CHECK_PRICE" && selectedShipment) {
        return (
            <CheckPriceDetail
                shipment={selectedShipment}
                branches={branches}
                onBack={() => setSelectedShipment(null)}
                onConfirmPayment={() => {
                    setSelectedShipment(null);
                    setActiveTab("PAYMENT_CONFIRM");
                }}
                onUpdateShipmentStatus={handleUpdateShipmentStatus}
            />
        );
    }

    if (activeTab === "PAYMENT_CONFIRM" && selectedShipment) {
        if (user.role === UserRole.CUSTOMER) {
            setSelectedShipment(null);
            setActiveTab("ON_THE_WAY");
            return null;
        }

        return (
            <PaymentConfirmDetail
                shipment={selectedShipment}
                branches={branches}
                onBack={() => setSelectedShipment(null)}
                onPickupComplete={() => {
                    setSelectedShipment(null);
                    setActiveTab("PICKUP_COMPLETE");
                }}
                onUpdateShipmentStatus={handleUpdateShipmentStatus}
                user={user}
            />
        );
    }

    if (activeTab === "PICKUP_COMPLETE" && selectedShipment) {
        if (!isStaff) {
            setSelectedShipment(null);
            setActiveTab("ON_THE_WAY");
            return null;
        }

        return (
            <PickupCompleteDetail
                shipment={selectedShipment}
                branches={branches}
                onBack={() => setSelectedShipment(null)}
                onCreatedReconciliation={() => {
                    setSelectedShipment(null);
                    setActiveTab("ON_THE_WAY");
                }}
                onUpdateShipmentStatus={handleUpdateShipmentStatus}
                user={user}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pickup Shipments</h1>
            </div>

            <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-sm p-1">
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-1">
                    {(isCustomer
                        ? [{ id: "ON_THE_WAY" as PickupTab, label: "Set On The Way Pickup", Icon: Truck }]
                        : [
                              { id: "ON_THE_WAY" as PickupTab, label: "Set On The Way Pickup", Icon: Truck },
                              { id: "CHECK_ITEM" as PickupTab, label: "Check Item", Icon: PackageSearch },
                              { id: "CHECK_PRICE" as PickupTab, label: "Check Price", Icon: DollarSign },
                              ...(user.role === UserRole.CUSTOMER
                                  ? []
                                  : [
                                        {
                                            id: "PAYMENT_CONFIRM" as PickupTab,
                                            label: "Payment Confirm",
                                            Icon: CreditCard,
                                        },
                                    ]),
                              { id: "PICKUP_COMPLETE" as PickupTab, label: "Pickup Complete", Icon: PackageCheck },
                          ]
                    ).map(({ id, label, Icon }) => {
                        const active = activeTab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setActiveTab(id)}
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
                            onClick={() => setFilters({ orderId: "", branch: "", serviceType: "" })}
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
                                    aria-label="Search by tracking ID"
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
                                    <Truck
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
                                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Tracking ID
                                </th>
                                {!isCustomer && (
                                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Branch
                                    </th>
                                )}
                                {!isCustomer && (
                                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Fleet
                                    </th>
                                )}
                                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Pickup Address
                                </th>
                                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Delivery Address
                                </th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Box size={14} />
                                        Weight
                                    </div>
                                </th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-500 tracking-tight text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Box size={14} />
                                        Dimensions
                                    </div>
                                </th>
                                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                                    Fee
                                </th>
                                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                                    Status
                                </th>
                                {(activeTab === "ON_THE_WAY" ||
                                    activeTab === "CHECK_ITEM" ||
                                    activeTab === "CHECK_PRICE" ||
                                    activeTab === "PAYMENT_CONFIRM" ||
                                    activeTab === "PICKUP_COMPLETE") && (
                                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                                        Action
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={
                                            isCustomer
                                                ? 7
                                                : activeTab === "ON_THE_WAY" ||
                                                    activeTab === "CHECK_ITEM" ||
                                                    activeTab === "CHECK_PRICE" ||
                                                    activeTab === "PAYMENT_CONFIRM" ||
                                                    activeTab === "PICKUP_COMPLETE"
                                                  ? 10
                                                  : 9
                                        }
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
                                        colSpan={
                                            isCustomer
                                                ? 7
                                                : activeTab === "ON_THE_WAY" ||
                                                    activeTab === "CHECK_ITEM" ||
                                                    activeTab === "CHECK_PRICE" ||
                                                    activeTab === "PAYMENT_CONFIRM" ||
                                                    activeTab === "PICKUP_COMPLETE"
                                                  ? 10
                                                  : 9
                                        }
                                        className="px-6 py-20 text-center"
                                    >
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
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-black text-slate-900 leading-none truncate">
                                                            {row.trackingId || row.id}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            ID: {row.id}
                                                        </span>
                                                    </div>
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
                                            {(activeTab === "ON_THE_WAY" ||
                                                activeTab === "CHECK_ITEM" ||
                                                activeTab === "CHECK_PRICE" ||
                                                activeTab === "PAYMENT_CONFIRM" ||
                                                activeTab === "PICKUP_COMPLETE") && (
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
                                        colSpan={
                                            isCustomer
                                                ? 7
                                                : activeTab === "ON_THE_WAY" ||
                                                    activeTab === "CHECK_ITEM" ||
                                                    activeTab === "CHECK_PRICE" ||
                                                    activeTab === "PAYMENT_CONFIRM" ||
                                                    activeTab === "PICKUP_COMPLETE"
                                                  ? 10
                                                  : 9
                                        }
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
