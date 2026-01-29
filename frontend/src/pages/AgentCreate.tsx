import React, { useState } from "react";
import {
    UserPlus,
    Shield,
    MapPin,
    Phone,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Camera,
    Truck,
    Bike,
    Copy,
    Check,
    Warehouse,
    User,
    Zap,
    Upload,
    ChevronDown,
    Hash,
} from "lucide-react";
import { View } from "../App";
import { generateBranchId, generatePassword } from "../utils/agentHelpers";
import api from "../services/api";

interface Props {
    setView: (view: View) => void;
}

/* 
Khai bao bien cho component AgentCreate
*/

const AgentCreate: React.FC<Props> = ({ setView }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [createdData, setCreatedData] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        branch_name: "",
        branch_manager_name: "",
        branch_manager_phone: "",
        branch_image: null as File | null,
        address: {
            province: "Vietnam",
            city: "",
            district: "",
            street: "",
            house_number: "",
        },
        vehicles: {
            motorbike: 0,
            truck_2t: 0,
            truck_3_5t: 0,
            truck_5t: 0,
        },
        login: {
            login_id: "",
            password: "",
            status: "active" as "active" | "inactive",
        },
        agent_code: "",
    });

    /*  */
    const handleGenerateAccount = () => {
        if (formData.address.city && formData.address.district && formData.branch_name) {
            
            // 1. Tạo Mã Agent (Frontend hiển thị tạm, Backend sẽ tạo lại cái chuẩn hơn)
            // Bạn có thể giữ nguyên hàm cũ hoặc dùng logic đơn giản để hiển thị
            const agentCode = generateBranchId(formData.address.city, formData.address.district, formData.branch_name);

            // 2. LOGIC TẠO EMAIL: "Quận" + "Tên Branch" (Không giới hạn độ dài)
            
            // Hàm nhỏ để xóa dấu tiếng Việt và ký tự đặc biệt
            const cleanString = (str: string) => {
                return str
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu
                    .replace(/[^a-zA-Z0-9]/g, "")    // Xóa ký tự lạ (dấu cách, dấu phẩy...)
                    .toLowerCase();                  // Chuyển thành chữ thường
            };

            const cleanDistrict = cleanString(formData.address.district);
            const cleanBranchName = cleanString(formData.branch_name);

            // Ghép lại: Ví dụ Quận "Cầu Giấy" + Branch "Kho Tổng" -> "caugiaykhotong"
            // Không dùng substr() nên tên dài bao nhiêu nó lấy hết bấy nhiêu
            const loginId = `${cleanDistrict}${cleanBranchName}@courierexpress.com`;

            const password = generatePassword();

            setFormData((prev) => ({
                ...prev,
                agent_code: agentCode,
                login: {
                    ...prev.login,
                    login_id: loginId, // Email đầy đủ
                    password: password,
                },
            }));
        } else {
            alert("Please fill in City, District, and Branch Name first");
        }
    };

    /* Function: handleImageChange 
        Purpose (Mục đích thiết kế): Handle image file selection and preview generation
        Input: e - React.ChangeEvent<HTMLInputElement>: The change event from the file input
        Output: None (void function)
        Description: This function reads the selected image file from the input event,
                     updates the form data state with the selected file, and generates
                     a preview URL to display the image before submission.
    */
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, branch_image: file });
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("cx_token");
            if (!token) {
                setError("Please login with an admin account to create a branch.");
                setIsLoading(false);
                return;
            }

            const formDataToSend = new FormData();
            formDataToSend.append("branch_name", formData.branch_name);
            formDataToSend.append("branch_manager_name", formData.branch_manager_name);
            formDataToSend.append("branch_manager_phone", formData.branch_manager_phone);
            formDataToSend.append("address[city]", formData.address.city);
            formDataToSend.append("address[district]", formData.address.district);
            formDataToSend.append("address[street]", formData.address.street);
            formDataToSend.append("vehicles[motorbike]", formData.vehicles.motorbike.toString());
            formDataToSend.append("vehicles[truck_2t]", formData.vehicles.truck_2t.toString());
            formDataToSend.append("vehicles[truck_3_5t]", formData.vehicles.truck_3_5t.toString());
            formDataToSend.append("vehicles[truck_5t]", formData.vehicles.truck_5t.toString());
            formDataToSend.append("branch_manager_email", formData.login.login_id); 
            formDataToSend.append("password", formData.login.password);
            formDataToSend.append("login[status]", "active"); // Always active by default

            if (formData.branch_image) {
                formDataToSend.append("branch_image", formData.branch_image);
            }

            const response = await api.post("/admin/agents", formDataToSend, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (response.data.success) {
                setCreatedData(response.data.data);
                setIsSuccess(true);
            } else {
                setError(response.data.message || "Failed to create agent");
            }
        } catch (err: any) {
            console.error("Error creating agent:", err);
            const status = err.response?.status;
            const message = err.response?.data?.message;
            const errors = err.response?.data?.errors;
            if (status === 401) {
                setError("Unauthorized. Please login with an admin account and try again.");
                return;
            }
            if (message) {
                setError(message);
            } else if (errors && typeof errors === "object") {
                setError(Object.values(errors).flat().join(", "));
            } else {
                setError("Failed to create agent. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="max-w-xl mx-auto py-6 animate-in fade-in zoom-in duration-300">
                <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Branch Registered!</h2>
                    <p className="text-slate-500 font-medium text-sm mb-8">
                        The new logistics coordination point is ready for operation.
                    </p>
                    <div className="bg-slate-50 rounded-2xl p-6 mb-6 border border-slate-200 text-left">
                        {createdData && (
                            <>
                                <div className="mb-4">
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Agent Code</span>
                                    <p className="text-xl font-black text-slate-900 font-mono">
                                        {createdData.agent_code}
                                    </p>
                                </div>
                                <div className="mb-4">
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                                        Email (đăng nhập)
                                    </span>
                                    <p className="text-xl font-black text-slate-900 font-mono break-all">
                                        {createdData.login?.email ?? formData.login.login_id}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                                        Password (Security Code)
                                    </span>
                                    <p className="text-xl font-black text-indigo-600 font-mono">
                                        {createdData.login?.password ?? formData.login.password}
                                    </p>
                                </div>
                            </>
                        )}
                        {!createdData && (
                            <>
                                <div className="mb-4">
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Agent Code</span>
                                    <p className="text-xl font-black text-slate-900 font-mono">{formData.agent_code}</p>
                                </div>
                                <div className="mb-4">
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                                        Email (đăng nhập)
                                    </span>
                                    <p className="text-xl font-black text-slate-900 font-mono break-all">
                                        {formData.login.login_id}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                                        Password (Security Code)
                                    </span>
                                    <p className="text-xl font-black text-indigo-600 font-mono">
                                        {formData.login.password}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                // Refresh AgentList before navigating
                                if ((window as any).refreshAgentList) {
                                    (window as any).refreshAgentList();
                                }
                                setView("AGENT_LIST");
                            }}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black hover:bg-black transition-all shadow-lg text-sm"
                        >
                            View List
                        </button>
                        <button
                            onClick={() => {
                                setIsSuccess(false);
                                setFormData({
                                    ...formData,
                                    branch_name: "",
                                    login: { login_id: "", password: "", status: "active" },
                                });
                                setImagePreview(null);
                            }}
                            className="flex-1 py-4 border-2 border-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-50 transition-all text-sm"
                        >
                            Add Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle size={20} />
                        <p className="font-bold text-sm">{error}</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 text-[#f97316] rounded-xl flex items-center justify-center border border-orange-100 shrink-0">
                                <Warehouse size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-900">Operational Info</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="w-24 sm:w-28 space-y-1.5 shrink-0 mx-auto sm:mx-0">
                                    <label className="text-[10px] font-bold text-slate-500 block text-center sm:text-left">
                                        Avatar
                                    </label>
                                    <label className="relative flex flex-col items-center justify-center w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-all overflow-hidden group">
                                        {imagePreview ? (
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={imagePreview}
                                                    className="w-full h-full object-cover"
                                                    alt="Preview"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Upload className="w-5 h-5 text-white" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <Camera className="w-6 h-6 text-slate-300 mb-1" />
                                                <span className="text-[9px] font-bold text-slate-400">Upload</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                <div className="flex-1 w-full space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 ml-1">
                                            Branch Name *
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. NY-Central-Hub"
                                            value={formData.branch_name}
                                            onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white transition-all font-medium text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 ml-1">
                                            Manager Name *
                                        </label>
                                        <div className="relative">
                                            <User
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                                                size={16}
                                            />
                                          <input
                                                required
                                                type="text"
                                                placeholder="Full Name"
                                                value={formData.branch_manager_name}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // CƠ CHẾ MỚI: Tách từng ký tự, chỉ giữ lại ký tự CHỮ và KHOẢNG TRẮNG
                                                    // Nếu nhập số, nó sẽ bị loại bỏ ngay lập tức khỏi chuỗi
                                                    const cleanVal = val.split('').filter(char => /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]$/.test(char)).join('');
                                                    
                                                    setFormData({ ...formData, branch_manager_name: cleanVal });
                                                }}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white transition-all font-medium text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 ml-1">Manager Phone *</label>
                                <div className="relative">
                                    <Phone
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                                        size={16}
                                    />
                                    <input
                                        required
                                        type="tel"
                                        placeholder="+123..."
                                        value={formData.branch_manager_phone}
                                        onChange={(e) => {
                                            // CƠ CHẾ MỚI: Tìm tất cả ký tự KHÔNG PHẢI SỐ (regex /[^0-9]/g) và xóa đi ngay lập tức
                                            const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                                            setFormData({ ...formData, branch_manager_phone: cleanVal });
                                        }}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white transition-all font-medium text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
                                <MapPin size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-900">Branch Location</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 ml-1">Hub City *</label>
                                <div className="relative">
                                    <select
                                        required
                                        value={formData.address.city}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                address: { ...formData.address, city: e.target.value },
                                            })
                                        }
                                        className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white transition-all font-medium text-sm appearance-none"
                                    >
                                        <option value="">Select City</option>
                                        <option value="Hanoi">Hanoi (HN)</option>
                                        <option value="Ho Chi Minh City">Ho Chi Minh City (SG)</option>
                                        <option value="Danang">Danang (DN)</option>
                                        <option value="Khanh Hoa">Khanh Hoa (KH)</option>
                                    </select>
                                    <ChevronDown
                                        size={14}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 ml-1">District *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Westminster"
                                    value={formData.address.district}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            address: { ...formData.address, district: e.target.value },
                                        })
                                    }
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white transition-all font-medium text-sm"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 ml-1">Full Address *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Street name and number"
                                    value={formData.address.street}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            address: { ...formData.address, street: e.target.value },
                                        })
                                    }
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white transition-all font-medium text-sm"
                                />
                            </div>
                        </div>
                    </section>
                </div>

                <section className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
                            <Truck size={20} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900">Transport Capacity (Fleet)</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                        {[
                            { key: "motorbike", label: "Motorbike", icon: Bike, color: "text-slate-400" },
                            { key: "truck_2t", label: "2.0t Truck", icon: Truck, color: "text-indigo-500" },
                            { key: "truck_3_5t", label: "3.5t Truck", icon: Truck, color: "text-amber-500" },
                            { key: "truck_5t", label: "5.0t Truck", icon: Truck, color: "text-rose-400" },
                        ].map((v) => (
                            <div
                                key={v.key}
                                className="space-y-3 p-6 bg-slate-50/50 rounded-[24px] border border-slate-100 flex flex-col items-center justify-center transition-all hover:bg-white hover:shadow-md hover:border-orange-100 group"
                            >
                                <div
                                    className={`p-4 rounded-2xl bg-white shadow-sm mb-1 ${v.color} transition-transform group-hover:scale-110`}
                                >
                                    <v.icon size={28} />
                                </div>
                                <label className="text-xs font-black text-slate-500 text-center uppercase tracking-wider">
                                    {v.label}
                                </label>
                                <div className="relative w-full max-w-[120px]">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formData.vehicles[v.key as keyof typeof formData.vehicles]}
                                        onFocus={(e) => e.target.select()} // Tự động bôi đen số cũ khi bấm vào
                                        onChange={(e) => {
                                            // 1. Quét sạch ký tự không phải số
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            
                                            // 2. Nếu xóa hết thì lưu là 0
                                            if (val === "") {
                                                setFormData({
                                                    ...formData,
                                                    vehicles: { ...formData.vehicles, [v.key]: 0 },
                                                });
                                                return;
                                            }

                                            // 3. Xử lý giới hạn max 15
                                            const numVal = parseInt(val, 10);
                                            const finalVal = numVal > 15 ? 15 : numVal; // Nếu lớn hơn 15 thì lấy 15, ngược lại lấy số vừa nhập

                                            setFormData({
                                                ...formData,
                                                vehicles: { ...formData.vehicles, [v.key]: finalVal },
                                            });
                                        }}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-black text-slate-900 text-center text-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
                                <Shield size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-900">Access Control & Security</h2>
                        </div>
                        <button
                            type="button"
                            onClick={handleGenerateAccount}
                            disabled={!formData.address.city || !formData.address.district || !formData.branch_name}
                            className="flex items-center gap-2 px-6 py-3 bg-[#f97316] text-white rounded-xl font-black text-sm shadow-lg hover:bg-[#ea580c] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Zap size={18} />
                            Generate Account
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 ml-1 flex items-center gap-1">
                                <Hash size={12} />
                                ID Branch
                            </label>
                            <div className="relative">
                                <input
                                    readOnly
                                    type="text"
                                    value={formData.agent_code || "Click Generate Account..."}
                                    className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-xs tracking-tight transition-all cursor-not-allowed ${
                                        formData.agent_code ? "text-slate-900" : "text-slate-400 italic"
                                    }`}
                                />
                                {formData.agent_code && (
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(formData.agent_code, "agent_code")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#f97316] transition-all"
                                    >
                                        {copiedField === "agent_code" ? (
                                            <Check size={14} className="text-emerald-500" />
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 ml-1 flex items-center gap-1">
                                System Login ID
                            </label>
                            <div className="relative">
                                <input
                                    readOnly
                                    type="text"
                                    value={formData.login.login_id || "Click Generate Account..."}
                                    className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-xs tracking-tight transition-all cursor-not-allowed ${
                                        formData.login.login_id ? "text-slate-900" : "text-slate-400 italic"
                                    }`}
                                />
                                {formData.login.login_id && (
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(formData.login.login_id, "id")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#f97316] transition-all"
                                    >
                                        {copiedField === "id" ? (
                                            <Check size={14} className="text-emerald-500" />
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 ml-1 flex items-center gap-1">
                                Security Code
                            </label>
                            <div className="relative">
                                <input
                                    readOnly
                                    type="text"
                                    value={formData.login.password || "Click Generate Account..."}
                                    className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs tracking-widest transition-all cursor-not-allowed ${
                                        formData.login.password ? "text-indigo-600" : "text-slate-400 italic"
                                    }`}
                                />
                                {formData.login.password && (
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(formData.login.password, "pwd")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#f97316] transition-all"
                                    >
                                        {copiedField === "pwd" ? (
                                            <Check size={14} className="text-emerald-500" />
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 h-[46px] px-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <div className="flex-1 text-[11px] font-bold text-slate-700">
                            Status: <span className="text-emerald-600">Active</span>
                        </div>
                        <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>

                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex items-start gap-3">
                        <AlertCircle className="text-indigo-400 shrink-0 mt-0.5" size={14} />
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-tight">
                            Notice: Click "Generate Account" to automatically generate ID Branch, System Login ID, and
                            Security Code. All branches are created with Active status by default.
                        </p>
                    </div>
                </section>

                <div className="flex justify-center pt-2 px-4">
                    <button
                        disabled={
                            isLoading || !formData.agent_code || !formData.login.login_id || !formData.login.password
                        }
                        className="w-full max-w-md py-4 bg-[#f97316] text-white rounded-xl text-sm font-black shadow-lg hover:bg-[#ea580c] transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin w-5 h-5" />
                        ) : (
                            <>
                                <UserPlus size={18} /> Register Branch
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AgentCreate;
