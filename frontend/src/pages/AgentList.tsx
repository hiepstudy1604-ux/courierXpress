import React, { useState, useMemo, useEffect } from "react";
import { Agent, VehicleFleet } from "../types";
import {
    Search,
    MapPin,
    ChevronDown,
    RotateCcw,
    Eye,
    Building2,
    Truck,
    Bike,
    Filter,
    Copy,
    Check,
    Home,
    Map,
    X,
    Lock,
    EyeOff,
    Edit2,
    Save,
    Loader2,
} from "lucide-react";
import { BranchService } from "../services/api";
import api from "../services/api";
const VEHICLE_CONFIG: { key: keyof VehicleFleet; label: string; icon: any }[] = [
    { key: "motorbike", label: "Motorbike", icon: Bike },
    { key: "truck_2t", label: "2.0t Truck", icon: Truck },
    { key: "truck_3_5t", label: "3.5t Truck", icon: Truck },
    { key: "truck_5t", label: "5.0t Truck", icon: Truck },
];

// Default vehicles for branches (will be replaced by API data if available)
const DEFAULT_VEHICLES: VehicleFleet = {
    motorbike: 5,
    truck_500kg: 0,
    truck_1t: 0,
    truck_2t: 2,
    truck_2_5t: 0,
    truck_3_5t: 1,
    truck_5t: 1,
};

const toTitleCase = (str: string) => str.replace(/\b\w/g, (char) => char.toUpperCase());

