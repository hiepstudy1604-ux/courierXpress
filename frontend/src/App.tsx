import React, { useState, useCallback, useMemo } from "react";
import { UserRole } from "./types";
import { useAuth } from "./context/AuthContext";

// Layout & Pages
import DashboardLayout from "./components/DashboardLayout";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AdminDashboard from "./pages/AdminDashboard";
import AgentDashboard from "./pages/AgentDashboard";
import TrackingPage from "./pages/TrackingPage";
import AgentList from "./pages/AgentList";
import AgentCreate from "./pages/AgentCreate";
import BillingManagement from "./pages/BillingManagement";
import CustomerManagement from "./pages/CustomerManagement";
import ReportsPage from "./pages/ReportsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import { CreateShipment } from "./pages/CreateShipment";
import ShipmentsBooked from "./pages/ShipmentsBooked";
import ShipmentsPickup from "./pages/ShipmentsPickup";
import ShipmentsInTransit from "./pages/ShipmentsInTransit";
import ShipmentsDelivered from "./pages/ShipmentsDelivered";
import ShipmentsReturn from "./pages/ShipmentsReturn";
import ShipmentsIssue from "./pages/ShipmentsIssue";

// Kiểu View tổng thể cho toàn bộ ứng dụng
export type View =
  | "LANDING" | "AUTH" | "DASHBOARD" | "SHIPMENT_CREATE" | "SHIPMENTS_BOOKED"
  | "SHIPMENTS_PICKUP" | "SHIPMENTS_IN_TRANSIT" | "SHIPMENTS_DELIVERED"
  | "SHIPMENTS_RETURN" | "SHIPMENTS_ISSUE" | "AGENT_CREATE" | "AGENT_LIST"
  | "BILLING" | "CUSTOMERS" | "REPORTS" | "NOTIFICATIONS" | "TRACKING" | "PROFILE"
  | "WALLET";

const App: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>("LANDING");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Xử lý chuyển view tập trung, dùng bất kỳ giá trị string nào để tránh lỗi mismatch type 2322
  const handleSetView = useCallback((view: View | string) => {
    setCurrentView(view as View);
  }, []);

  // Điều hướng sau khi Login
  const handleAuthSuccess = useCallback(() => {
    if (user?.role === UserRole.CUSTOMER) {
      setCurrentView("SHIPMENTS_BOOKED");
    } else {
      setCurrentView("DASHBOARD");
    }
  }, [user]);

  const handleLogout = useCallback(async () => {
    await logout();
    setCurrentView("LANDING");
  }, [logout]);

  const navigateToAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setCurrentView("AUTH");
  };

  /**
   * Derived State: Xác định view thực tế dựa trên Auth State.
   * Kỹ thuật này giúp tránh re-render lặp (Cascading updates) và lỗi ESLint.
   */
  const activeView = useMemo(() => {
    if (user && (currentView === "LANDING" || currentView === "AUTH")) {
      return user.role === UserRole.CUSTOMER ? "SHIPMENTS_BOOKED" : "DASHBOARD";
    }
    return currentView;
  }, [user, currentView]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin" />
          <span className="text-slate-500 font-medium">Initializing...</span>
        </div>
      </div>
    );
  }

  // --- RENDERING STRATEGY ---

  // 1. Giao diện cho Guest
  if (!user) {
    if (activeView === "TRACKING") {
      return (
        <div className="min-h-screen bg-slate-50">
          <button 
            onClick={() => setCurrentView("LANDING")}
            className="m-4 text-orange-600 font-bold hover:underline"
          >
            ← Back
          </button>
          <TrackingPage />
        </div>
      );
    }

    if (activeView === "AUTH") {
      return (
        <AuthPage 
          initialMode={authMode} 
          onLogin={handleAuthSuccess} 
          onBack={() => setCurrentView("LANDING")} 
        />
      );
    }

    return (
      <LandingPage
        onStart={() => navigateToAuth("login")}
        onSignUp={() => navigateToAuth("signup")}
        onTrack={() => setCurrentView("TRACKING")}
      />
    );
  }

  // 2. Giao diện sau đăng nhập
  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      currentView={activeView}
      setView={handleSetView}
    >
      {/* Dynamic View Injection */}
      {activeView === "DASHBOARD" && (
        user.role === UserRole.ADMIN ? <AdminDashboard /> : <AgentDashboard user={user} />
      )}
      
      {activeView === "SHIPMENTS_BOOKED" && <ShipmentsBooked user={user} setView={handleSetView} />}
      {activeView === "SHIPMENTS_PICKUP" && <ShipmentsPickup user={user} />}
      {activeView === "SHIPMENTS_IN_TRANSIT" && <ShipmentsInTransit user={user} setView={handleSetView} />}
      {activeView === "SHIPMENTS_DELIVERED" && <ShipmentsDelivered user={user} setView={handleSetView} />}
      {activeView === "SHIPMENTS_RETURN" && <ShipmentsReturn user={user} setView={handleSetView} />}
      {activeView === "SHIPMENTS_ISSUE" && <ShipmentsIssue user={user} setView={handleSetView} />}
      {activeView === "SHIPMENT_CREATE" && <CreateShipment user={user} setView={handleSetView} />}

      {activeView === "AGENT_LIST" && <AgentList key={activeView} />}
      {activeView === "AGENT_CREATE" && <AgentCreate setView={handleSetView} />}
      {activeView === "BILLING" && <BillingManagement user={user} />}
      {activeView === "CUSTOMERS" && <CustomerManagement />}
      {activeView === "REPORTS" && <ReportsPage user={user} />}
      {activeView === "TRACKING" && <TrackingPage />}
      {activeView === "NOTIFICATIONS" && <NotificationsPage />}
      {activeView === "PROFILE" && <ProfilePage user={user} />}
    </DashboardLayout>
  );
};

export default App;