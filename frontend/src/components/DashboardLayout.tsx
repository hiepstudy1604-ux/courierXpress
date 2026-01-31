import React, { useEffect, useRef, useState } from 'react';
import { User, UserRole } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  Package, 
  FileText, 
  BarChart3, 
  Bell, 
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  LogOut,
  PackagePlus,
  Clock,
  Truck,
  CheckCircle,
  RotateCcw,
  AlertCircle,
  Menu,
  UserPlus,
  ListFilter,
} from 'lucide-react';
import { View } from '../App';
import { NotificationDropdown } from './NotificationDropdown';

interface Props {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  currentView: View;
  setView: (view: View) => void;
}

type MenuItem = {
  id: string;
  view?: View;
  label: string;
  icon: any;
  roles: UserRole[];
  children?: MenuItem[];
};

const DashboardLayout: React.FC<Props> = ({ user, onLogout, children, currentView, setView }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['couriers', 'agents-menu']));
  const lastNonProfileViewRef = useRef<View>('DASHBOARD');

  useEffect(() => {
    if (currentView !== 'PROFILE') {
      lastNonProfileViewRef.current = currentView;
    }
  }, [currentView]);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', view: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.AGENT] },
    { 
      id: 'couriers', 
      label: 'Shipments', 
      icon: Package,
      roles: [UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER],
      children: [
        { id: 'create-shipment', view: 'SHIPMENT_CREATE', label: 'Create Shipment', icon: PackagePlus, roles: [UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER] },
        { id: 'shipments-booked', view: 'SHIPMENTS_BOOKED', label: 'Booked', icon: Clock, roles: [UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER] },
        { id: 'shipments-pickup', view: 'SHIPMENTS_PICKUP', label: 'Schedule pickup', icon: Package, roles: [UserRole.ADMIN, UserRole.AGENT] },
        { id: 'shipments-in-transit', view: 'SHIPMENTS_IN_TRANSIT', label: 'In transit', icon: Truck, roles: [UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER] },
        { id: 'shipments-delivered', view: 'SHIPMENTS_DELIVERED', label: 'Delivered', icon: CheckCircle, roles: [UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER] },
        { id: 'shipments-return', view: 'SHIPMENTS_RETURN', label: 'Return', icon: RotateCcw, roles: [UserRole.ADMIN, UserRole.AGENT] },
        { id: 'shipments-issue', view: 'SHIPMENTS_ISSUE', label: 'Issue', icon: AlertCircle, roles: [UserRole.ADMIN, UserRole.AGENT] }
      ]
    },
    { 
      id: 'agents-menu', 
      label: 'Branches', 
      icon: Users,
      roles: [UserRole.ADMIN], 
      children: [
        { id: 'agent-create', view: 'AGENT_CREATE', label: 'Add Branch', icon: UserPlus, roles: [UserRole.ADMIN] },
        { id: 'agent-list', view: 'AGENT_LIST', label: 'Branch List', icon: ListFilter, roles: [UserRole.ADMIN] }
      ]
    },
    { id: 'customers', view: 'CUSTOMERS', label: 'Customers', icon: UserCircle, roles: [UserRole.ADMIN, UserRole.AGENT] },
    { id: 'billing', view: 'BILLING', label: 'Billing', icon: FileText, roles: [UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER] },
    { id: 'reports', view: 'REPORTS', label: 'Reports', icon: BarChart3, roles: [UserRole.ADMIN, UserRole.AGENT] },
    { id: 'notifications', view: 'NOTIFICATIONS', label: 'Notifications', icon: Bell, roles: [UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER] }, 
  ];

  const getViewLabel = (view: View): string => {
    switch (view) {
      case 'DASHBOARD': return 'Dashboard';
      case 'SHIPMENT_CREATE': return 'Create Shipment';
      case 'SHIPMENTS_BOOKED': return 'Booked Shipments';
      case 'SHIPMENTS_PICKUP': return 'Pickup Shipments';
      case 'SHIPMENTS_IN_TRANSIT': return 'In-transit Shipments';
      case 'SHIPMENTS_DELIVERED': return 'Delivered Shipments';
      case 'SHIPMENTS_RETURN': return 'Return Shipments';
      case 'SHIPMENTS_ISSUE': return 'Issue Shipments';
      case 'AGENT_CREATE': return 'Add Branch';
      case 'AGENT_LIST': return 'Branch List';
      case 'CUSTOMERS': return 'Customers';
      case 'BILLING': return 'Billing';
      case 'REPORTS': return 'Reports';
      case 'NOTIFICATIONS': return 'Notifications';
      case 'TRACKING': return 'Tracking';
      case 'PROFILE': return 'Profile';
      default: return view.replace(/_/g, ' ');
    }
  };

  const handleNavClick = (view: View) => {
    setView(view);
    if (window.innerWidth < 1024) {
      setIsMobileOpen(false);
    }
  };

  const handleProfileToggle = () => {
    if (currentView === 'PROFILE') {
      const fallback: View = user.role === UserRole.CUSTOMER ? 'SHIPMENTS_BOOKED' : 'DASHBOARD';
      handleNavClick(lastNonProfileViewRef.current || fallback);
      return;
    }
    handleNavClick('PROFILE');
  };

  const toggleMenu = (menuId: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  const handleLogoutAction = () => {
    if (confirm('Are you sure you want to log out?')) {
      onLogout();
    }
  };

  const renderMenuItem = (item: MenuItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isMenuExpanded = expandedMenus.has(item.id);
    
    const isActive = item.view === currentView;
    const isChildActive = hasChildren && item.children?.some(child => child.view === currentView);
    const highlight = isActive || isChildActive;

    if (!item.roles.includes(user.role)) return null;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              if (isExpanded) {
                toggleMenu(item.id);
              } else {
                setIsExpanded(true);
                setTimeout(() => toggleMenu(item.id), 100);
              }
            } else if (item.view) {
              handleNavClick(item.view);
            }
          }}
          className={`
            w-full flex items-center rounded-[12px] transition-all mb-1
            ${isExpanded ? 'px-4 py-3 space-x-3' : 'px-3 py-3 justify-center'}
            ${depth > 0 ? 'ml-4' : ''}
            ${isActive && !hasChildren
              ? 'bg-gradient-to-r from-[rgba(249,115,22,0.1)] to-[rgba(249,115,22,0.05)] shadow-sm' 
              : isChildActive
              ? 'bg-[rgba(249,115,22,0.05)]'
              : 'text-slate-600 hover:bg-slate-50'
            }
          `}
          title={!isExpanded ? item.label : undefined}
        >
          <item.icon 
            className={`w-5 h-5 shrink-0 transition-colors ${
              highlight ? 'text-[#f97316]' : 'text-slate-400'
            }`}
            strokeWidth={2}
          />
          {isExpanded && (
            <>
              <span className={`text-sm flex-1 text-left transition-colors font-bold ${
                highlight ? 'text-[#f97316]' : 'text-slate-700'
              }`}>
                {item.label}
              </span>
              {hasChildren && (
                isMenuExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )
              )}
            </>
          )}
        </button>

        {hasChildren && isMenuExpanded && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => {
              if (!child.roles.includes(user.role)) return null;
              const isChildItemActive = currentView === child.view;
              return (
                <button
                  key={child.id}
                  onClick={() => child.view && handleNavClick(child.view)}
                  className={`
                    w-full flex items-center rounded-[12px] transition-all pl-8 pr-4 py-2.5 space-x-3
                    ${isChildItemActive
                      ? 'bg-gradient-to-r from-[rgba(249,115,22,0.15)] to-[rgba(249,115,22,0.08)] shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-50'
                    }
                  `}
                  title={child.label}
                >
                  <child.icon 
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isChildItemActive ? 'text-[#f97316]' : 'text-slate-400'
                    }`}
                    strokeWidth={2}
                  />
                  <span className={`text-sm flex-1 text-left transition-colors font-bold ${
                    isChildItemActive ? 'text-[#f97316]' : 'text-slate-600'
                  }`}>
                    {child.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const getPortalLabel = () => {
    if (user.role === UserRole.CUSTOMER) return 'Customer Portal';
    if (user.role === UserRole.AGENT) return 'Branch Portal';
    return 'Admin Portal';
  };

  return (
    <div className="flex h-screen bg-[#fcfcfd] overflow-hidden text-slate-900">
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside 
        className={`
          fixed lg:static top-0 left-0 bottom-0 bg-white border-r border-slate-100 z-50
          transition-all duration-300 ease-in-out flex flex-col
          ${isExpanded ? 'w-64' : 'w-20'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 p-4 border-b border-slate-50 flex items-center justify-between">
            <div className={`flex items-center transition-all ${isExpanded ? 'space-x-3' : 'justify-center w-full'}`}>
              <div className="w-9 h-9 bg-[#f97316] rounded-lg flex items-center justify-center text-white shadow-lg shrink-0">
                <Package size={20} />
              </div>
              {isExpanded && (
                <div className="flex-1 min-w-0">
                  <h1 className="text-base tracking-tight truncate font-black">
                    <span className="text-[#1c1c1c]">Courier</span>
                    <span className="text-[#f97316]">Express</span>
                  </h1>
                  <p className="text-[10px] text-slate-400 -mt-0.5 truncate font-bold uppercase">Logistics Pro</p>
                </div>
              )}
            </div>
            {isExpanded && (
              <button onClick={() => setIsExpanded(false)} className="hidden lg:block p-2 hover:bg-orange-50 rounded-[8px] transition-all group shrink-0 ml-2">
                <ChevronLeft className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>

          {!isExpanded && (
            <div className="hidden lg:block p-3 border-b border-slate-50">
              <button onClick={() => setIsExpanded(true)} className="w-full p-2 hover:bg-orange-50 rounded-[8px] transition-all group">
                <ChevronRight className="w-5 h-5 text-slate-400 mx-auto" />
              </button>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {menuItems.map((item) => renderMenuItem(item))}
            
            <div className="pt-4 mt-4 border-t border-slate-50">
              <button
                onClick={handleLogoutAction}
                className={`
                  w-full flex items-center rounded-[12px] transition-all hover:bg-rose-50
                  ${isExpanded ? 'px-4 py-3 space-x-3' : 'px-3 py-3 justify-center'}
                `}
                title={!isExpanded ? 'Logout' : undefined}
              >
                <LogOut className="w-5 h-5 text-rose-500 shrink-0" strokeWidth={2} />
                {isExpanded && <span className="text-sm text-rose-500 font-bold">Logout</span>}
              </button>
            </div>
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between z-40 sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl">
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">

            {(user.role === UserRole.ADMIN || user.role === UserRole.AGENT || user.role === UserRole.CUSTOMER) && (
              <NotificationDropdown 
                onNavigate={(view) => {
                  handleNavClick(view as View);
                }}
              />
            )}
            
            <div
              className="flex items-center gap-3 pl-4 border-l border-slate-100 group cursor-pointer"
              onClick={handleProfileToggle}
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-black text-slate-900 leading-none mb-1 group-hover:text-[#f97316] transition-colors">{user.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{user.role}</p>
              </div>
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-[#f97316] font-black border border-white shadow-inner group-hover:border-[#f97316]/30 transition-all shrink-0">
               {(user?.name?.trim?.()?.charAt?.(0) || '?').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-[#fcfcfd]">
          <div className="mb-6 flex items-center gap-2 text-[10px] font-black tracking-tight text-slate-400 uppercase">
            <span>{getPortalLabel()}</span>
            <span className="text-slate-200">/</span>
            <span className="text-[#f97316] font-black">{getViewLabel(currentView)}</span>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
