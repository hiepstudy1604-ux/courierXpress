import React, { useState, useEffect, useRef } from "react";
import { UserRole, User } from "../types";
import { Mail, Lock, ArrowLeft, Loader2, ShieldCheck, User as UserIcon, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { AuthService } from "../services/api";

interface Props {
    onLogin: (user: User) => void;
    onBack: () => void;
    initialMode?: "login" | "signup";
}

const CustomLogo = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path
            d="M12 2L3.5 6.5V17.5L12 22L20.5 17.5V6.5L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path
            d="M20.5 6.5L12 11.5L3.5 6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M17 12.5L12 15.5L7 12.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
        />
    </svg>
);

const AuthPage: React.FC<Props> = ({ onLogin, onBack, initialMode = "login" }) => {
    const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
    const [isStaffPortal, setIsStaffPortal] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form states
    const [fullName, setFullName] = useState("");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

    // OTP states
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

    const validatePassword = (value: string) => {
        // Rules:
        // - must be ASCII printable characters (no Vietnamese diacritics / non-ASCII)
        // - no whitespace
        // - include uppercase, lowercase, number, special char
        const isAsciiPrintableNoSpace = /^[\x21-\x7E]+$/.test(value); // printable ASCII excluding space
        const hasUpper = /[A-Z]/.test(value);
        const hasLower = /[a-z]/.test(value);
        const hasNumber = /\d/.test(value);
        const hasSpecial = /[^A-Za-z0-9]/.test(value);
        const minLength = value.length >= 8;

        return {
            minLength,
            hasUpper,
            hasLower,
            hasNumber,
            hasSpecial,
            isAsciiPrintableNoSpace,
            isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial && isAsciiPrintableNoSpace,
        };
    };

    const passwordRules = validatePassword(password);
    const passwordScore =
        Number(passwordRules.minLength) +
        Number(passwordRules.hasUpper) +
        Number(passwordRules.hasLower) +
        Number(passwordRules.hasNumber) +
        Number(passwordRules.hasSpecial) +
        Number(passwordRules.isAsciiPrintableNoSpace);

    const passwordStrength =
        password.length === 0 ? "EMPTY" : passwordScore <= 3 ? "WEAK" : passwordScore <= 5 ? "MEDIUM" : "STRONG";

    useEffect(() => {
        setIsSignUp(initialMode === "signup");
        setShowOtp(false);

        // Load remembered email if exists
        if (!isSignUp) {
            const rememberedEmail = localStorage.getItem("cx_remembered_email");
            if (rememberedEmail) {
                setIdentifier(rememberedEmail);
                setRememberMe(true);
            }
        }
    }, [initialMode, isSignUp]);

    const isRoleAllowedForPortal = (role: UserRole) => {
        if (isStaffPortal) return role === UserRole.ADMIN || role === UserRole.AGENT;
        return role === UserRole.CUSTOMER;
    };

    const getPortalMismatchMessage = (role: UserRole) => {
        if (isStaffPortal) {
            return `Account ${role} cannot log in to the internal portal. Please log in via the Customer portal.`;
        }
        return `Account ${role} cannot log in to the Customer portal. Please use the internal login (Admin/Agent).`;
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isSignUp) {
                if (!passwordRules.isAsciiPrintableNoSpace) {
                    alert("Password must not contain spaces or non-ASCII characters (ASCII only).");
                    setIsLoading(false);
                    return;
                }
                if (!passwordRules.isValid) {
                    alert(
                        "Password does not meet requirements: at least 8 characters, includes uppercase, lowercase, number, special character; no spaces and no non-ASCII characters.",
                    );
                    setIsLoading(false);
                    return;
                }

                // Register new user
                if (password !== confirmPassword) {
                    alert("Passwords do not match");
                    setIsLoading(false);
                    return;
                }

                const response = await AuthService.register({
                    name: fullName,
                    email: identifier,
                    password: password,
                    role: isStaffPortal ? (identifier.includes("admin") ? "ADMIN" : "AGENT") : "CUSTOMER",
                });

                if (response.data.success) {
                    // Store token
                    localStorage.setItem("cx_token", response.data.data.token);
                    // For now, skip OTP and login directly
                    onLogin({
                        id: response.data.data.user.id,
                        name: response.data.data.user.name,
                        email: response.data.data.user.email,
                        role: response.data.data.user.role as UserRole,
                        branch: response.data.data.user.branch || undefined,
                        phone: response.data.data.user.phone || undefined,
                    });
                }
            } else {
                // Login
                const response = await AuthService.login(identifier, password);

                if (response.data.success) {
                    const role = response.data.data.user.role as UserRole;

                    // Enforce portal separation by role
                    if (!isRoleAllowedForPortal(role)) {
                        localStorage.removeItem("cx_token");
                        alert(getPortalMismatchMessage(role));
                        return;
                    }

                    // Store token
                    localStorage.setItem("cx_token", response.data.data.token);

                    // Handle remember me
                    if (rememberMe) {
                        localStorage.setItem("cx_remembered_email", identifier);
                    } else {
                        localStorage.removeItem("cx_remembered_email");
                    }

                    onLogin({
                        id: response.data.data.user.id,
                        name: response.data.data.user.name,
                        email: response.data.data.user.email,
                        role,
                        branch: response.data.data.user.branch || undefined,
                        phone: response.data.data.user.phone || undefined,
                    });
                }
            }
        } catch (error: any) {
            console.error("Auth error:", error);
            const errorMessage = error.response?.data?.message || error.message || "An error occurred";
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1); // Only allow one char
        if (!/^\d*$/.test(value)) return; // Only allow digits

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next
        if (value && index < 5) {
            otpInputs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpInputs.current[index - 1]?.focus();
        }
    };

    const verifyOtp = async () => {
        setIsLoading(true);
        const code = otp.join("");

        // For now, skip OTP verification and proceed with registration
        // In production, this should call an OTP verification API
        try {
            // This is a placeholder - in production, verify OTP with backend
            if (code === "123456" || code.length === 6) {
                // OTP verified, user already registered, just login
                const response = await AuthService.login(identifier, password);
                if (response.data.success) {
                    const role = response.data.data.user.role as UserRole;

                    // Enforce portal separation by role
                    if (!isRoleAllowedForPortal(role)) {
                        localStorage.removeItem("cx_token");
                        alert(getPortalMismatchMessage(role));
                        return;
                    }

                    localStorage.setItem("cx_token", response.data.data.token);
                    onLogin({
                        id: response.data.data.user.id,
                        name: response.data.data.user.name,
                        email: response.data.data.user.email,
                        role,
                        branch: response.data.data.user.branch || undefined,
                        phone: response.data.data.user.phone || undefined,
                    });
                }
            } else {
                alert("Invalid OTP code. Please use 123456 for testing.");
            }
        } catch (error: any) {
            console.error("OTP verification error:", error);
            alert(error.response?.data?.message || "OTP verification failed");
        } finally {
            setIsLoading(false);
        }
    };

    if (showOtp) {
        return (
            <div className="h-screen bg-[#f3f4f6] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="max-w-md w-full bg-white rounded-[40px] border border-slate-200 shadow-2xl p-10 lg:p-12 space-y-10">
                    {/* Back Button */}
                    <button
                        type="button"
                        onClick={() => setShowOtp(false)}
                        className="flex items-center text-slate-400 font-bold hover:text-[#f97316] transition-all group text-sm"
                    >
                        <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back
                    </button>

                    <div className="text-center space-y-4">
                        <h1 className="text-lg font-medium text-slate-600 leading-relaxed">
                            Enter the OTP that was just sent to your email
                            <br />
                            <span className="font-black text-slate-900 text-xl">{identifier}</span>
                        </h1>
                    </div>

                    <div className="flex justify-center gap-2 sm:gap-3">
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                aria-label={`OTP digit ${i + 1}`}
                                // Fix: ref callback must return void to avoid TS error
                                ref={(el) => {
                                    otpInputs.current[i] = el;
                                }}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(i, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-2xl font-black text-slate-900 bg-white border border-slate-200 rounded-2xl focus:border-[#f97316] focus:ring-4 focus:ring-orange-500/10 outline-none transition-all shadow-sm"
                            />
                        ))}
                    </div>

                    <div className="text-center space-y-8">
                        <p className="text-sm font-bold text-slate-400">
                            Didn't receive the OTP?{" "}
                            <button type="button" className="text-[#f97316] font-black hover:underline transition-all">Resend</button>
                        </p>

                        <button
                            type="button"
                            onClick={verifyOtp}
                            disabled={isLoading || otp.some((d) => !d)}
                            className="w-full py-4 bg-[#f97316] text-white rounded-2xl font-black text-base shadow-lg shadow-orange-100 hover:bg-[#ea580c] transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center tracking-widest uppercase"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={24} /> : "Verify account"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#f3f4f6] flex overflow-hidden relative">
            <div
                className={`hidden lg:block w-1/2 p-12 lg:p-24 transition-colors duration-700 ${isStaffPortal ? "bg-slate-900" : "bg-[#f97316]"}`}
            >
                <div className="h-full rounded-[60px] bg-white/10 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center text-white text-center p-12 space-y-8">
                    <div className="w-40 h-40 bg-white p-8 rounded-[40px] shadow-2xl flex items-center justify-center overflow-hidden">
                        <CustomLogo size={100} className={isStaffPortal ? "text-slate-900" : "text-[#f97316]"} />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-4xl font-black tracking-tight leading-tight">
                            {isStaffPortal
                                ? "Operational Systems"
                                : isSignUp
                                  ? "Join CourierXPress"
                                  : "Efficiency in Motion"}
                        </h2>
                        <p className="text-white/70 text-lg font-medium leading-relaxed max-w-sm mx-auto">
                            {isStaffPortal
                                ? "Manage branches, monitor fleet logistics, and coordinate nationwide operations."
                                : isSignUp
                                  ? "Create an account to track your parcels and manage shipments effortlessly."
                                  : "Top logistics automation system helping you manage thousands of shipments every day."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-20 py-8 overflow-y-auto bg-white lg:bg-transparent">
                <div className="max-w-sm w-full mx-auto space-y-6">
                    <div className="mt-4 mb-2">
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex items-center text-slate-400 font-bold hover:text-[#f97316] transition-all group text-sm"
                        >
                            <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Home
                        </button>
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            {isSignUp ? "Create new account" : isStaffPortal ? "Staff Access" : "Welcome back"}
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            {isSignUp ? (
                                <>
                                    Already have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSignUp(false);
                                            setIsStaffPortal(false);
                                        }}
                                        className="text-[#f97316] font-bold hover:underline"
                                    >
                                        Log in now
                                    </button>
                                </>
                            ) : (
                                <>
                                    Don't have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSignUp(true);
                                            setIsStaffPortal(false);
                                        }}
                                        className="text-[#f97316] font-bold hover:underline"
                                    >
                                        Sign up for free
                                    </button>
                                </>
                            )}
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleAuth}>
                        {isSignUp && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <UserIcon
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                                        size={18}
                                    />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 shadow-sm transition-all font-medium text-sm text-slate-900"
                                        placeholder="John Doe"
                                        required
                                        autoComplete="name"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                {isSignUp ? "Phone or Email" : isStaffPortal ? "Login ID" : "Phone or Email"}
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 shadow-sm transition-all font-medium text-sm text-slate-900"
                                    placeholder="hiepstudy1604@gmail.com"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 shadow-sm transition-all font-medium text-sm text-slate-900"
                                    placeholder="••••••••"
                                    required
                                    autoComplete={isSignUp ? "new-password" : "current-password"}
                                    name="password"

                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {isSignUp && (
                                <div className="pt-2 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                            Password strength
                                        </span>
                                        <span
                                            className={`text-[11px] font-black uppercase tracking-widest ${
                                                passwordStrength === "STRONG"
                                                    ? "text-emerald-600"
                                                    : passwordStrength === "MEDIUM"
                                                      ? "text-orange-600"
                                                      : passwordStrength === "WEAK"
                                                        ? "text-rose-600"
                                                        : "text-slate-400"
                                            }`}
                                        >
                                            {passwordStrength === "EMPTY" ? "-" : passwordStrength}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${
                                                password.length === 0
                                                    ? "w-0"
                                                    : passwordStrength === "WEAK"
                                                      ? "w-1/3"
                                                      : passwordStrength === "MEDIUM"
                                                        ? "w-2/3"
                                                        : "w-full"
                                            } ${
                                                passwordStrength === "STRONG"
                                                    ? "bg-emerald-500"
                                                    : passwordStrength === "MEDIUM"
                                                      ? "bg-orange-500"
                                                      : passwordStrength === "WEAK"
                                                        ? "bg-rose-500"
                                                        : "bg-slate-200"
                                            }`}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-1.5 text-xs font-bold">
                                        <div
                                            className={passwordRules.minLength ? "text-emerald-600" : "text-slate-400"}
                                        >
                                            • At least 8 characters
                                        </div>
                                        <div className={passwordRules.hasUpper ? "text-emerald-600" : "text-slate-400"}>
                                            • Includes uppercase (A-Z)
                                        </div>
                                        <div className={passwordRules.hasLower ? "text-emerald-600" : "text-slate-400"}>
                                            • Includes lowercase (a-z)
                                        </div>
                                        <div
                                            className={passwordRules.hasNumber ? "text-emerald-600" : "text-slate-400"}
                                        >
                                            • Includes numbers (0-9)
                                        </div>
                                        <div
                                            className={passwordRules.hasSpecial ? "text-emerald-600" : "text-slate-400"}
                                        >
                                            • Includes special characters (e.g., !@#)
                                        </div>
                                        <div
                                            className={
                                                passwordRules.isAsciiPrintableNoSpace
                                                    ? "text-emerald-600"
                                                    : "text-rose-600"
                                            }
                                        >
                                            • No spaces & no non-ASCII characters
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isSignUp && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                                        size={18}
                                    />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 shadow-sm transition-all font-medium text-sm text-slate-900"
                                        placeholder="••••••••"
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {confirmPassword.length > 0 && (
                                    <p
                                        className={`text-xs font-bold ${confirmPassword === password ? "text-emerald-600" : "text-rose-600"}`}
                                    >
                                        {confirmPassword === password ? "Passwords match" : "Passwords do not match"}
                                    </p>
                                )}
                            </div>
                        )}

                        {!isSignUp && (
                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-[#f97316] focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
                                        Remember me
                                    </span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotPassword(true)}
                                    className="text-xs font-bold text-[#f97316] hover:text-[#ea580c] hover:underline transition-all"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        <div className="pt-2 space-y-4">
                            <button
                                type="submit"
                                disabled={
                                    isLoading || (isSignUp && (!passwordRules.isValid || confirmPassword !== password))
                                }
                                className={`w-full py-4 rounded-2xl font-black text-base shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center text-white ${isStaffPortal ? "bg-slate-900 hover:bg-black" : "bg-[#f97316] hover:bg-[#ea580c]"}`}
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : isSignUp ? (
                                    "REGISTER NOW"
                                ) : (
                                    "LOG IN NOW"
                                )}
                            </button>
                            {!isStaffPortal && !isSignUp && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsStaffPortal(true);
                                        setIsSignUp(false);
                                    }}
                                    className="w-full bg-white border-2 border-slate-100 text-slate-500 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 hover:border-[#f97316]/30 hover:text-[#f97316] transition-all transform active:scale-[0.98]"
                                >
                                    <ShieldCheck size={18} />
                                    Internal CourierXPress Login
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl max-w-md w-full p-8 space-y-6 animate-in zoom-in duration-300">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-900">Forgot password</h2>
                            <button
                                type="button"
                                aria-label="Close forgot password dialog"
                                onClick={() => {
                                    setShowForgotPassword(false);
                                    setForgotPasswordEmail("");
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <p className="text-sm text-slate-500 font-medium">
                            Enter your email and we'll send you a password reset link.
                        </p>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="email"
                                    value={forgotPasswordEmail}
                                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 shadow-sm transition-all font-medium text-sm text-slate-900"
                                    placeholder="abc@gmail.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForgotPassword(false);
                                    setForgotPasswordEmail("");
                                }}
                                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!forgotPasswordEmail) {
                                        alert("Please enter your email");
                                        return;
                                    }

                                    setIsLoading(true);
                                    try {
                                        const response = await AuthService.forgotPassword(forgotPasswordEmail);
                                        if (response.data.success) {
                                            alert(
                                                `A password reset link has been sent to ${forgotPasswordEmail}\n\nPlease check your email.`,
                                            );
                                            setShowForgotPassword(false);
                                            setForgotPasswordEmail("");
                                        } else {
                                            alert(response.data.message || "Something went wrong. Please try again.");
                                        }
                                    } catch (error: any) {
                                        console.error("Forgot password error:", error);
                                        alert(
                                            error.response?.data?.message || "Something went wrong. Please try again.",
                                        );
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                                disabled={isLoading || !forgotPasswordEmail}
                                className="flex-1 py-3.5 bg-[#f97316] text-white rounded-2xl font-black text-sm hover:bg-[#ea580c] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Send link"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthPage;
