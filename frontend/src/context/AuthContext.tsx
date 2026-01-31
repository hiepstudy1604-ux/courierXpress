/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, useContext, createContext, useCallback, useMemo } from "react";
import { User } from "../types"; 
import api, { AuthService } from "../services/api";

// Interface định nghĩa kiểu dữ liệu cho Context
interface AuthContextType {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider: Thành phần bọc toàn bộ ứng dụng để quản lý state đăng nhập
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hàm đồng bộ hóa token giữa bộ nhớ, axios và localStorage
  const syncToken = useCallback((token: string | null) => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("cx_token", token);
    } else {
      delete api.defaults.headers.common["Authorization"];
      localStorage.removeItem("cx_token");
    }
  }, []);

  const logout = useCallback(() => {
    AuthService.logout().catch(() => {}); 
    syncToken(null);
    setUser(null);
    window.location.href = "/login";
  }, [syncToken]);

  const initAuth = useCallback(async () => {
    const token = localStorage.getItem("cx_token");
    if (!token) {
      setLoading(false);
      return;
    }

    syncToken(token);
    try {
      const { data } = await AuthService.me();
      if (data?.success) {
        setUser(data.data);
      }
    } catch {
      syncToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [syncToken]);

  useEffect(() => {
    initAuth();

    // Thiết lập Interceptor để tự động dọn dẹp khi Token hết hạn (401)
    const interceptor = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) logout();
        return Promise.reject(err);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, [initAuth, logout]);

  const login = useCallback((token: string, userData: User) => {
    syncToken(token);
    setUser(userData);
  }, [syncToken]);

  const value = useMemo(() => ({
    user, login, logout, loading
  }), [user, login, logout, loading]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-gray-500 font-medium text-sm">Đang đồng bộ phiên làm việc...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom Hook: Giúp truy cập nhanh vào Auth state
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}