
export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  CUSTOMER = 'CUSTOMER'
}

export enum CourierStatus {
  // A. Khởi tạo & chuẩn bị pickup
  BOOKED = "BOOKED",
  PRICE_ESTIMATED = "PRICE_ESTIMATED",
  BRANCH_ASSIGNED = "BRANCH_ASSIGNED",
  PICKUP_SCHEDULED = "PICKUP_SCHEDULED",
  PICKUP_RESCHEDULED = "PICKUP_RESCHEDULED",

  // B. Pickup (lấy hàng)
  ON_THE_WAY_PICKUP = "ON_THE_WAY_PICKUP",
  VERIFIED_ITEM = "VERIFIED_ITEM",
  ADJUST_ITEM = "ADJUST_ITEM",
  CONFIRMED_PRICE = "CONFIRMED_PRICE",
  ADJUSTED_PRICE = "ADJUSTED_PRICE",
  PENDING_PAYMENT = "PENDING_PAYMENT",
  CONFIRM_PAYMENT = "CONFIRM_PAYMENT",
  PICKUP_COMPLETED = "PICKUP_COMPLETED", // legacy FE constant
  PICKUP_COMPLETE = "PICKUP_COMPLETE", // sync with backend

  // Payment (shipments workflow)
  PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED",

  // C. Kho gửi & trung chuyển
  IN_ORIGIN_WAREHOUSE = "IN_ORIGIN_WAREHOUSE",
  IN_TRANSIT = "IN_TRANSIT",
  IN_DEST_WAREHOUSE = "IN_DEST_WAREHOUSE",

  // D. Giao hàng (delivery)
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERY_FAILED = "DELIVERY_FAILED",
  DELIVERED_SUCCESS = "DELIVERED_SUCCESS",

  // E. Chuyển hoàn & kết thúc vòng đời
  RETURN_CREATED = "RETURN_CREATED",
  RETURN_IN_TRANSIT = "RETURN_IN_TRANSIT",
  RETURNED_TO_ORIGIN = "RETURNED_TO_ORIGIN",
  RETURN_COMPLETED = "RETURN_COMPLETED",
  DISPOSED = "DISPOSED",
  CLOSED = "CLOSED",
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branch?: string;
  phone?: string;
}

export interface Courier {
  id: string;
  trackingId: string;
  sender: {
    name: string;
    phone: string;
    address: string;
  };
  receiver: {
    name: string;
    phone: string;
    address: string;
  };
  details: {
    type: 'Document' | 'Parcel' | 'Fragile' | 'Liquid';
    weight: number;
    dimensions?: string;
  };
  pricing: {
    baseCharge: number;
    tax: number;
    total: number;
  };
  status: CourierStatus;
  bookingDate: string;
  eta: string;
  agentId?: string;
  branchId?: string;
}

export interface Bill {
  id: string;
  courierId: string;
  amount: number;
  status: 'PAID' | 'UNPAID' | 'REFUNDED';
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  totalOrders: number;
}

export interface VehicleFleet {
  motorbike: number;
  truck_500kg: number;
  truck_1t: number;
  truck_2t: number;
  truck_2_5t: number;
  truck_3_5t: number;
  truck_5t: number;
}

export interface Agent {
  id: string;
  agent_code: string;
  name: string;
  email: string;
  branch_manager: string;
  branch_image?: string;
  branchId: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  vehicles: VehicleFleet;
  total_shipments: number;
  active_shipments: number;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
}
