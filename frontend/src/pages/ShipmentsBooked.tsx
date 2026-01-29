import React, { useEffect, useMemo, useState } from "react";
import type { User as UserType } from "../types";
import { CourierStatus, UserRole } from "../types";
import type { View } from "../App";
import {
  Search,
  Filter,
  Copy,
  Clock,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Box,
  ClipboardCheck,
  ChevronDown,
  Loader2,
  XCircle,
} from "lucide-react";
import { CourierService, ShipmentService, BranchService, VehicleService } from "../services/api";

type BookedTab = "BOOKED" | "ASSIGN_BRANCH" | "SCHEDULE_PICKUP";

const bookedTabToStatuses: Record<BookedTab, CourierStatus[]> = {
  BOOKED: [CourierStatus.BOOKED],
  ASSIGN_BRANCH: [CourierStatus.BRANCH_ASSIGNED],
  SCHEDULE_PICKUP: [CourierStatus.PICKUP_SCHEDULED, CourierStatus.PICKUP_RESCHEDULED],
};

const getStatusConfig = (status: CourierStatus) => {
  switch (status) {
    case CourierStatus.BRANCH_ASSIGNED:
      return { label: "BRANCH ASSIGNED", styles: "bg-blue-50 text-blue-600 border-blue-100" };
    case CourierStatus.BOOKED:
      return { label: "BOOKED", styles: "bg-amber-50 text-amber-600 border-amber-100" };
    case CourierStatus.PICKUP_SCHEDULED:
      return { label: "PICKUP SCHEDULED", styles: "bg-cyan-50 text-cyan-600 border-cyan-100" };
    case CourierStatus.PICKUP_RESCHEDULED:
      return { label: "PICKUP RESCHEDULED", styles: "bg-amber-50 text-amber-700 border-amber-100" };
    case CourierStatus.PRICE_ESTIMATED:
      return { label: "PRICE ESTIMATED", styles: "bg-yellow-50 text-yellow-600 border-yellow-100" };
    default:
      return { label: status, styles: "bg-slate-50 text-slate-600 border-slate-100" };
  }
};

interface BookedDetailProps {
  shipment: any;
  branches: any[];
  vehicles: any[];
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  onBack: () => void;
  onAssigned?: (shipmentId: string) => void;
}

type CallStatus = "CALL_PENDING" | "CALL_SUCCESS" | "CALL_FAILED";
type PickupShift = "MORNING" | "AFTERNOON" | "EVENING";

type ShipmentStatusUpdater = (shipmentId: string, status: CourierStatus, payload?: any) => Promise<void>;

const BookedShipmentDetail: React.FC<
  BookedDetailProps & {
    onUpdateShipmentStatus: ShipmentStatusUpdater;
  }
