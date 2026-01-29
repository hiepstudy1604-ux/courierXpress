import React, { useState } from "react";
import { UserRole } from "./types";
import type { User } from "./types";
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

export type View =
    | "LANDING"
    | "AUTH"
    | "DASHBOARD"
    | "SHIPMENT_CREATE"
    | "SHIPMENTS_BOOKED"
    | "SHIPMENTS_PICKUP"
    | "SHIPMENTS_IN_TRANSIT"
    | "SHIPMENTS_DELIVERED"
    | "SHIPMENTS_RETURN"
    | "SHIPMENTS_ISSUE"
    | "AGENT_CREATE"
    | "AGENT_LIST"
    | "BILLING"
    | "CUSTOMERS"
    | "REPORTS"
    | "NOTIFICATIONS"
    | "TRACKING"
    | "PROFILE"
    ;

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState<View>("LANDING");
    const [authMode, setAuthMode] = useState<"login" | "signup">("login");

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        if (user.role === UserRole.CUSTOMER) {
            setCurrentView("SHIPMENTS_BOOKED");
        } else {
            setCurrentView("DASHBOARD");
        }
    };

    const handleLogout = async () => {
        try {
            const token = localStorage.getItem('cx_token');
            if (token) {
                // Call logout API if token exists
                const { AuthService } = await import('./services/api');
                await AuthService.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear token and user state
            localStorage.removeItem('cx_token');
        setCurrentUser(null);
        setCurrentView("LANDING");
        }
    };

    const navigateToAuth = (mode: "login" | "signup") => {
        setAuthMode(mode);
        setCurrentView("AUTH");
    };

    const renderContent = () => {
        if (currentView === "LANDING") {
            return (
                <LandingPage
                    onStart={() => navigateToAuth("login")}
                    onSignUp={() => navigateToAuth("signup")}
                    onTrack={() => setCurrentView("TRACKING")}
                />
            );
        }

        if (!currentUser && currentView === "TRACKING") {
            return (
                <div className="min-h-screen bg-slate-50">
                    <button
                        type="button"
                        onClick={() => setCurrentView("LANDING")}
                        className="m-4 px-4 py-2 text-orange-600 font-semibold hover:bg-orange-50 rounded-lg transition-colors"
                    >
                        ← Back to Home
                    </button>
                    <TrackingPage />
                </div>
            );
        }

        if (!currentUser && currentView === "AUTH") {
            return <AuthPage initialMode={authMode} onLogin={handleLogin} onBack={() => setCurrentView("LANDING")} />;
        }

        if (currentUser) {
            return (
                <DashboardLayout
                    user={currentUser}
                    onLogout={handleLogout}
                    currentView={currentView}
                    setView={setCurrentView}
                >
                    {currentView === "DASHBOARD" && currentUser.role === UserRole.ADMIN && <AdminDashboard />}
                    {currentView === "DASHBOARD" && currentUser.role === UserRole.AGENT && (
                        <AgentDashboard user={currentUser} />
                    )}

                    {currentView === "SHIPMENTS_BOOKED" && <ShipmentsBooked user={currentUser} setView={setCurrentView} />}
                    {currentView === "SHIPMENTS_PICKUP" && <ShipmentsPickup user={currentUser} />}
                    {currentView === "SHIPMENTS_IN_TRANSIT" && <ShipmentsInTransit user={currentUser} setView={setCurrentView} />}
                    {currentView === "SHIPMENTS_DELIVERED" && <ShipmentsDelivered user={currentUser} setView={setCurrentView} />}
                    {currentView === "SHIPMENTS_RETURN" && <ShipmentsReturn user={currentUser} setView={setCurrentView} />}
                    {currentView === "SHIPMENTS_ISSUE" && <ShipmentsIssue user={currentUser} setView={setCurrentView} />}
                    {currentView === "SHIPMENT_CREATE" && <CreateShipment user={currentUser} setView={setCurrentView} />}

                    {currentView === "AGENT_LIST" && <AgentList key={currentView} />}
                    {currentView === "AGENT_CREATE" && <AgentCreate setView={setCurrentView} />}

                    {currentView === "BILLING" && <BillingManagement user={currentUser} />}
                    {currentView === "CUSTOMERS" && <CustomerManagement />}
                    {currentView === "REPORTS" && <ReportsPage user={currentUser} />}
                    {currentView === "TRACKING" && <TrackingPage />}
                    {currentView === "NOTIFICATIONS" && <NotificationsPage />}

                    {currentView === "PROFILE" && <ProfilePage user={currentUser} />}
                </DashboardLayout>
            );
        }

        return (
            <LandingPage
                onStart={() => navigateToAuth("login")}
                onSignUp={() => navigateToAuth("signup")}
                onTrack={() => setCurrentView("TRACKING")}
            />
        );
    };

    return <div className="min-h-screen">{renderContent()}</div>;
};

export default App;
