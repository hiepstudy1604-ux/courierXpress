
import axios from 'axios';

// API Laravel chạy ở cổng 8000
const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor để tự động gắn Token vào Header (skip for public routes)
api.interceptors.request.use((config) => {
  // Skip token for public routes (provinces, districts, wards)
  const publicRoutes = ['/provinces', '/districts', '/wards'];
  const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));

  if (!isPublicRoute) {
    const token = localStorage.getItem('cx_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize network-ish errors so UI doesn't misleadingly show "Auth error".
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      // If token is invalid/expired, clear it so app can prompt login again.
      if (status === 401) {
        localStorage.removeItem('cx_token');
      }

      // A real network error has no response at all.
      if (!error.response) {
        error.message = 'Unable to connect to the API server. Please check that the backend is running (php artisan serve) and verify the API URL.';
      }
    }

    return Promise.reject(error);
  }
);

export const CourierService = {
  getAll: (params?: any) => api.get('/courier', { params }),
  getById: (id: string) => api.get(`/courier/${id}`),
  quote: async (data: any) => {
    const res = await api.post('/courier/quote', data, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    return res;
  },
  create: async (data: any) => {
    const res = await api.post('/courier', data, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('shipment:updated'));
    }

    return res;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/courier/${id}`, data);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('shipment:updated'));
    }

    return res;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/courier/${id}`);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('shipment:updated'));
    }

    return res;
  },
  track: (trackingId: string) => api.get(`/courier/track/${trackingId}`),
  confirmOrder: async (orderId: string) => {
    const res = await api.post(`/courier/${orderId}/confirm`);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('shipment:updated'));
    }

    return res;
  },
  getSuitableVehicles: (orderId: string) => api.get(`/courier/${orderId}/suitable-vehicles`),
  assignVehicle: async (orderId: string, vehicleId: number) => {
    const res = await api.post(`/courier/${orderId}/assign-vehicle`, { vehicle_id: vehicleId });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('shipment:updated'));
    }

    return res;
  },
  findSuitableBranch: (orderId: string) => api.post(`/courier/${orderId}/find-branch`)
};

export const ShipmentService = {
  getAll: (params?: any) => api.get('/shipments', { params }),
  getById: (id: string) => api.get(`/shipments/${id}`),
  updateStatus: async (id: string, data: { status: string; payload?: any }) => {
    const res = await api.patch(`/shipments/${id}`, data);

    // Notify dashboards/other listeners that shipment data changed.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('shipment:updated'));
    }

    return res;
  },
};

export const AuthService = {
  register: (data: any) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { email: string; token: string; password: string; password_confirmation: string }) => 
    api.post('/auth/reset-password', data)
};

export const UserService = {
  getAll: (params?: any) => api.get('/user', { params }),
  getById: (id: string) => api.get(`/user/${id}`),
  delete: (id: string) => api.delete(`/user/${id}`)
};

export const BranchService = {
  getAll: (params?: any) => api.get('/branches', { params }),
  getById: (id: string) => api.get(`/branches/${id}`),
  update: (id: string, data: any) => api.put(`/branches/${id}`, data),
};

export const BillingService = {
  getAll: (params?: any) => api.get('/billing', { params }),
  getById: (id: string) => api.get(`/billing/${id}`)
};

export const CustomerService = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data)
};

export const DashboardService = {
  getStats: (params?: { date_start?: string; date_end?: string }) => 
    api.get('/dashboard/stats', { params })
};

export const NotificationService = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all')
};

export const ProvinceService = {
  getAll: (params?: any) => api.get('/provinces', { params }),
  getGrouped: () => api.get('/provinces/grouped'),
  getByCode: (code: string) => api.get(`/provinces/${code}`)
};

export const DistrictService = {
  getAll: (params?: any) => api.get('/districts', { params }),
  getByCode: (code: string) => api.get(`/districts/${code}`)
};

export const WardService = {
  getAll: (params?: any) => api.get('/wards', { params }),
  getByCode: (code: string) => api.get(`/wards/${code}`)
};

export const ReportService = {
  getReport: (params: { date_start: string; date_end: string }) => api.get('/reports', { params }),
  exportReport: (data: { date_start: string; date_end: string; format?: string }) => api.post('/reports/export', data),
  downloadReport: (reportId: string) => api.get(`/reports/${reportId}/download`, { responseType: 'blob' }),
};

export const VehicleService = {
  getAll: (params?: any) => api.get('/vehicles', { params }),
  getById: (id: string | number) => api.get(`/vehicles/${id}`),
};

export default api;