> = ({
  shipment,
  branches,
  vehicles,
  selectedBranchId,
  setSelectedBranchId,
  selectedVehicleId,
  setSelectedVehicleId,
  onBack,
  onAssigned,
  onUpdateShipmentStatus,
}) => {
  const trackingId = shipment.trackingId || shipment.id;
  const shipmentId = shipment.id;
  const createdAt = shipment.bookingDate;
  const updatedAt = shipment.updatedAt || shipment.updated_at || null;
  const serviceType = shipment.serviceType || "Standard";

  const sender = shipment.sender || {};
  const receiver = shipment.receiver || {};

  const declaredValue = shipment.declaredValue || shipment.details?.declared_value || null;
  const estimatedDimensions = shipment.product?.dimensions || "—";
  const estimatedWeight = shipment.product?.weight || shipment.actualWeight || "—";

  const currentBranch = branches.find((b) => (b.id || b.branch_id)?.toString() === selectedBranchId?.toString());

  const branchVehicles = currentBranch
    ? vehicles.filter((v) => {
        const type = (v.vehicle_type || v.type || v.vehicleType || "").toString().trim();
        if (!type) return false;

        const fleetKeyByType: Record<string, string> = {
          Motorbike: "motorbike",
          "2.5-ton Truck": "truck_2_5t",
          "3.5-ton Truck": "truck_3_5t",
          "5-ton Truck": "truck_5t",
          "2.0t Truck": "truck_2t",
          "2-ton Truck": "truck_2t",
        };

        const fleetKey = fleetKeyByType[type];
        if (!fleetKey) return false;

        const count = Number((currentBranch?.vehicles || {})[fleetKey] ?? 0);
        return count > 0;
      })
    : [];

  const handleConfirm = async () => {
    try {
      if (!selectedBranchId) return;
      if (!selectedVehicleId) return;

      const candidate = branchVehicles.find((v) => (v.vehicle_id ?? v.id)?.toString() === selectedVehicleId);
      if (!candidate) {
        alert("Selected vehicle is not available for this branch.");
        return;
      }

      const vehicleId = candidate?.vehicle_id ?? candidate?.id;
      if (!vehicleId) {
        alert("Invalid vehicle selection.");
        return;
      }

      // This screen is built on top of /shipments (new workflow).
      // Assigning branch/vehicle should update the Shipment entity via /shipments APIs,
      // not the legacy /courier/{orderId}/assign-vehicle endpoint.
      await ShipmentService.updateStatus(String(shipmentId), {
        status: String(CourierStatus.BRANCH_ASSIGNED),
        payload: {
          branch_id: selectedBranchId,
          vehicle_id: Number(vehicleId),
        },
      });

      // reflect in UI
      await onUpdateShipmentStatus(String(shipmentId), CourierStatus.BRANCH_ASSIGNED);

      if (onAssigned) {
        onAssigned(String(shipmentId));
      }

      alert("Saved");
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to save");
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
        <span className="text-xs font-semibold text-slate-400">Booked Shipment Detail</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 tracking-wide">Shipment Summary</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 tracking-wide">Tracking ID</p>
                <p className="text-sm font-black text-slate-900">{trackingId}</p>
                <p className="text-[10px] font-bold text-slate-400">ID: {shipmentId}</p>
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
                <p className="text-[11px] font-semibold text-slate-400 tracking-wide mb-0.5">Service Type</p>
                <span className=" px-2 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-white">
                  {serviceType}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 tracking-wide mb-0.5">Status</p>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                  Booked
                </span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Estimated Charge</p>
                <p className="text-base font-black text-slate-900">{(shipment.fee / 25000).toFixed(2)} USD</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Final Charge</p>
                <p className="text-sm font-medium text-slate-400">—</p>
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
              <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Origin Branch</p>
              <p className="font-medium text-slate-500">—</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Destination Branch</p>
              <p className="font-medium text-slate-500">—</p>
            </div>
          </div>
        </div>

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
              <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Est. Volume (m³)</p>
              <p className="font-medium text-slate-700">—</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Actual Volume (m³)</p>
              <p className="font-medium text-slate-500">—</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Est. Dimensions</p>
              <p className="font-medium text-slate-700">{estimatedDimensions}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Actual Dimensions</p>
              <p className="font-medium text-slate-500">—</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Est. Weight</p>
              <p className="font-medium text-slate-700">{estimatedWeight}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Actual Weight</p>
              <p className="font-medium text-slate-500">—</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900">Select origin branch</h2>
            <span className="text-[11px] font-semibold text-slate-400">Near Pickup Address</span>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {branches.map((b) => {
              const id = (b.id || b.branch_id)?.toString();
              const active = selectedBranchId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelectedBranchId(id || null);
                    setSelectedVehicleId(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl border text-sm ${
                    active ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <span className="font-semibold">{b.name || b.branch_code}</span>
                  <span className="text-[10px] text-slate-400">{b.city || b.province_code || ""}</span>
                </button>
              );
            })}
            {branches.length === 0 && <p className="text-xs text-slate-400">No branches available.</p>}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900">Select vehicle</h2>
            <span className="text-[11px] font-semibold text-slate-400">Branch Fleet</span>
          </div>

          {selectedBranchId ? (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {branchVehicles.map((v) => {
                const vid = (v.vehicle_id ?? v.id)?.toString();
                if (!vid) return null;

                const active = selectedVehicleId === vid;
                const typeLabel = (v.vehicle_type || v.type || v.vehicleType || "Vehicle").toString();
                const label = (v.vehicle_code || v.code || v.license_plate || `#${vid}`).toString();
                const capacityLabel = v.max_load_kg
                  ? `${v.max_load_kg} kg`
                  : v.capacity_kg
                  ? `${v.capacity_kg} kg`
                  : "";

                return (
                  <button
                    key={vid}
                    type="button"
                    onClick={() => setSelectedVehicleId(vid)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl border text-sm ${
                      active
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-semibold">{label}</span>
                      <span className="text-[11px] text-slate-400">{typeLabel}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{capacityLabel}</span>
                  </button>
                );
              })}
              {branchVehicles.length === 0 && <p className="text-xs text-slate-400">No vehicles for this branch.</p>}
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-2">Please select a branch on the left to see available vehicles.</p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!selectedBranchId || !selectedVehicleId}
              onClick={handleConfirm}
              className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-orange-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
            >
              Confirm branch & vehicle type
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AssignBranchDetailProps {
  shipment: any;
  branches: any[];
  onBack: () => void;
  onGoToSchedulePickup: () => void;
}

const formatPickupShift = (shift: PickupShift | null) => {
  switch (shift) {
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

const AssignBranchShipmentDetail: React.FC<
  AssignBranchDetailProps & {
    onUpdateShipmentStatus: ShipmentStatusUpdater;
  }
> = ({ shipment, branches, onBack, onGoToSchedulePickup, onUpdateShipmentStatus }) => {
  const trackingId = shipment.trackingId || shipment.id;
  const shipmentId = shipment.id;
  const createdAt = shipment.bookingDate;
  const updatedAt = shipment.updatedAt || shipment.updated_at || null;
  const serviceType = shipment.serviceType || "Standard";

  const sender = shipment.sender || {};
  const receiver = shipment.receiver || {};

  const declaredValue = shipment.declaredValue || shipment.details?.declared_value || null;
  const estimatedDimensions = shipment.product?.dimensions || "—";
  const estimatedWeight = shipment.product?.weight || shipment.actualWeight || "—";

  const pickupBranchId = shipment.branch_id || shipment.branchId || shipment.branch || null;
  const pickupBranchObj = branches.find((b) => (b.id || b.branch_id)?.toString() === pickupBranchId?.toString());
  const pickupBranchLabel = pickupBranchObj?.name || pickupBranchObj?.branch_code || pickupBranchId || "—";

  const [callStatus, setCallStatus] = useState<CallStatus>("CALL_SUCCESS");

  const pickupWindowStart: string = shipment.pickupWindow?.start || shipment.pickupWindowStart || "";
  const pickupWindowEnd: string = shipment.pickupWindow?.end || shipment.pickupWindowEnd || "";
  const pickupShift: PickupShift | "" = (shipment.pickupShift as PickupShift) || "";

  const validatePickupWindow = () => {
    if (!pickupWindowStart || !pickupWindowEnd) return "Pickup Window is required.";
    const start = new Date(pickupWindowStart).getTime();
    const end = new Date(pickupWindowEnd).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return "Pickup Window is invalid.";
    if (start > end) return "Pickup Window start must be <= end.";
    const nowPlus30 = Date.now() + 30 * 60 * 1000;
    if (start < nowPlus30) return "Pickup Window must be at least now + 30 minutes.";
    return null;
  };

  const handleSchedulePickupSuccess = async () => {
    const err = validatePickupWindow();
    if (err) return alert(err);
    try {
      await onUpdateShipmentStatus(String(shipmentId), CourierStatus.PICKUP_SCHEDULED, {
        scheduledStart: pickupWindowStart,
        scheduledEnd: pickupWindowEnd,
      });
      alert("Schedule pickup success: Status → PICKUP_SCHEDULED. Moving to Schedule Pickup tab.");
      onGoToSchedulePickup();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to schedule pickup");
    }
  };

  const handleReschedulePickup = async () => {
    const err = validatePickupWindow();
    if (err) return alert(err);
    try {
      await onUpdateShipmentStatus(String(shipmentId), CourierStatus.PICKUP_RESCHEDULED, {
        reason: "PICKUP_RESCHEDULE_REQUEST",
        scheduledStart: pickupWindowStart,
        scheduledEnd: pickupWindowEnd,
      });
      alert("Reschedule pickup: Status → PICKUP_RESCHEDULED. Moving to Schedule Pickup tab.");
      onGoToSchedulePickup();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to reschedule pickup");
    }
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const callStatusLabel = (() => {
    switch (callStatus) {
      case "CALL_PENDING":
        return "Call Pending";
      case "CALL_SUCCESS":
        return "Call Success";
      case "CALL_FAILED":
        return "Call Failed";
      default:
        return callStatus;
    }
  })();

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
        <span className="text-xs font-semibold text-slate-400">Assign Branch Detail</span>
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
                <p className="text-[10px] font-bold text-slate-400">ID: {shipmentId}</p>
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
                <p className="text-[11px] font-semibold text-slate-400 tracking-wide mb-0.5">Service Type</p>
                <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-white">{serviceType}</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 tracking-wide mb-0.5">Status</p>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  Branch Assigned
                </span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Estimated Charge</p>
                <p className="text-base font-black text-slate-900">{shipment?.fee ? `${(shipment.fee / 25000).toFixed(2)} USD` : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Actual Charge</p>
                <p className="text-sm font-medium text-slate-400">—</p>
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
          <div>
            <p className="text-[11px] font-semibold text-slate-400 mb-1">Goods Type</p>
            <p className="text-sm font-bold text-slate-900">{shipment.details?.type || "Parcel"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 mb-1">Declared Value</p>
            <p className="text-sm font-medium text-slate-900">{declaredValue != null ? `${declaredValue.toLocaleString()} VND` : "—"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Estimated Volume (m³)</p>
              <p className="font-medium text-slate-700">—</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mt-4">
        <div className="lg:col-span-12 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Information</h2>
              <span className="text-[11px] font-semibold text-slate-400">State: Branch Assigned</span>
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
                  <p className="text-xs font-semibold text-slate-800">
                    {shipment.vehicleType ||
                      shipment.vehicle_type ||
                      shipment.vehicle?.type ||
                      shipment.vehicle?.vehicle_type ||
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Window</p>
                  <p className="text-xs font-semibold text-slate-800">
                    {pickupWindowStart || pickupWindowEnd
                      ? `${formatDateTime(pickupWindowStart || pickupWindowEnd)}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Pickup Shift</p>
                  <p className="text-xs font-semibold text-slate-800">{formatPickupShift((pickupShift || null) as any)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Call Status</h2>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${
                  callStatus === "CALL_SUCCESS"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : callStatus === "CALL_FAILED"
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                }`}
              >
                {callStatusLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <label htmlFor="callStatus" className="text-xs font-bold text-slate-600">
                  Call Status
                </label>
                <select
                  id="callStatus"
                  aria-label="Call status"
                  value={callStatus}
                  onChange={(e) => setCallStatus(e.target.value as CallStatus)}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40"
                >
                  <option value="CALL_PENDING">Call Pending</option>
                  <option value="CALL_SUCCESS">Call Success</option>
                  <option value="CALL_FAILED">Call Failed</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleReschedulePickup}
                  disabled={callStatus === "CALL_SUCCESS"}
                  className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500 border-amber-500 text-white hover:bg-amber-600"
                >
                  Reschedule Pickup
                </button>
                <button
                  type="button"
                  onClick={handleSchedulePickupSuccess}
                  disabled={callStatus !== "CALL_SUCCESS"}
                  className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                >
                  Schedule Pickup Success
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Call Pending / Call Failed: <span className="font-semibold">Reschedule Pickup</span> is active. Call Success:{" "}
              <span className="font-semibold">Schedule Pickup Success</span> is active.
            </p>
          </div>
        </div>

        <div className="lg:col-span-3" />
      </div>
    </div>
  );
};

interface SchedulePickupDetailProps {
  shipment: any;
  branches: any[];
  onBack: () => void;
  onGoToPickup: () => void;
  onStayInSchedulePickup: () => void;
}

type DriverReadyStatus = "READY" | "NOT_READY";
type CallStatus2 = "CALL_PENDING" | "CALL_SUCCESS" | "CALL_FAILED";

const SchedulePickupShipmentDetail: React.FC<
  SchedulePickupDetailProps & {
    onUpdateShipmentStatus: ShipmentStatusUpdater;
  }
> = ({
  shipment,
  branches,
  onBack,
  onGoToPickup,
  onStayInSchedulePickup,
  onUpdateShipmentStatus,
}) => {
  const trackingId = shipment.trackingId || shipment.id;
  const shipmentId = shipment.id;
  const createdAt = shipment.bookingDate;
  const updatedAt = shipment.updatedAt || shipment.updated_at || null;
  const serviceType = shipment.serviceType || "Standard";

  const sender = shipment.sender || {};
  const receiver = shipment.receiver || {};

  const declaredValue = shipment.declaredValue || shipment.details?.declared_value || null;
  const estimatedDimensions = shipment.product?.dimensions || "—";
  const estimatedWeight = shipment.product?.weight || shipment.actualWeight || "—";

  const pickupBranchId = shipment.branch_id || shipment.branchId || shipment.branch || null;
  const pickupBranchObj = branches.find((b) => (b.id || b.branch_id)?.toString() === pickupBranchId?.toString());
  const pickupBranchLabel = pickupBranchObj?.name || pickupBranchObj?.branch_code || pickupBranchId || "—";

  const vehicleType =
    shipment.vehicleType || shipment.vehicle_type || shipment.vehicle?.type || shipment.vehicle?.vehicle_type || "—";

  const latestPickupWindowStart: string = shipment.pickupWindow?.start || shipment.pickupWindowStart || "";
  const latestPickupWindowEnd: string = shipment.pickupWindow?.end || shipment.pickupWindowEnd || "";
  const latestPickupShift: PickupShift | "" = (shipment.pickupShift as PickupShift) || "";

  const [localStatus, setLocalStatus] = useState<string>(shipment.status || CourierStatus.PICKUP_SCHEDULED);
  const isRescheduled = localStatus === "PICKUP_RESCHEDULED";

  const [driverStatus, setDriverStatus] = useState<DriverReadyStatus>("READY");
  const [callStatus, setCallStatus] = useState<CallStatus2>("CALL_PENDING");

  const validatePickupWindow = () => {
    const start = latestPickupWindowStart || latestPickupWindowEnd;
    const end = latestPickupWindowEnd || latestPickupWindowStart;
    if (!start || !end) return "Pickup Window is required.";
    const startTs = new Date(start).getTime();
    const endTs = new Date(end).getTime();
    if (Number.isNaN(startTs) || Number.isNaN(endTs)) return "Pickup Window is invalid.";
    if (startTs > endTs) return "Pickup Window start must be <= end.";
    return null;
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const effectiveStatusLabel = isRescheduled ? "Pickup Rescheduled" : "Pickup Scheduled";

  const handleSetOnTheWayPickup = async () => {
    const err = validatePickupWindow();
    if (err) return alert(err);
    if (driverStatus !== "READY") return;

    try {
      await onUpdateShipmentStatus(String(shipmentId), CourierStatus.ON_THE_WAY_PICKUP);
      alert("Set on the way pickup: Status → ON_THE_WAY_PICKUP. Moving to Pickup page.");
      onGoToPickup();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to set ON_THE_WAY_PICKUP");
    }
  };

  const handleReschedulePickup = async () => {
    const err = validatePickupWindow();
    if (err) return alert(err);

    try {
      await onUpdateShipmentStatus(String(shipmentId), CourierStatus.PICKUP_RESCHEDULED, {
        reason: "PICKUP_RESCHEDULE_REQUEST",
        scheduledStart: latestPickupWindowStart || latestPickupWindowEnd,
        scheduledEnd: latestPickupWindowEnd || latestPickupWindowStart,
      });
      alert("Reschedule pickup: Status → PICKUP_RESCHEDULED. Staying in Schedule Pickup tab.");
      setLocalStatus("PICKUP_RESCHEDULED");
      onStayInSchedulePickup();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to reschedule pickup");
    }
  };

  const handleMoveToIssue = async () => {
    try {
      await onUpdateShipmentStatus(String(shipmentId), CourierStatus.PICKUP_RESCHEDULED, {
        reason: "PICKUP_ISSUE",
      });
      alert("Move to issue: Status → PICKUP_RESCHEDULED");
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to move to ISSUE");
    }
  };

  const statusPill = isRescheduled
    ? "bg-rose-50 text-rose-700 border-rose-100"
    : "bg-cyan-50 text-cyan-700 border-cyan-100";

  const driverStatusDisabled = isRescheduled && (callStatus === "CALL_PENDING" || callStatus === "CALL_FAILED");

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
        <span className="text-xs font-semibold text-slate-400">Schedule Pickup Detail</span>
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
                <p className="text-[10px] font-bold text-slate-400">ID: {shipmentId}</p>
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
                <p className="text-[11px] font-semibold text-slate-400 tracking-wide mb-0.5">Service Type</p>
                <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-white">{serviceType}</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 tracking-wide mb-0.5">Status</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusPill}`}>
                  {effectiveStatusLabel}
                </span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Estimated Charge</p>
                <p className="text-base font-black text-slate-900">{shipment?.fee ? `${(shipment.fee / 25000).toFixed(2)} USD` : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Actual Charge</p>
                <p className="text-sm font-medium text-slate-400">—</p>
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
          <div>
            <p className="text-[11px] font-semibold text-slate-400 mb-1">Goods Type</p>
            <p className="text-sm font-bold text-slate-900">{shipment.details?.type || "Parcel"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 mb-1">Declared Value</p>
            <p className="text-sm font-medium text-slate-900">{declaredValue != null ? `${declaredValue.toLocaleString()} VND` : "—"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-0.5">Estimated Volume (m³)</p>
              <p className="font-medium text-slate-700">—</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mt-4">
        <div className="lg:col-span-12 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Information</h2>
              <span className="text-[11px] font-semibold text-slate-400">
                State: {isRescheduled ? "Pickup Rescheduled" : "Pickup Scheduled"}
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
                  <p className="text-xs font-semibold text-slate-800">{formatPickupShift((latestPickupShift || null) as any)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Driver Status</h2>
              <span className="text-[11px] font-semibold text-slate-400">
                {isRescheduled ? "Pickup Rescheduled" : "Pickup Scheduled"}
              </span>
            </div>

            <div className="space-y-4">
              {isRescheduled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="callStatus2" className="text-xs font-bold text-slate-600">
                      Call Status
                    </label>
                    <select
                      id="callStatus2"
                      aria-label="Call status"
                      value={callStatus}
                      onChange={(e) => setCallStatus(e.target.value as CallStatus2)}
                      className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40"
                    >
                      <option value="CALL_PENDING">Call Pending</option>
                      <option value="CALL_SUCCESS">Call Success</option>
                      <option value="CALL_FAILED">Call Failed</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <label htmlFor="driverStatusInline" className="text-xs font-bold text-slate-600">
                    Driver Status
                  </label>
                  <select
                    id="driverStatusInline"
                    aria-label="Driver status"
                    value={driverStatus}
                    disabled={isRescheduled ? driverStatusDisabled : false}
                    onChange={(e) => setDriverStatus(e.target.value as DriverReadyStatus)}
                    className="mt-2 w-full px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 disabled:opacity-40"
                  >
                    <option value="READY">Ready</option>
                    <option value="NOT_READY">Not Ready</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-3 justify-end">
                  {!isRescheduled && (
                    <>
                      <button
                        type="button"
                        onClick={handleReschedulePickup}
                        disabled={driverStatus === "READY"}
                        className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500 border-amber-500 text-white hover:bg-amber-600"
                      >
                        Reschedule Pickup
                      </button>
                      <button
                        type="button"
                        onClick={handleSetOnTheWayPickup}
                        disabled={driverStatus !== "READY"}
                        className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                      >
                        Set On The Way Pickup
                      </button>
                    </>
                  )}

                  {isRescheduled && (
                    <>
                      {(callStatus === "CALL_PENDING" || callStatus === "CALL_FAILED") && (
                        <button
                          type="button"
                          onClick={handleMoveToIssue}
                          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
                        >
                          Move To Issue
                        </button>
                      )}

                      {callStatus === "CALL_SUCCESS" && (
                        <>
                          <button
                            type="button"
                            onClick={handleSetOnTheWayPickup}
                            disabled={driverStatus !== "READY"}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                          >
                            Set On The Way Pickup
                          </button>
                          <button
                            type="button"
                            onClick={handleMoveToIssue}
                            disabled={driverStatus !== "NOT_READY"}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
                          >
                            Move To Issue
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!isRescheduled ? (
                <p className="text-xs text-slate-500">
                  Ready → <span className="font-semibold">Set On The Way Pickup</span>. Not Ready →{" "}
                  <span className="font-semibold">Reschedule Pickup</span>.
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Call Pending/Failed → <span className="font-semibold">Move To Issue</span> (Driver Status disabled). Call Success → Driver
                  Status enabled (Ready → Set On The Way Pickup, Not Ready → Move To Issue).
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ShipmentsBooked({ user, setView }: { user: UserType; setView?: (view: View) => void }) {
  const isCustomer = user.role === UserRole.CUSTOMER;
  const isAdmin = user.role === UserRole.ADMIN;

  const [activeTab, setActiveTab] = useState<BookedTab>("BOOKED");
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedShipment) {
      setSelectedBranchId(null);
      setSelectedVehicleId(null);
    }
  }, [selectedShipment]);

  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    orderId: "",
    serviceType: "",
  });

  const [rows, setRows] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
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
        const transformed = response.data.data.map((courier: any) => ({
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
          details: courier.details,
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
        setRows(transformed);
      } else {
        setError("Failed to load shipments");
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load shipments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleUpdateShipmentStatus: ShipmentStatusUpdater = async (shipmentId, status, payload) => {
    await ShipmentService.updateStatus(shipmentId, { status: String(status), payload });
    setRows((prev) =>
      prev.map((row) => (row.id === shipmentId ? { ...row, status, updatedAt: new Date().toISOString() } : row))
    );
  };

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await BranchService.getAll();
        setBranches(res.data.data || res.data);
      } catch (e) {
        console.error(e);
      }
    };
    if (isAdmin) fetchBranches();
  }, [isAdmin]);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await VehicleService.getAll();
        setVehicles(res.data.data || res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchVehicles();
  }, []);

  useEffect(() => setCurrentPage(1), [activeTab]);

  useEffect(() => {
    (window as any).refreshShipmentsBooked = async (payload?: { trackingCode?: string; orderId?: string | null }) => {
      await fetchData();
      setActiveTab("BOOKED");
      setCurrentPage(1);
      // ensure newest appears first; if we can identify it by tracking code, move it to the top
      setRows((prev) => {
        const next = [...prev];

        // sort by bookingDate desc when possible
        next.sort((a, b) => {
          const at = new Date(a.bookingDate || a.createdAt || a.created_at || 0).getTime();
          const bt = new Date(b.bookingDate || b.createdAt || b.created_at || 0).getTime();
          return bt - at;
        });

        const key = payload?.trackingCode || (payload?.orderId ? String(payload.orderId) : "");
        if (key) {
          const idx = next.findIndex((r) => (r.trackingId || r.id) === key || String(r.id) === key);
          if (idx > 0) {
            const [item] = next.splice(idx, 1);
            next.unshift(item);
          }
        }

        return next;
      });
    };

    return () => {
      try {
        delete (window as any).refreshShipmentsBooked;
      } catch {
        // ignore
      }
    };
  }, [fetchData]);

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(value);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = useMemo(() => {
    const allowed = bookedTabToStatuses[activeTab];
    return rows.filter((r) => allowed.includes(r.status as CourierStatus));
  }, [rows, activeTab]);

  const finalData = useMemo(() => {
    return filtered.filter((item) => {
      return (
        (item.trackingId || item.id).toLowerCase().includes(filters.orderId.toLowerCase()) &&
        (filters.serviceType === "" || item.serviceType.toLowerCase() === filters.serviceType.toLowerCase())
      );
    });
  }, [filtered, filters, user, isCustomer]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(finalData.length / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedData = finalData.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  if (activeTab === "BOOKED" && selectedShipment) {
    return (
      <BookedShipmentDetail
        shipment={selectedShipment}
        branches={branches}
        vehicles={vehicles}
        selectedBranchId={selectedBranchId}
        setSelectedBranchId={setSelectedBranchId}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
        onBack={() => setSelectedShipment(null)}
        onAssigned={() => {
          setSelectedShipment(null);
          setActiveTab("ASSIGN_BRANCH");
        }}
        onUpdateShipmentStatus={handleUpdateShipmentStatus}
      />
    );
  }

  if (activeTab === "ASSIGN_BRANCH" && selectedShipment) {
    return (
      <AssignBranchShipmentDetail
        shipment={selectedShipment}
        branches={branches}
        onBack={() => setSelectedShipment(null)}
        onGoToSchedulePickup={() => {
          setSelectedShipment(null);
          setActiveTab("SCHEDULE_PICKUP");
        }}
        onUpdateShipmentStatus={handleUpdateShipmentStatus}
      />
    );
  }

  if (activeTab === "SCHEDULE_PICKUP" && selectedShipment) {
    return (
      <SchedulePickupShipmentDetail
        shipment={selectedShipment}
        branches={branches}
        onBack={() => setSelectedShipment(null)}
        onGoToPickup={() => {
          if (setView) setView("SHIPMENTS_PICKUP");
        }}
        onStayInSchedulePickup={() => {
          setSelectedShipment(null);
          setActiveTab("SCHEDULE_PICKUP");
        }}
        onUpdateShipmentStatus={handleUpdateShipmentStatus}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Booked Shipments</h1>
      </div>

      {!isCustomer && (
        <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-sm p-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
            {[
              { id: "BOOKED" as BookedTab, label: "Booked", Icon: Clock },
              { id: "ASSIGN_BRANCH" as BookedTab, label: "Assign branch", Icon: MapPin },
              { id: "SCHEDULE_PICKUP" as BookedTab, label: "Schedule pickup", Icon: Calendar },
            ].map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                    active ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50"
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
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className="font-bold text-slate-700 text-sm uppercase tracking-wider">Filters</span>
            <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`} />
          </div>

          {showFilters && (
            <button
              type="button"
              onClick={() => setFilters({ orderId: "", serviceType: "" })}
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

          </div>
        )}
      </section>

      <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking ID</th>
                {!isCustomer && (
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch</th>
                )}
                {!isCustomer && (
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fleet</th>
                )}
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pickup Address</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Address</th>
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
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Fee</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                {!isCustomer && (activeTab === "BOOKED" || activeTab === "ASSIGN_BRANCH" || activeTab === "SCHEDULE_PICKUP") && (
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isCustomer ? 7 : activeTab === "BOOKED" ? 10 : 9} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 size={32} className="animate-spin text-[#f97316]" />
                      <p className="text-sm font-semibold text-slate-500">Loading shipments...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={isCustomer ? 7 : activeTab === "BOOKED" ? 10 : 9} className="px-6 py-20 text-center">
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
                            <span className="text-sm font-black text-slate-900 leading-none truncate">{row.trackingId || row.id}</span>
                            <span className="text-[10px] font-bold text-slate-400">ID: {row.id}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(row.trackingId || row.id)}
                            className="p-1.5 text-slate-300 hover:text-orange-600 transition-all hover:bg-orange-50 rounded-lg"
                            title="Copy ID"
                            aria-label="Copy shipment id"
                          >
                            {copiedId === (row.trackingId || row.id) ? (
                              <ClipboardCheck size={14} className="text-emerald-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                      {!isCustomer && (
                        <td className="px-4 py-5">
                          <p className="text-sm font-bold text-slate-900 leading-none whitespace-nowrap">{row.branch}</p>
                        </td>
                      )}
                      {!isCustomer && (
                        <td className="px-4 py-5">
                          <p className="text-xs font-semibold text-slate-400 whitespace-nowrap">{row.vehicleType}</p>
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
                        <p className="text-sm font-bold text-slate-900 whitespace-nowrap">{row.actualWeight || row.product.weight}</p>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{row.product.dimensions}</p>
                      </td>
                      <td className="px-4 py-5 text-right">
                        <p className="text-sm font-black text-slate-900 whitespace-nowrap">${(row.fee / 25000).toFixed(2)}</p>
                        {row.paymentMethod && <p className="text-[10px] text-slate-400 font-medium">{row.paymentMethod}</p>}
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${statusInfo.styles}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      {!isCustomer && (activeTab === "BOOKED" || activeTab === "ASSIGN_BRANCH" || activeTab === "SCHEDULE_PICKUP") && (
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
                  <td colSpan={isCustomer ? 7 : activeTab === "BOOKED" ? 10 : 9} className="py-32 text-center">
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

                  // Always show first page
                  pages.push(1);

                  // Gap after first
                  if (left > 2) pages.push(-1);

                  // Middle range
                  pushRange(Math.max(2, left), Math.min(total - 1, right));

                  // Gap before last
                  if (right < total - 1) pages.push(-1);

                  // Always show last page
                  pages.push(total);
                }

                return pages.map((p, idx) => {
                  if (p === -1) {
                    return (
                      <span key={`ellipsis-${idx}`} className="w-9 text-center text-xs font-black text-slate-300">
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
