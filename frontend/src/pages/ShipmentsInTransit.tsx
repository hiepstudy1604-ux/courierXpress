import React, { useEffect, useMemo, useRef, useState } from "react";
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
    Truck,
    Image as ImageIcon,
} from "lucide-react";
import { CourierService, ShipmentService, BranchService } from "../services/api";

type InTransitTab = "IN_ORIGIN_WAREHOUSE" | "IN_TRANSIT" | "IN_DEST_WAREHOUSE" | "OUT_FOR_DELIVERY";

const inTransitTabToStatuses: Record<InTransitTab, CourierStatus[]> = {
    IN_ORIGIN_WAREHOUSE: [CourierStatus.IN_ORIGIN_WAREHOUSE],
    IN_TRANSIT: [CourierStatus.IN_TRANSIT],
    IN_DEST_WAREHOUSE: [CourierStatus.IN_DEST_WAREHOUSE],
    OUT_FOR_DELIVERY: [CourierStatus.OUT_FOR_DELIVERY],
};

const getStatusConfig = (status: CourierStatus) => {
    switch (status) {
        case CourierStatus.IN_ORIGIN_WAREHOUSE:
            return { label: "IN ORIGIN WAREHOUSE", styles: "bg-purple-50 text-purple-600 border-purple-100" };
        case CourierStatus.IN_TRANSIT:
            return { label: "IN TRANSIT", styles: "bg-orange-50 text-orange-600 border-orange-100" };
        case CourierStatus.IN_DEST_WAREHOUSE:
            return { label: "IN DEST WAREHOUSE", styles: "bg-violet-50 text-violet-600 border-violet-100" };
        case CourierStatus.OUT_FOR_DELIVERY:
            return { label: "OUT FOR DELIVERY", styles: "bg-orange-50 text-orange-600 border-orange-100" };
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

interface InOriginWarehouseDetailProps {
    shipment: any;
    branches: any[];
    onBack: () => void;
    onMoveToInTransit: () => void;
    onMoveToIssue: () => void;
}

const InOriginWarehouseDetail: React.FC<InOriginWarehouseDetailProps> = ({
    shipment,
    branches,
    onBack,
    onMoveToInTransit,
    onMoveToIssue,
}) => {
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

    const proofImageUrl = shipment.details?.images?.[0] || shipment.images?.[0] || shipment.image || null;

    const [isCashCollected, setIsCashCollected] = useState(false);
    const [isSealIntact, setIsSealIntact] = useState(false);
    const [isPacked, setIsPacked] = useState(false);
    const [isRouteLabeled, setIsRouteLabeled] = useState(false);

    const allChecked = isCashCollected && isSealIntact && isPacked && isRouteLabeled;

    const handleMoveToInTransit = () => {
        if (!allChecked) return;
        alert("Move to in transit (demo): Status → IN_TRANSIT. Switching to In transit tab.");
        onMoveToInTransit();
    };

    const handleMoveToIssue = () => {
        alert("Move to issue (demo): Status → ISSUE. Navigating to Issue page.");
        onMoveToIssue();
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
                <span className="text-xs font-semibold text-slate-400">In origin warehouse detail</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                                    In origin warehouse
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

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-4">
                            <p className="text-[11px] font-semibold text-slate-400 mb-2">Goods photo</p>
                            {proofImageUrl ? (
                                <img
                                    src={proofImageUrl}
                                    alt="Goods"
                                    className="w-full max-w-[280px] rounded-2xl border border-slate-200"
                                />
                            ) : (
                                <div className="w-full max-w-[280px] h-40 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                                    <div className="text-center">
                                        <ImageIcon size={22} className="mx-auto text-slate-400" />
                                        <p className="text-xs text-slate-400 mt-2">No image</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-8 space-y-3">
                            <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isCashCollected}
                                    onChange={(e) => setIsCashCollected(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-semibold text-slate-700">Cash collected in full</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isSealIntact}
                                    onChange={(e) => setIsSealIntact(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-semibold text-slate-700">Package intact and sealed</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPacked}
                                    onChange={(e) => setIsPacked(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-semibold text-slate-700">Bagged and packaged</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isRouteLabeled}
                                    onChange={(e) => setIsRouteLabeled(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-semibold text-slate-700">Route label applied</span>
                            </label>

                            <div className="flex flex-wrap justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleMoveToIssue}
                                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
                                >
                                    Move to issue
                                </button>

                                <button
                                    type="button"
                                    disabled={!allChecked}
                                    onClick={handleMoveToInTransit}
                                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                                >
                                    Move to in transit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface InTransitDetailProps {
    shipment: any;
    branches: any[];
    onBack: () => void;
    onMoveToIssue: () => void;
    onMoveToDestinationWarehouse: () => void;
}

const InTransitDetail: React.FC<InTransitDetailProps> = ({
    shipment,
    branches,
    onBack,
    onMoveToIssue,
    onMoveToDestinationWarehouse,
}) => {
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

    const [dispatchHandoverFromOrigin, setDispatchHandoverFromOrigin] = useState(false);
    const [dispatchEnoughQty, setDispatchEnoughQty] = useState(false);
    const [dispatchSigned, setDispatchSigned] = useState(false);

    const [journeyChangeVehicle, setJourneyChangeVehicle] = useState(false);
    const [journeyAccidentDelay, setJourneyAccidentDelay] = useState(false);
    const [journeySealDamaged, setJourneySealDamaged] = useState(false);

    const [arriveHandoverToDest, setArriveHandoverToDest] = useState(false);
    const [arriveEnoughQty, setArriveEnoughQty] = useState(false);
    const [arriveSigned, setArriveSigned] = useState(false);

    const canMoveToIssue = journeyChangeVehicle || journeyAccidentDelay || journeySealDamaged;
    const canMoveToDestWarehouse =
        dispatchHandoverFromOrigin &&
        dispatchEnoughQty &&
        dispatchSigned &&
        arriveHandoverToDest &&
        arriveEnoughQty &&
        arriveSigned;

    const handleMoveToIssue = () => {
        if (!canMoveToIssue) return;
        alert("Move to issue (demo): Status → ISSUE. Navigating to Issue page.");
        onMoveToIssue();
    };

    const handleMoveToDestWarehouse = () => {
        if (!canMoveToDestWarehouse) return;
        alert(
            "Move to destination warehouse (demo): Status → IN_DEST_WAREHOUSE. Switching to In destination warehouse tab.",
        );
        onMoveToDestinationWarehouse();
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
                <span className="text-xs font-semibold text-slate-400">In transit detail</span>
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
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">
                                    In transit
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
                    <h2 className="text-sm font-bold text-slate-900 mb-3">Dispatch (Outbound)</h2>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={dispatchHandoverFromOrigin}
                                onChange={(e) => setDispatchHandoverFromOrigin(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">
                                Received handover from origin warehouse
                            </span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={dispatchEnoughQty}
                                onChange={(e) => setDispatchEnoughQty(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">Sufficient quantity of goods</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={dispatchSigned}
                                onChange={(e) => setDispatchSigned(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">
                                Signed handover documents for goods and records
                            </span>
                        </label>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 mb-3">Journey tracking</h2>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={journeyChangeVehicle}
                                onChange={(e) => setJourneyChangeVehicle(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">Vehicle change</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={journeyAccidentDelay}
                                onChange={(e) => setJourneyAccidentDelay(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">Trip delay / accident</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={journeySealDamaged}
                                onChange={(e) => setJourneySealDamaged(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">
                                Seal torn / goods damaged in transit
                            </span>
                        </label>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 mb-3">Arrival (Inbound)</h2>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={arriveHandoverToDest}
                                onChange={(e) => setArriveHandoverToDest(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">
                                Handed over goods to destination warehouse
                            </span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={arriveEnoughQty}
                                onChange={(e) => setArriveEnoughQty(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">Sufficient quantity of goods</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={arriveSigned}
                                onChange={(e) => setArriveSigned(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">
                                Signed handover documents for goods and records
                            </span>
                        </label>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 pt-4">
                        <button
                            type="button"
                            disabled={!canMoveToIssue}
                            onClick={handleMoveToIssue}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
                        >
                            Move to Issue
                        </button>

                        <button
                            type="button"
                            disabled={!canMoveToDestWarehouse}
                            onClick={handleMoveToDestWarehouse}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                        >
                            Move to destination warehouse
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface InDestWarehouseDetailProps {
    shipment: any;
    branches: any[];
    onBack: () => void;
    onMoveToIssue: () => void;
    onMoveToOutForDelivery: () => void;
}

const InDestWarehouseDetail: React.FC<InDestWarehouseDetailProps> = ({
    shipment,
    branches,
    onBack,
    onMoveToIssue,
    onMoveToOutForDelivery,
}) => {
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

    const [docsCollected, setDocsCollected] = useState(false);
    const [receivedAllPackages, setReceivedAllPackages] = useState(false);
    const [sealIntact, setSealIntact] = useState(false);
    const [routeLabelCorrect, setRouteLabelCorrect] = useState(false);

    const canMoveToOutForDelivery = docsCollected && receivedAllPackages && sealIntact && routeLabelCorrect;

    const handleMoveToIssue = () => {
        alert("Move to issue (demo): Status → ISSUE. Navigating to Issue page.");
        onMoveToIssue();
    };

    const handleMoveToOutForDelivery = () => {
        if (!canMoveToOutForDelivery) return;
        alert("Move to out for delivery (demo): Status → OUT_FOR_DELIVERY. Switching to Out for delivery tab.");
        onMoveToOutForDelivery();
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
                <span className="text-xs font-semibold text-slate-400">In destination warehouse detail</span>
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
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100">
                                    In destination warehouse
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

                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={docsCollected}
                                onChange={(e) => setDocsCollected(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">Collected all required documents and goods</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={receivedAllPackages}
                                onChange={(e) => setReceivedAllPackages(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">Received all packages</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={sealIntact}
                                onChange={(e) => setSealIntact(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">Package intact and sealed</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={routeLabelCorrect}
                                onChange={(e) => setRouteLabelCorrect(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700">Route/warehouse label is correct</span>
                        </label>

                        <div className="flex flex-wrap justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleMoveToIssue}
                                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
                            >
                                Move to Issue
                            </button>

                            <button
                                type="button"
                                disabled={!canMoveToOutForDelivery}
                                onClick={handleMoveToOutForDelivery}
                                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                            >
                                Move to out for delivery
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface OutForDeliveryDetailProps {
    shipment: any;
    branches: any[];
    onBack: () => void;
    onMoveToIssue: () => void;
    onDeliverySuccess: () => void;
}

const OutForDeliveryDetail: React.FC<OutForDeliveryDetailProps> = ({
    shipment,
    branches,
    onBack,
    onMoveToIssue,
    onDeliverySuccess,
}) => {
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

    const [deliveryResult, setDeliveryResult] = useState<"SUCCESS" | "FAIL" | "">("");

    const [deliveredOrderImage, setDeliveredOrderImage] = useState<string | null>(null);
    const [deliveryAddressImage, setDeliveryAddressImage] = useState<string | null>(null);
    const [matchedNamePhone, setMatchedNamePhone] = useState(false);

    const [failNoContact, setFailNoContact] = useState(false);
    const [failWrongAddress, setFailWrongAddress] = useState(false);
    const [failCustomerRefuse, setFailCustomerRefuse] = useState(false);
    const [failDamaged, setFailDamaged] = useState(false);

    const deliveredOrderRef = useRef<HTMLInputElement | null>(null);
    const deliveryAddressRef = useRef<HTMLInputElement | null>(null);

    const canMoveToIssue =
        deliveryResult === "FAIL" && (failNoContact || failWrongAddress || failCustomerRefuse || failDamaged);
    const canDeliverySuccess =
        deliveryResult === "SUCCESS" && !!deliveredOrderImage && !!deliveryAddressImage && matchedNamePhone;

    const handleChooseDeliveredOrderImage = () => deliveredOrderRef.current?.click();
    const handleChooseDeliveryAddressImage = () => deliveryAddressRef.current?.click();

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: React.Dispatch<React.SetStateAction<string | null>>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setter((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return url;
        });
        e.target.value = "";
    };

    const handleMoveToIssue = () => {
        if (!canMoveToIssue) return;
        alert("Move to issue (demo): Status → ISSUE. Navigating to Issue page.");
        onMoveToIssue();
    };

    const handleDeliverySuccess = () => {
        if (!canDeliverySuccess) return;
        alert("Delivery success (demo): Status → DELIVERED. Navigating to Delivered page.");
        onDeliverySuccess();
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
                <span className="text-xs font-semibold text-slate-400">Out for delivery detail</span>
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
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">
                                    Out for delivery
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
                                        <h2 className="text-sm font-bold text-slate-900 mb-3">Delivery Result</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label
                            className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${deliveryResult === "SUCCESS" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                        >
                            <input
                                type="radio"
                                name="deliveryResult"
                                value="SUCCESS"
                                checked={deliveryResult === "SUCCESS"}
                                onChange={() => setDeliveryResult("SUCCESS")}
                                className="w-4 h-4"
                            />
                                                                <span className="text-sm font-semibold text-slate-700">Delivery successful</span>
                        </label>
                        <label
                            className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${deliveryResult === "FAIL" ? "border-rose-300 bg-rose-50" : "border-slate-200 hover:bg-slate-50"}`}
                        >
                            <input
                                type="radio"
                                name="deliveryResult"
                                value="FAIL"
                                checked={deliveryResult === "FAIL"}
                                onChange={() => setDeliveryResult("FAIL")}
                                className="w-4 h-4"
                            />
                                                                <span className="text-sm font-semibold text-slate-700">Delivery failed</span>
                        </label>
                    </div>

                    {deliveryResult === "SUCCESS" && (
                        <div className="mt-5 space-y-4">
                                                        <h3 className="text-sm font-bold text-slate-900">Delivery successful</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 mb-2">
                                        Photo of delivered order with signature
                                    </p>
                                    <div className="flex items-start gap-3">
                                        <div className="w-32 h-24 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                                            {deliveredOrderImage ? (
                                                <img
                                                    src={deliveredOrderImage}
                                                    alt="Delivered"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="text-center">
                                                    <ImageIcon size={18} className="mx-auto text-slate-400" />
                                                    <p className="text-[10px] text-slate-400 mt-1">No image</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <button
                                                type="button"
                                                onClick={handleChooseDeliveredOrderImage}
                                                className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50"
                                            >
                                                Upload
                                            </button>
                                            <input
                                                title="Upload delivered order proof"
                                                ref={deliveredOrderRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleFileChange(e, setDeliveredOrderImage)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 mb-2">
                                        Photo of delivery address
                                    </p>
                                    <div className="flex items-start gap-3">
                                        <div className="w-32 h-24 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                                            {deliveryAddressImage ? (
                                                <img
                                                    src={deliveryAddressImage}
                                                    alt="Address"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="text-center">
                                                    <ImageIcon size={18} className="mx-auto text-slate-400" />
                                                    <p className="text-[10px] text-slate-400 mt-1">No image</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <button
                                                type="button"
                                                onClick={handleChooseDeliveryAddressImage}
                                                className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50"
                                            >
                                                Upload
                                            </button>
                                            <input
                                                title="Upload delivery address proof"
                                                ref={deliveryAddressRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleFileChange(e, setDeliveryAddressImage)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={matchedNamePhone}
                                    onChange={(e) => setMatchedNamePhone(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-semibold text-slate-700">
                                    Name and phone number matched
                                </span>
                            </label>
                        </div>
                    )}

                    {deliveryResult === "FAIL" && (
                        <div className="mt-5 space-y-4">
                                                        <h3 className="text-sm font-bold text-slate-900">Delivery failed</h3>

                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={failNoContact}
                                        onChange={(e) => setFailNoContact(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                                                        <span className="text-sm font-semibold text-slate-700">Could not contact</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={failWrongAddress}
                                        onChange={(e) => setFailWrongAddress(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                                                        <span className="text-sm font-semibold text-slate-700">Wrong address</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={failCustomerRefuse}
                                        onChange={(e) => setFailCustomerRefuse(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                                                        <span className="text-sm font-semibold text-slate-700">Customer refused delivery</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={failDamaged}
                                        onChange={(e) => setFailDamaged(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                                                        <span className="text-sm font-semibold text-slate-700">Goods damaged / seal torn</span>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-3 pt-6">
                        <button
                            type="button"
                            disabled={!canMoveToIssue}
                            onClick={handleMoveToIssue}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
                        >
                            Move to Issue
                        </button>
                        <button
                            type="button"
                            disabled={!canDeliverySuccess}
                            onClick={handleDeliverySuccess}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                        >
                            Delivery success
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ShipmentsInTransit({ user, setView }: { user: User; setView: (view: any) => void }) {
    const isCustomer = user.role === UserRole.CUSTOMER;
    const isAdmin = user.role === UserRole.ADMIN;

    const [activeTab, setActiveTab] = useState<InTransitTab>("IN_ORIGIN_WAREHOUSE");
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
                        images: courier.images,
                        image: courier.image,
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
        const allowed = inTransitTabToStatuses[activeTab];
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

    if (activeTab === "IN_ORIGIN_WAREHOUSE" && selectedShipment) {
        return (
            <InOriginWarehouseDetail
                shipment={selectedShipment}
                branches={branches}
                onBack={() => setSelectedShipment(null)}
                onMoveToInTransit={() => {
                    setSelectedShipment(null);
                    setActiveTab("IN_TRANSIT");
                }}
                onMoveToIssue={() => {
                    setSelectedShipment(null);
                    setView("SHIPMENTS_ISSUE");
                }}
            />
        );
    }

    if (activeTab === "IN_TRANSIT" && selectedShipment) {
        return (
            <InTransitDetail
                shipment={selectedShipment}
                branches={branches}
                onBack={() => setSelectedShipment(null)}
                onMoveToIssue={() => {
                    setSelectedShipment(null);
                    setView("SHIPMENTS_ISSUE");
                }}
                onMoveToDestinationWarehouse={() => {
                    setSelectedShipment(null);
                    setActiveTab("IN_DEST_WAREHOUSE");
                }}
            />
        );
    }

    if (activeTab === "IN_DEST_WAREHOUSE" && selectedShipment) {
        return (
            <InDestWarehouseDetail
                shipment={selectedShipment}
                branches={branches}
                onBack={() => setSelectedShipment(null)}
                onMoveToIssue={() => {
                    setSelectedShipment(null);
                    setView("SHIPMENTS_ISSUE");
                }}
                onMoveToOutForDelivery={() => {
                    setSelectedShipment(null);
                    setActiveTab("OUT_FOR_DELIVERY");
                }}
            />
        );
    }

    if (activeTab === "OUT_FOR_DELIVERY" && selectedShipment) {
        return (
            <OutForDeliveryDetail
                shipment={selectedShipment}
                branches={branches}
                onBack={() => setSelectedShipment(null)}
                onMoveToIssue={() => {
                    setSelectedShipment(null);
                    setView("SHIPMENTS_ISSUE");
                }}
                onDeliverySuccess={() => {
                    setSelectedShipment(null);
                    setView("SHIPMENTS_DELIVERED");
                }}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">In-transit Shipments</h1>
            </div>

            {!isCustomer && (
                <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-sm p-1">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                        {[
                            { id: "IN_ORIGIN_WAREHOUSE" as InTransitTab, label: "In origin warehouse", Icon: MapPin },
                            { id: "IN_TRANSIT" as InTransitTab, label: "In transit", Icon: Truck },
                            {
                                id: "IN_DEST_WAREHOUSE" as InTransitTab,
                                label: "In destination warehouse",
                                Icon: MapPin,
                            },
                            { id: "OUT_FOR_DELIVERY" as InTransitTab, label: "Out for delivery", Icon: Truck },
                        ].map(({ id, label, Icon }) => {
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
                        <div className="space-y-2 flex-1">
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
                            <div className="space-y-2 flex-1">
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
                                {!isCustomer &&
                                    (activeTab === "IN_ORIGIN_WAREHOUSE" ||
                                        activeTab === "IN_TRANSIT" ||
                                        activeTab === "IN_DEST_WAREHOUSE" ||
                                        activeTab === "OUT_FOR_DELIVERY") && (
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
                                        colSpan={
                                            isCustomer
                                                ? 7
                                                : activeTab === "IN_ORIGIN_WAREHOUSE" ||
                                                    activeTab === "IN_TRANSIT" ||
                                                    activeTab === "IN_DEST_WAREHOUSE" ||
                                                    activeTab === "OUT_FOR_DELIVERY"
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
                                                : activeTab === "IN_ORIGIN_WAREHOUSE" ||
                                                    activeTab === "IN_TRANSIT" ||
                                                    activeTab === "IN_DEST_WAREHOUSE" ||
                                                    activeTab === "OUT_FOR_DELIVERY"
                                                  ? 10
                                                  : 9
                                        }
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
                                            {!isCustomer &&
                                                (activeTab === "IN_ORIGIN_WAREHOUSE" ||
                                                    activeTab === "IN_TRANSIT" ||
                                                    activeTab === "IN_DEST_WAREHOUSE" ||
                                                    activeTab === "OUT_FOR_DELIVERY") && (
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
                                                : activeTab === "IN_ORIGIN_WAREHOUSE" ||
                                                    activeTab === "IN_TRANSIT" ||
                                                    activeTab === "IN_DEST_WAREHOUSE" ||
                                                    activeTab === "OUT_FOR_DELIVERY"
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
