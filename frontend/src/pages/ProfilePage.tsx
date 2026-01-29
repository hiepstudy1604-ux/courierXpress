import React, { useState, useEffect, useRef } from "react";
import { User, UserRole } from "../types";
import {
    UserCircle,
    Mail,
    Phone,
    MapPin,
    Building2,
    Save,
    Edit2,
    X,
    Loader2,
    Shield,
    CheckCircle2,
} from "lucide-react";
import { AuthService, CustomerService } from "../services/api";

interface Props {
    user: User;
}

interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    role: UserRole;
    branch?: string;
    status?: string;
}

const ProfilePage: React.FC<Props> = ({ user }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const isMountedRef = useRef(true);

    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
    });

    const fetchProfile = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await AuthService.me();
            
            if (!isMountedRef.current) return;
            
            if (response.data.success) {
                const userData = response.data.data;
                const profileData: UserProfile = {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone || "",
                    address: userData.address || "",
                    city: userData.city || "",
                    role: userData.role,
                    branch: userData.branch?.name || userData.branch || "",
                    status: userData.status || "ACTIVE",
                };
                setProfile(profileData);
                setEditForm({
                    name: profileData.name,
                    email: profileData.email,
                    phone: profileData.phone || "",
                    address: profileData.address || "",
                    city: profileData.city || "",
                });
            } else {
                setError("Failed to load profile");
            }
        } catch (err: any) {
            if (!isMountedRef.current) return;
            
            console.error("Error fetching profile:", err);
            
            // Better error handling for 404
            if (err.response?.status === 404) {
                setError("Profile endpoint not found. Please check if the backend server is running.");
            } else if (err.response?.status === 401) {
                setError("Authentication failed. Please log in again.");
            } else if (!err.response) {
                setError("Unable to connect to the server. Please check if the backend is running.");
            } else {
                setError(err.response?.data?.message || "Failed to load profile");
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        fetchProfile();
        
        return () => {
            isMountedRef.current = false;
        };
    }, [user]);

    const handleUpdate = async () => {
        if (!profile) return;

        setIsUpdating(true);
        setUpdateError(null);

        try {
            // For customer, use customer update endpoint
            if (profile.role === UserRole.CUSTOMER) {
                // Extract customer ID (remove KH- prefix if present)
                const customerId = profile.id.replace("KH-", "");
                const response = await CustomerService.update(customerId, {
                    name: editForm.name,
                    email: editForm.email,
                    phone: editForm.phone,
                    address: editForm.address,
                    city: editForm.city,
                });

                if (response.data.success) {
                    setProfile({
                        ...profile,
                        name: editForm.name,
                        email: editForm.email,
                        phone: editForm.phone,
                        address: editForm.address,
                        city: editForm.city,
                    });
                    setIsEditing(false);
                    alert("Profile updated successfully");
                } else {
                    setUpdateError("Failed to update profile");
                }
            } else {
                // For Admin/Agent, we can add update endpoint later
                // For now, just show message
                setUpdateError("Profile update for Admin/Agent is not yet implemented");
            }
        } catch (err: any) {
            console.error("Error updating profile:", err);
            setUpdateError(err.response?.data?.message || "Failed to update profile");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancel = () => {
        if (profile) {
            setEditForm({
                name: profile.name,
                email: profile.email,
                phone: profile.phone || "",
                address: profile.address || "",
                city: profile.city || "",
            });
        }
        setIsEditing(false);
        setUpdateError(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <Loader2 className="animate-spin text-[#f97316] mx-auto" size={32} />
                    <p className="text-sm font-semibold text-slate-500">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <X className="text-rose-500 mx-auto" size={32} />
                    <p className="text-sm font-semibold text-slate-700">{error}</p>
                    <button
                        onClick={fetchProfile}
                        className="px-4 py-2 bg-[#f97316] text-white rounded-lg font-bold text-sm hover:bg-[#ea580c] transition-all"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    const canEdit = profile.role === UserRole.CUSTOMER;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {canEdit && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#f97316] text-white rounded-2xl font-black shadow-lg hover:bg-[#ea580c] transition-all"
                    >
                        <Edit2 size={18} /> Update Profile
                    </button>
                )}
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                {/* Profile Header */}
                <div className="bg-gradient-to-r from-[#f97316] to-[#ea580c] p-8 text-white">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/30">
                            <UserCircle size={48} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-black mb-2">{profile.name}</h2>
                            <div className="flex items-center gap-4 text-sm font-semibold text-white/90">
                                <span className="flex items-center gap-2">
                                    <Mail size={16} />
                                    {profile.email}
                                </span>
                                {profile.phone && (
                                    <span className="flex items-center gap-2">
                                        <Phone size={16} />
                                        {profile.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-black">
                                <Shield size={16} />
                                {profile.role}
                            </div>
                            {profile.status && (
                                <div
                                    className={`mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black ${
                                        profile.status === "ACTIVE"
                                            ? "bg-emerald-500/20 text-white"
                                            : "bg-rose-500/20 text-white"
                                    }`}
                                >
                                    <CheckCircle2 size={14} />
                                    {profile.status}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Content */}
                <div className="p-8">
                    {updateError && (
                        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-2xl text-sm font-semibold">
                            {updateError}
                        </div>
                    )}

                    {isEditing && canEdit ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                                        <UserCircle size={16} className="text-slate-400" />
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-semibold text-slate-900"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                                        <Mail size={16} className="text-slate-400" />
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-semibold text-slate-900"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                                        <Phone size={16} className="text-slate-400" />
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-semibold text-slate-900"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                                        <MapPin size={16} className="text-slate-400" />
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.city}
                                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-semibold text-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                                    <MapPin size={16} className="text-slate-400" />
                                    Address
                                </label>
                                <textarea
                                    value={editForm.address}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    rows={3}
                                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all font-semibold text-slate-900 resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
                                <button
                                    onClick={handleCancel}
                                    disabled={isUpdating}
                                    className="px-8 py-3.5 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    disabled={isUpdating}
                                    className="px-12 py-3.5 bg-[#f97316] text-white rounded-2xl font-black shadow-lg hover:bg-[#ea580c] transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {isUpdating ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-2">
                                        <UserCircle size={14} className="text-slate-400" />
                                        Full Name
                                    </label>
                                    <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100">
                                        <p className="text-sm font-black text-slate-900">{profile.name}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-2">
                                        <Mail size={14} className="text-slate-400" />
                                        Email Address
                                    </label>
                                    <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100">
                                        <p className="text-sm font-black text-slate-900">{profile.email}</p>
                                    </div>
                                </div>

                                {/* Always show phone for customer, conditional for others */}
                                {(canEdit || profile.phone) && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-2">
                                            <Phone size={14} className="text-slate-400" />
                                            Phone Number
                                        </label>
                                        <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100">
                                            <p className="text-sm font-black text-slate-900">{profile.phone || "Not provided"}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Always show city for customer, conditional for others */}
                                {(canEdit || profile.city) && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-400" />
                                            City
                                        </label>
                                        <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100">
                                            <p className="text-sm font-black text-slate-900">{profile.city || "Not provided"}</p>
                                        </div>
                                    </div>
                                )}

                                {profile.branch && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-2">
                                            <Building2 size={14} className="text-slate-400" />
                                            Branch
                                        </label>
                                        <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100">
                                            <p className="text-sm font-black text-slate-900">{profile.branch}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Always show address for customer, conditional for others */}
                            {(canEdit || profile.address) && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-2">
                                        <MapPin size={14} className="text-slate-400" />
                                        Address
                                    </label>
                                    <div className="bg-slate-50 px-5 py-3.5 rounded-2xl border border-slate-100">
                                        <p className="text-sm font-black text-slate-900">{profile.address || "Not provided"}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