const AgentList: React.FC = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [loginInfo, setLoginInfo] = useState<{ email: string; password: string } | null>(null);
    const [isLoadingLogin, setIsLoadingLogin] = useState(false);
    const [editAgent, setEditAgent] = useState<Agent | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [filter, setFilter] = useState({
        searchId: "",
        city: "",
        status: "",
        vehicleTypes: [] as string[],
    });
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch branches function
    const fetchBranches = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await BranchService.getAll();
            if (response.data.success) {
                // Transform API data to match Agent type
                const branchesData: Agent[] = response.data.data.map((branch: any) => ({
                    id: branch.id,
                    agent_code: branch.agent_code,
                    name: branch.name,
                    email: `${branch.agent_code.toLowerCase().replace(/-/g, "")}@courierexpress.com`,
                    branch_manager: branch.branch_manager_name || "Manager Name",
                    branch_image: branch.branch_image || null, // Already includes full URL from backend
                    branchId: branch.id,
                    city: branch.city,
                    district: branch.district,
                    address: branch.address || branch.location,
                    phone: branch.branch_manager_phone || "+84901234567",
                    status: branch.status || "ACTIVE",
                    vehicles: branch.vehicles || DEFAULT_VEHICLES, // Use vehicles from API or default
                    total_shipments: 0, // Will be calculated from couriers later
                    active_shipments: 0, // Will be calculated from couriers later
                }));
                setAgents(branchesData);
            } else {
                setError("Failed to load branches");
            }
        } catch (err: any) {
            console.error("Error fetching branches:", err);
            setError(err.response?.data?.message || "Failed to load branches");
        } finally {
            setIsLoading(false);
        }
    };
    // Gọi API lấy pass khi mở modal
    useEffect(() => {
        if (selectedAgent) {
            setLoginInfo(null); // Reset thông tin cũ
            setIsLoadingLogin(true); // Bật quay quay loading

            // Gọi API lấy chi tiết (Hàm show ở Bước 1)
            api.get(`/admin/branches/${selectedAgent.branchId || selectedAgent.id}`)
                .then((res) => {
                    if (res.data.success && res.data.data.login_info) {
                        setLoginInfo(res.data.data.login_info);
                    }
                })
                .catch((err) => console.error("Failed to fetch login info", err))
                .finally(() => setIsLoadingLogin(false));
        }
    }, [selectedAgent]);

    // Fetch branches from API on mount and when refreshKey changes
    useEffect(() => {
        fetchBranches();
    }, [refreshKey]);

    // Listen for visibility change to refresh when user comes back to the tab
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                fetchBranches();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    // Expose refresh function to window for external calls
    useEffect(() => {
        (window as any).refreshAgentList = () => {
            setRefreshKey((prev) => prev + 1);
        };
        return () => {
            delete (window as any).refreshAgentList;
        };
    }, []);

    // Refresh when component becomes visible (when navigating to this view)
    useEffect(() => {
        // Small delay to ensure component is fully mounted
        const timer = setTimeout(() => {
            fetchBranches();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const normalizeCityKey = (value?: string) => {
        const v = (value ?? "").trim().toLowerCase();
        if (!v) return "";

        // Map existing DB values / Vietnamese names / abbreviations to dropdown values
        if (v === "hà nội" || v === "ha noi" || v === "hn" || v.includes("ha noi") || v.includes("hà nội")) {
            return "hanoi";
        }
        if (
            v === "tp. hồ chí minh" ||
            v === "tphcm" ||
            v === "hcm" ||
            v === "hcmc" ||
            v === "ho chi minh" ||
            v === "ho chi minh city" ||
            v.includes("hồ chí minh") ||
            v.includes("ho chi minh")
        ) {
            return "ho chi minh city";
        }
        if (v === "đà nẵng" || v === "da nang" || v === "dn" || v.includes("da nang") || v.includes("đà nẵng")) {
            return "da nang";
        }
        if (v === "khánh hòa" || v === "khanh hoa" || v.includes("khanh hoa") || v.includes("khánh hòa")) {
            return "khanh hoa";
        }

        return v;
    };

    const filteredAgents = useMemo(() => {
        return agents.filter((agent) => {
            const matchesId = agent.agent_code.toLowerCase().includes(filter.searchId.toLowerCase());
            const matchesCity = filter.city === "" || normalizeCityKey(agent.city) === normalizeCityKey(filter.city);
            const matchesStatus = filter.status === "" || agent.status === filter.status;
            const matchesVehicles =
                filter.vehicleTypes.length === 0 ||
                filter.vehicleTypes.some((type) => agent.vehicles[type as keyof VehicleFleet] > 0);
            return matchesId && matchesCity && matchesStatus && matchesVehicles;
        });
    }, [agents, filter]);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(field);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleAgentStatus = async (id: string) => {
        const agent = agents.find((a) => a.id === id);
        if (confirm(`Confirm ${agent?.status === "ACTIVE" ? "deactivate" : "activate"} this branch?`)) {
            try {
                const nextStatus = agent?.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                await BranchService.update(id, { status: nextStatus });
                await fetchBranches();
            } catch (err: any) {
                console.error("Error updating branch status:", err);
                alert(err.response?.data?.message || "Failed to update branch status");
            }
        }
    };

    const handleSaveEdit = async () => {
        if (!editAgent) return;
        setIsSaving(true);
        try {
            const payload: any = {
                name: editAgent.name,
                city: editAgent.city,
                district: editAgent.district,
                address: editAgent.address,
                branch_manager_name: editAgent.branch_manager,
                branch_manager_phone: editAgent.phone,
                vehicles: {
                    motorbike: editAgent.vehicles.motorbike,
                    truck_2t: editAgent.vehicles.truck_2t,
                    truck_3_5t: editAgent.vehicles.truck_3_5t,
                    truck_5t: editAgent.vehicles.truck_5t,
                },
            };
            if (newPassword && newPassword.trim() !== "") {
                payload.password = newPassword;
            }
            await BranchService.update(editAgent.id, payload);
            setEditAgent(null);
            setNewPassword("");
            await fetchBranches();
            alert("Updated successfully!");
        } catch (err: any) {
            console.error("Error updating branch:", err);
            alert(err.response?.data?.message || "Failed to update branch");
        } finally {
            setIsSaving(false);
        }
    };

    const resetFilters = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setFilter({ searchId: "", city: "", status: "", vehicleTypes: [] });
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
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
                            className={`text-slate-400 transition-transform duration-300 ${
                                showFilters ? "rotate-180" : ""
                            }`}
                        />
                    </div>

                    {showFilters && (
                        <button
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
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Branch ID</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input
                                    type="text"
                                    placeholder="AG-HN-..."
                                    value={filter.searchId}
                                    onChange={(e) => setFilter({ ...filter, searchId: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 transition-all font-semibold text-slate-900"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Hub City</label>
                            <div className="relative">
                                <MapPin
                                    size={16}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                                />
                                <select
                                    aria-label="Filter by city"
                                    value={filter.city}
                                    onChange={(e) => setFilter({ ...filter, city: e.target.value })}
                                    className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none appearance-none font-semibold text-slate-900 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all cursor-pointer"
                                >
                                    <option value="">All Cities</option>
                                    <option value="Hanoi">Hanoi</option>
                                    <option value="Ho Chi Minh City">Ho Chi Minh City</option>
                                    <option value="Da Nang">Da Nang</option>
                                    <option value="Khanh Hoa">Khanh Hoa</option>
                                </select>
                                <ChevronDown
                                    size={18}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Account Status</label>
                            <div className="relative">
                                <select
                                    aria-label="Filter by account status"
                                    value={filter.status}
                                    onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                                    className="w-full pl-5 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none appearance-none font-semibold text-slate-900 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all cursor-pointer"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                                <ChevronDown
                                    size={18}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {isLoading ? (
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-20 text-center">
                    <Loader2 className="animate-spin text-[#f97316] mx-auto mb-4" size={32} />
                    <p className="text-sm font-semibold text-slate-500">Loading branches...</p>
                </div>
            ) : error ? (
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-20 text-center">
                    <div className="w-20 h-20 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Error loading branches</h3>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-[#f97316] text-white rounded-xl font-black text-sm hover:bg-[#ea580c] transition-all"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAgents.map((agent) => (
                        <div
                            key={agent.id}
                            className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-xl hover:border-orange-200 p-6 space-y-6"
                        >
                            <div className="flex gap-4">
                                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                                    {agent.branch_image ? (
                                        <img
                                            src={agent.branch_image}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                            alt={agent.name}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <Building2 size={40} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-base font-black text-slate-900 truncate tracking-tight uppercase">
                                            {agent.agent_code}
                                        </h3>
                                        <button
                                            onClick={() => handleCopy(agent.agent_code, agent.agent_code)}
                                            className="p-1 text-slate-300 hover:text-[#f97316] transition-colors"
                                        >
                                            {copiedId === agent.agent_code ? (
                                                <Check size={14} className="text-emerald-500" />
                                            ) : (
                                                <Copy size={14} />
                                            )}
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[11px] leading-none truncate">
                                            <span className="font-bold text-slate-400 mr-1">Branch Name:</span>
                                            <span className="font-black text-slate-700">{toTitleCase(agent.name)}</span>
                                        </p>
                                        <p className="text-[11px] leading-none truncate">
                                            <span className="font-bold text-slate-400 mr-1">Manager:</span>
                                            <span className="font-black text-slate-700">
                                                {toTitleCase(agent.branch_manager)}
                                            </span>
                                        </p>
                                        <p className="text-[11px] leading-none truncate">
                                            <span className="font-bold text-slate-400 mr-1">Phone:</span>
                                            <span className="font-black text-[#f97316]">{agent.phone}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 ml-1">Administrative Area</label>
                                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                                    <MapPin size={12} className="text-rose-400" />
                                    <p className="text-[11px] font-black text-slate-700">
                                        {agent.city} – {agent.district}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 ml-1">Branch Address</label>
                                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
                                    <Home size={12} className="text-orange-400" />
                                    <p className="text-[11px] font-black text-slate-700">
                                        {toTitleCase(agent.address)}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 ml-1">
                                    Transport Capacity (Fleet)
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {VEHICLE_CONFIG.map(({ key, label, icon: Icon }) => {
                                        const count = agent.vehicles[key];
                                        return (
                                            <div
                                                key={key}
                                                className={`flex flex-col items-center border rounded-xl p-2 shadow-sm transition-all bg-white ${
                                                    count > 0
                                                        ? "border-orange-200 ring-2 ring-orange-50"
                                                        : "border-slate-100"
                                                }`}
                                            >
                                                <Icon
                                                    size={14}
                                                    className={count > 0 ? "text-[#f97316]" : "text-slate-400"}
                                                />
                                                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase text-center leading-tight">
                                                    {label}
                                                </p>
                                                <p
                                                    className={`text-[12px] font-black mt-0.5 ${
                                                        count > 0 ? "text-[#f97316]" : "text-slate-600"
                                                    }`}
                                                >
                                                    {count}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <span className="text-[11px] font-bold text-slate-500">Account Status</span>
                                <span
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                        agent.status === "ACTIVE"
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            : "bg-orange-50 text-orange-600 border-orange-100"
                                    }`}
                                >
                                    {agent.status === "ACTIVE" ? "Active" : "Paused"}
                                </span>
                            </div>

                            <div className="pt-5 mt-auto border-t border-slate-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedAgent(agent)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black hover:bg-black transition-all shadow-md active:scale-95"
                                    >
                                        <Eye size={14} /> Details
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditAgent(agent);
                                            setNewPassword("");
                                        }}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-[11px] font-black hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                    >
                                        <Edit2 size={14} className="text-[#f97316]" /> Edit
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">
                                        Operational Status
                                    </span>
                                    <button
                                        aria-label="Toggle agent operational status"
                                        onClick={() => toggleAgentStatus(agent.id)}
                                        className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            agent.status === "ACTIVE" ? "bg-[#f97316]" : "bg-slate-300"
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                                                agent.status === "ACTIVE" ? "translate-x-5" : "translate-x-0"
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* DETAILED MODAL */}
            {selectedAgent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => {
                            setSelectedAgent(null);
                            setShowPassword(false);
                        }}
                    ></div>
                    <div className="relative bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-8 pb-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center border border-orange-100">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Branch Details</h3>
                                    <p className="text-[10px] font-black text-orange-600 tracking-widest uppercase">
                                        {selectedAgent.agent_code}
                                    </p>
                                </div>
                            </div>
                            <button
                                aria-label="Close branch details modal"
                                onClick={() => {
                                    setSelectedAgent(null);
                                    setShowPassword(false);
                                }}
                                className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-6 scrollbar-hide">
                            <div className="flex gap-6">
                                <div className="w-28 h-28 rounded-[24px] overflow-hidden bg-slate-50 border border-slate-100 shrink-0 shadow-sm">
                                    {selectedAgent.branch_image ? (
                                        <img
                                            src={selectedAgent.branch_image}
                                            className="w-full h-full object-cover"
                                            alt={selectedAgent.name}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <Building2 size={48} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-3">
                                        {selectedAgent.agent_code}
                                    </h3>
                                    <div className="space-y-1.5">
                                        <p className="text-sm">
                                            <span className="font-bold text-slate-400 mr-2">Branch Name:</span>
                                            <span className="font-black text-slate-700">
                                                {toTitleCase(selectedAgent.name)}
                                            </span>
                                        </p>
                                        <p className="text-sm">
                                            <span className="font-bold text-slate-400 mr-2">Manager:</span>
                                            <span className="font-black text-slate-700">
                                                {toTitleCase(selectedAgent.branch_manager)}
                                            </span>
                                        </p>
                                        <p className="text-sm">
                                            <span className="font-bold text-slate-400 mr-2">Phone:</span>
                                            <span className="font-black text-[#f97316]">{selectedAgent.phone}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Administrative Area</label>
                                <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                                    <MapPin size={16} className="text-rose-400" />
                                    <p className="text-sm font-black text-slate-700">
                                        {selectedAgent.city} – {selectedAgent.district}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Branch Address</label>
                                <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                                    <Home size={16} className="text-orange-400" />
                                    <p className="text-sm font-black text-slate-700">
                                        {toTitleCase(selectedAgent.address)}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">
                                    Transport Capacity (Fleet)
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {VEHICLE_CONFIG.map(({ key, label, icon: Icon }) => {
                                        const count = selectedAgent.vehicles[key];
                                        return (
                                            <div
                                                key={key}
                                                className={`flex flex-col items-center border rounded-2xl p-4 shadow-sm transition-all bg-white ${
                                                    count > 0
                                                        ? "border-orange-200 ring-2 ring-orange-50"
                                                        : "border-slate-100"
                                                }`}
                                            >
                                                <Icon
                                                    size={20}
                                                    className={count > 0 ? "text-[#f97316]" : "text-slate-400"}
                                                />
                                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase text-center leading-tight">
                                                    {label}
                                                </p>
                                                <p
                                                    className={`text-lg font-black mt-1 ${
                                                        count > 0 ? "text-[#f97316]" : "text-slate-600"
                                                    }`}
                                                >
                                                    {count}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Account Credentials</label>
                                <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 space-y-5 relative">
                                    {isLoadingLogin ? (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="animate-spin text-indigo-500" size={24} />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                {/* Email Field */}
                                                <div className="space-y-1.5">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                                        Login Email
                                                    </span>
                                                    <div className="bg-white px-4 py-2.5 rounded-xl border border-indigo-100/50 flex items-center justify-between group/id shadow-sm">
                                                        <p className="font-black text-slate-900 font-mono text-xs tracking-tight truncate">
                                                            {loginInfo?.email || "N/A"}
                                                        </p>
                                                        <button
                                                            onClick={() => handleCopy(loginInfo?.email || "", "email")}
                                                            className="p-1 text-slate-300 hover:text-indigo-600 transition-colors shrink-0"
                                                        >
                                                            {copiedId === "email" ? (
                                                                <Check size={14} className="text-emerald-500" />
                                                            ) : (
                                                                <Copy size={14} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Password Field */}
                                                <div className="space-y-1.5">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                                        Password
                                                    </span>
                                                    <div className="bg-white px-4 py-2.5 rounded-xl border border-indigo-100/50 flex items-center justify-between group/id shadow-sm">
                                                        {showPassword ? (
                                                            <span className="font-black text-indigo-600 font-mono text-xs tracking-widest break-all">
                                                                {loginInfo?.password || ""}
                                                            </span>
                                                        ) : (
                                                            <input
                                                                type="password"
                                                                aria-label="Password display"
                                                                readOnly
                                                                value={loginInfo?.password || ""}
                                                                className="font-black text-indigo-600 font-mono text-xs tracking-widest bg-transparent outline-none w-full"
                                                            />
                                                        )}
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                aria-label="Toggle password visibility"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="p-1 text-slate-300 hover:text-indigo-600 transition-colors"
                                                            >
                                                                {showPassword ? (
                                                                    <EyeOff size={14} />
                                                                ) : (
                                                                    <Eye size={14} />
                                                                )}
                                                            </button>
                                                            <button
                                                                aria-label="Copy password to clipboard"
                                                                onClick={() =>
                                                                    handleCopy(loginInfo?.password || "", "pwd")
                                                                }
                                                                className="p-1 text-slate-300 hover:text-indigo-600 transition-colors"
                                                            >
                                                                {copiedId === "pwd" ? (
                                                                    <Check size={14} className="text-emerald-500" />
                                                                ) : (
                                                                    <Copy size={14} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-indigo-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-2.5 h-2.5 rounded-full ${
                                                            selectedAgent.status === "ACTIVE"
                                                                ? "bg-emerald-500 animate-pulse"
                                                                : "bg-rose-500"
                                                        }`}
                                                    ></div>
                                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                                        {selectedAgent.status === "ACTIVE"
                                                            ? "Authorized Access"
                                                            : "Access Revoked"}
                                                    </span>
                                                </div>
                                                <Lock size={16} className="text-indigo-300" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-1 py-2">
                                <span className="text-sm font-bold text-slate-500">Account Integrity</span>
                                <span
                                    className={`px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-sm ${
                                        selectedAgent.status === "ACTIVE"
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            : "bg-orange-50 text-orange-600 border-orange-100"
                                    }`}
                                >
                                    {selectedAgent.status === "ACTIVE" ? "Active" : "Paused"}
                                </span>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-center sticky bottom-0 z-10">
                            <button
                                onClick={() => {
                                    setSelectedAgent(null);
                                    setShowPassword(false);
                                }}
                                className="w-full max-w-xs py-3.5 bg-slate-900 text-white border border-slate-800 rounded-2xl font-black shadow-lg hover:bg-black transition-all active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editAgent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setEditAgent(null)}
                    ></div>
                    <div className="relative bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-8 pb-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center border border-orange-100">
                                    <Edit2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Edit Branch</h3>
                                    <p className="text-[10px] font-black text-orange-600 tracking-widest uppercase">
                                        {editAgent.agent_code}
                                    </p>
                                </div>
                            </div>
                            <button
                                aria-label="Close edit branch modal"
                                onClick={() => setEditAgent(null)}
                                className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-6 scrollbar-hide">
                            {/* Branch Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Branch Name</label>
                                <input
                                    type="text"
                                    aria-label="Branch name"
                                    value={editAgent.name}
                                    onChange={(e) => setEditAgent({ ...editAgent, name: e.target.value })}
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-black text-slate-700"
                                />
                            </div>

                            {/* Manager & Phone */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Manager</label>
                                    <input
                                        type="text"
                                        aria-label="Branch manager name"
                                        value={editAgent.branch_manager}
                                        onChange={(e) => setEditAgent({ ...editAgent, branch_manager: e.target.value })}
                                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-black text-slate-700"
                                    />
                                </div>
                                <div className="space-y-1.5 mt-4 pt-4 border-t border-slate-100">
                                    <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-1">
                                        <Lock size={12} />
                                        Change Password (Optional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Leave empty to keep current password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-mono text-indigo-600 font-bold"
                                        />
                                        {newPassword && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                                New
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Phone</label>
                                    <input
                                        type="text"
                                        aria-label="Phone number"
                                        value={editAgent.phone}
                                        onChange={(e) => setEditAgent({ ...editAgent, phone: e.target.value })}
                                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-black text-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Administrative Area */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Administrative Area</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        aria-label="City"
                                        value={editAgent.city}
                                        onChange={(e) => setEditAgent({ ...editAgent, city: e.target.value })}
                                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-black text-slate-700 appearance-none"
                                    >
                                        <option value="Hanoi">Hanoi</option>
                                        <option value="Ho Chi Minh City">Ho Chi Minh City</option>
                                        <option value="Da Nang">Da Nang</option>
                                        <option value="Khanh Hoa">Khanh Hoa</option>
                                    </select>
                                    <input
                                        type="text"
                                        aria-label="District"
                                        placeholder="District"
                                        value={editAgent.district}
                                        onChange={(e) => setEditAgent({ ...editAgent, district: e.target.value })}
                                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-black text-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Branch Address */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Branch Address</label>
                                <textarea
                                    aria-label="Branch address"
                                    value={editAgent.address}
                                    onChange={(e) => setEditAgent({ ...editAgent, address: e.target.value })}
                                    rows={2}
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-black text-slate-700 resize-none"
                                />
                            </div>

                            {/* Transport Capacity */}
                            <div className="space-y-2.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">
                                    Transport Capacity (Fleet)
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {VEHICLE_CONFIG.map(({ key, label, icon: Icon }) => (
                                        <div
                                            key={key}
                                            className="flex flex-col items-center border border-slate-100 rounded-2xl p-4 bg-white"
                                        >
                                            <Icon size={20} className="text-[#f97316] mb-2" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase text-center leading-tight mb-2">
                                                {label}
                                            </p>
                                            <input
                                                type="number"
                                                min="0"
                                                aria-label={`${label} capacity`}
                                                value={editAgent.vehicles[key]}
                                                onChange={(e) =>
                                                    setEditAgent({
                                                        ...editAgent,
                                                        vehicles: {
                                                            ...editAgent.vehicles,
                                                            [key]: parseInt(e.target.value) || 0,
                                                        },
                                                    })
                                                }
                                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-black text-slate-900 text-center outline-none focus:bg-white focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-10">
                            <button
                                onClick={() => setEditAgent(null)}
                                className="px-8 py-3.5 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                                className="px-12 py-3.5 bg-[#f97316] text-white rounded-2xl font-black shadow-lg hover:bg-[#ea580c] transition-all flex items-center gap-2 active:scale-95"
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save
                                Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {filteredAgents.length === 0 && (
                <div className="bg-white rounded-[40px] border border-slate-200 p-20 text-center space-y-4 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                        <Map size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">No branches found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium">
                        Try adjusting your filters or keyword search.
                    </p>
                    <button
                        onClick={resetFilters}
                        className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-200 transition-colors"
                    >
                        Clear filters
                    </button>
                </div>
            )}
        </div>
    );
};

export default AgentList;
