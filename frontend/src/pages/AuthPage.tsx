import React, { useState, useEffect } from "react";
import { UserRole, User } from "../types";
import {
  Mail,
  Lock,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  User as UserIcon,
  Eye,
  EyeOff,
  KeyRound, // [THÊM] Icon cho mã OTP
} from "lucide-react";
import { AuthService } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Props {
  onLogin: (user: User) => void;
  onBack: () => void;
  initialMode?: "login" | "signup";
  showLogoutNotice?: boolean;
  onLogoutNoticeClose?: () => void;
}

const CustomLogo = ({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ overflow: "visible" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L3.5 6.5V17.5L12 22L20.5 17.5V6.5L12 2Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 22V12"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 6.5L12 11.5L3.5 6.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 12.5L12 15.5L7 12.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.5}
      />
    </svg>
  );
};

const AuthPage: React.FC<Props> = ({
  onLogin,
  onBack,
  initialMode = "login",
  showLogoutNotice = false,
  onLogoutNoticeClose,
}) => {
const [authError, setAuthError] = useState<string | null>(null);
  const { login, logout } = useAuth();

  // Logout notification state
  const [showLogoutModal, setShowLogoutModal] = useState(showLogoutNotice);

  useEffect(() => {
    setShowLogoutModal(showLogoutNotice);
  }, [showLogoutNotice]);

  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
  const [isStaffPortal, setIsStaffPortal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  /** * [MỚI] Các State phục vụ luồng Quên mật khẩu & OTP * */
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [resetStep, setResetStep] = useState<"EMAIL" | "OTP">("EMAIL");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showEmailExistsModal, setShowEmailExistsModal] = useState(false);
  const [showRegisterSuccessModal, setShowRegisterSuccessModal] = useState(false);

  const validatePassword = (value: string) => {
    const isAsciiPrintableNoSpace = /^[\x21-\x7E]+$/.test(value);
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
      isValid:
        minLength &&
        hasUpper &&
        hasLower &&
        hasNumber &&
        hasSpecial &&
        isAsciiPrintableNoSpace,
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
    password.length === 0
      ? "EMPTY"
      : passwordScore <= 3
        ? "WEAK"
        : passwordScore <= 5
          ? "MEDIUM"
          : "STRONG";

  useEffect(() => {
    setIsSignUp(initialMode === "signup");
    if (initialMode === "login") {
      const rememberedEmail = localStorage.getItem("cx_remembered_email");
      if (rememberedEmail) {
        setIdentifier(rememberedEmail);
        setRememberMe(true);
      }
    }
  }, [initialMode]);

  const isRoleAllowedForPortal = (role: UserRole) => {
    if (isStaffPortal)
      return role === UserRole.ADMIN || role === UserRole.AGENT;
    return role === UserRole.CUSTOMER;
  };

  const getPortalMismatchMessage = (role: UserRole) => {
    if (isStaffPortal) {
      return `The ${role} cannot login to the Internal Portal. Please login to the Customer Portal.`;
    }
    return `The ${role} cannot login to the Customer Portal. Please login to the Internal Portal (Admin/Agent).`;
  };

  const isValidEmailFormat = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        if (!identifier || !isValidEmailFormat(identifier)) {
          alert("Please enter a valid email address.");
          setIsLoading(false);
          return;
        }
        // BỎ kiểm tra checkEmail
        if (!passwordRules.isAsciiPrintableNoSpace) {
          alert("Password cannot contain spaces or special characters (only use ASCII characters).");
          setIsLoading(false);
          return;
        }
        if (!passwordRules.isValid) {
          alert("Password does not meet the requirements: minimum 8 characters, uppercase, lowercase, numbers, special characters; no spaces or special characters.");
          setIsLoading(false);
          return;
        }
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
          setShowRegisterSuccessModal(true);
          // Không tự động login nữa, chỉ show modal
          // login(token, user);
          // onLogin(user);
        }
      } else {
        const response = await AuthService.login(identifier, password);

        if (response.data.success) {
          const role = response.data.data.user.role as UserRole;

          if (!isRoleAllowedForPortal(role)) {
            alert(getPortalMismatchMessage(role));
            setIsLoading(false);
            return;
          }

          if (rememberMe) {
            localStorage.setItem("cx_remembered_email", identifier);
          } else {
            localStorage.removeItem("cx_remembered_email");
          }

          const token = response.data.data.token;
          const user = response.data.data.user;
          login(token, user); 
          onLogin(user); 
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      const status = error?.response?.status;
      const emailErrors = error?.response?.data?.errors?.email;
      const looksLikeDuplicateEmail = status === 422 && Array.isArray(emailErrors) && emailErrors.some((m: any) => String(m).toLowerCase().includes("already been taken"));

      if (isSignUp && looksLikeDuplicateEmail) {
        setShowEmailExistsModal(true);
        return;
      }
      const errorMessage = error.response?.data?.message || error.message || "An error occurred";
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /** * [MỚI] Hàm xử lý gửi yêu cầu OTP quên mật khẩu * */
  const handleRequestOtp = async () => {
    if (!forgotPasswordEmail || !isValidEmailFormat(forgotPasswordEmail)) {
      alert("Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await AuthService.forgotPassword(forgotPasswordEmail);
      if (response.data.success) {
        alert("OTP recovery code has been sent to your email!");
        setResetStep("OTP"); // Chuyển sang bước 2
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "System error while sending OTP");
    } finally {
      setIsLoading(false);
    }
  };

  /** * [MỚI] Hàm xử lý đặt lại mật khẩu bằng mã OTP * */
  const handleResetPassword = async () => {
    if (otpCode.length !== 6) { alert("OTP code must be 6 digits!"); return; }
    if (newPassword.length < 8) { alert("New password must be at least 8 characters!"); return; }
    if (newPassword !== confirmNewPassword) { alert("Password confirmation does not match!"); return; }

    setIsLoading(true);
    try {
      const response = await AuthService.resetPassword({
        email: forgotPasswordEmail,
        otp: otpCode,
        password: newPassword,
        password_confirmation: confirmNewPassword
      });

      if (response.data.success) {
        alert("Congratulations! Your password has been successfully changed.");
        setShowForgotPassword(false);
        setResetStep("EMAIL");
        setOtpCode("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "OTP code is invalid or expired.");
    } finally {
      setIsLoading(false);
    }
  };

  // Modal for email exists
  const EmailExistsModal = ({ visible, onClose, onGoLogin }: { visible: boolean; onClose: () => void; onGoLogin: () => void }) => {
    if (!visible) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center animate-fade-in">
          <Mail size={40} className="mx-auto text-blue-500 mb-2" />
          <h2 className="text-lg font-semibold mb-2">Email already registered</h2>
          <p className="mb-4 text-gray-600">This email is already registered in the system. Do you want to go back to the login page?</p>
          <div className="flex gap-2 justify-center">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              onClick={onGoLogin}
            >Go back to login</button>
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              onClick={onClose}
            >Close</button>
          </div>
        </div>
      </div>
    );
  };

  // Modal for register success
  const RegisterSuccessModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
    if (!visible) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center animate-fade-in">
          <Mail size={40} className="mx-auto text-green-500 mb-2" />
          <h2 className="text-lg font-semibold mb-2 text-green-700">Registration successful!</h2>
          <p className="mb-4 text-gray-600">Your account has been created. Please check your email to confirm registration.</p>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            onClick={() => {
              setShowRegisterSuccessModal(false);
              setIsSignUp(false);
              setIsStaffPortal(false);
            }}
          >Go back to login</button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen h-screen bg-[#f3f4f6] flex items-center justify-center overflow-hidden relative">
        {/* Logout notification modal */}
        {(showLogoutModal || showLogoutNotice) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl px-12 py-12 flex flex-col items-center animate-scaleIn" style={{ minWidth: 400, minHeight: 300, boxShadow: "0 20px 60px 0 rgba(249,115,22,0.15)", border: "none", transition: 'transform 0.2s' }}>
              <div className="flex flex-col items-center mb-6">
                <div className="bg-gradient-to-tr from-[#f97316]/80 to-[#fbbf24]/80 rounded-full p-6 mb-4 shadow-lg">
                  <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="12" fill="#f97316" fillOpacity="0.18"/>
                    <path d="M12 8v4" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1.5" fill="#f97316"/>
                    <circle cx="12" cy="12" r="9.5" stroke="#f97316" strokeWidth="2"/>
                  </svg>
                </div>
                <span className="text-3xl font-extrabold mb-2 text-gray-900 text-center tracking-tight drop-shadow-sm">Đăng xuất tài khoản?</span>
                <p className="text-base text-slate-500 mb-8 text-center max-w-xs font-medium">Bạn chắc chắn muốn đăng xuất khỏi <span className="text-[#f97316] font-bold">CourierXpress</span>?<br/>Mọi thao tác chưa lưu sẽ bị mất.</p>
              </div>
              <div className="flex gap-4 w-full justify-center">
                <button
                  className="flex-1 py-3 bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white rounded-xl font-extrabold shadow-lg hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-lg"
                  onClick={() => { logout(); setShowLogoutModal(false); }}
                >
                  Đăng xuất
                </button>
                <button className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-extrabold shadow hover:bg-gray-200 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 text-lg" onClick={() => setShowLogoutModal(false)}>Hủy</button>
              </div>
            </div>
          </div>
        )}

        {/* --- PHẦN GIAO DIỆN TRÁI (SIDEBAR) --- */}
        <div className={`hidden lg:flex flex-col justify-center items-center w-1/2 min-h-screen transition-colors duration-700 ${isStaffPortal ? "bg-slate-900" : "bg-[#f97316]"}`}>
          <div className="flex flex-col items-center justify-center w-full h-full animate-fadeIn" style={{minHeight: 500}}>
            <div className="w-32 h-32 bg-white p-6 rounded-3xl shadow-2xl flex items-center justify-center mb-6">
              <CustomLogo size={80} className={isStaffPortal ? "text-slate-900" : "text-[#f97316]"} />
            </div>
            <h2 className="text-3xl font-black text-white drop-shadow-lg mb-2">
              {isStaffPortal ? "Operational Systems" : isSignUp ? "Join CourierXpress" : "Efficiency in Motion"}
            </h2>
            <p className="text-white/80 text-base font-medium max-w-xs text-center leading-relaxed">
              {isStaffPortal ? "Manage branches, monitor fleet logistics, and coordinate nationwide operations." : isSignUp ? "Create an account to track your parcels and manage shipments effortlessly." : "Top logistics automation system helping you manage thousands of shipments every day."}
            </p>
          </div>
        </div>

        {/* --- PHẦN GIAO DIỆN PHẢI (FORMS) --- */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-2 py-4 bg-white lg:bg-transparent min-h-screen animate-fadeIn">
          <div className="w-full max-w-md mx-auto rounded-2xl shadow-xl bg-white p-4 sm:p-6 flex flex-col gap-4 border border-slate-50 relative max-h-[96vh] overflow-y-auto">
            <div className="sticky top-0 left-0 z-20 flex justify-start bg-transparent pt-2 pb-1">
              <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold hover:text-[#f97316] transition-all group text-sm bg-white/80 px-3 py-1.5 rounded-xl shadow hover:shadow-md">
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span>Back</span>
              </button>
            </div>
            
            <div className="pt-2 pb-1 text-center">
              <h1 className="text-xl font-black text-slate-900 tracking-tight mb-1">{isSignUp ? "Create new account" : isStaffPortal ? "Staff Access" : "Welcome back"}</h1>
              <p className="text-xs text-slate-500 font-medium">
                {isSignUp ? (<>Already have an account? <button onClick={() => { setIsSignUp(false); setIsStaffPortal(false); }} className="text-[#f97316] font-bold hover:underline">Log in now</button></>) : (<>Don't have an account? <button onClick={() => { setIsSignUp(true); setIsStaffPortal(false); }} className="text-[#f97316] font-bold hover:underline">Sign up for free</button></>)}
              </p>
            </div>

            <form className="space-y-3" onSubmit={handleAuth} autoComplete="off">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Full Name <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 shadow-sm transition-all font-medium text-sm text-slate-900" placeholder="Nguyễn Hoàng Hiệp" required />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {isSignUp ? "Email" : isStaffPortal ? "Login ID" : "Phone or Email"}
                  {isSignUp && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 shadow-sm transition-all font-medium text-sm text-slate-900" placeholder="hiepstudy1604@gmail.com" required />
                </div>
                {isSignUp && <p className="text-[11px] font-semibold text-slate-400">We’ll check if your email domain can receive mail (anti fake / disposable email).</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Password {isSignUp && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 shadow-sm transition-all font-medium text-sm text-slate-900" placeholder="••••••••" required autoComplete={isSignUp ? "new-password" : "current-password"} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
                {isSignUp && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Password strength</span>
                      <span className={`text-[11px] font-black uppercase ${passwordStrength === "STRONG" ? "text-emerald-600" : passwordStrength === "MEDIUM" ? "text-orange-600" : passwordStrength === "WEAK" ? "text-rose-600" : "text-slate-400"}`}>{passwordStrength === "EMPTY" ? "-" : passwordStrength}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${passwordStrength === "STRONG" ? "bg-emerald-500" : passwordStrength === "MEDIUM" ? "bg-orange-500" : passwordStrength === "WEAK" ? "bg-rose-500" : "bg-slate-200"}`} style={{ width: password.length === 0 ? "0%" : passwordStrength === "WEAK" ? "33%" : passwordStrength === "MEDIUM" ? "66%" : "100%" }} />
                    </div>
                    <p className={`text-xs font-bold ${passwordRules.isValid ? "text-emerald-600" : "text-rose-600"}`}>Password must be at least 8 characters, contain uppercase, lowercase, number, special character, and no accented characters.</p>
                  </div>
                )}
              </div>

              {isSignUp && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Confirm Password <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 shadow-sm transition-all font-medium text-sm text-slate-900" placeholder="password" required />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                  {confirmPassword.length > 0 && <p className={`text-xs font-bold ${confirmPassword === password ? "text-emerald-600" : "text-rose-600"}`}>{confirmPassword === password ? "Mật khẩu khớp" : "Mật khẩu không khớp"}</p>}
                </div>
              )}

              {!isSignUp && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-[#f97316] cursor-pointer" />
                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">Remember me</span>
                  </label>
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs font-bold text-[#f97316] hover:underline">Forgot password?</button>
                </div>
              )}

              <div className="pt-1 space-y-3">
                <button type="submit" disabled={isLoading || (isSignUp && (!passwordRules.isValid || confirmPassword !== password))} className={`w-full py-3 rounded-xl font-black shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center text-white ${isStaffPortal ? "bg-slate-900 hover:bg-black" : "bg-[#f97316] hover:bg-[#ea580c]"}`}>
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : isSignUp ? "REGISTER NOW" : "LOG IN NOW"}
                </button>
                {!isStaffPortal && !isSignUp && (
                  <button type="button" onClick={() => { setIsStaffPortal(true); setIsSignUp(false); }} className="w-full bg-white border-2 border-slate-100 text-slate-500 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm hover:border-[#f97316]/30 hover:text-[#f97316] transition-all">
                    <ShieldCheck size={18} /> Internal CourierXpress Login
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* --- [NÂNG CẤP] MODAL QUÊN MẬT KHẨU & OTP --- */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl max-w-md w-full p-8 space-y-6 animate-in zoom-in duration-300 relative">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">
                  {resetStep === "EMAIL" ? "Forgot password" : "Reset Password"}
                </h2>
                <button onClick={() => { setShowForgotPassword(false); setResetStep("EMAIL"); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              {resetStep === "EMAIL" ? (
                /* --- BƯỚC 1: NHẬP EMAIL ĐỂ NHẬN OTP --- */
                <>
                  <p className="text-sm text-slate-500 font-medium">Enter your email address, and we will send you a 6-digit OTP code to recover your password.</p>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="email" value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 shadow-sm transition-all font-medium text-sm text-slate-900" placeholder="hiepstudy1604@gmail.com" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowForgotPassword(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">Cancel</button>
                    <button onClick={handleRequestOtp} disabled={isLoading || !forgotPasswordEmail} className="flex-1 py-3.5 bg-[#f97316] text-white rounded-2xl font-black text-sm hover:bg-[#ea580c] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Gửi mã OTP"}
                    </button>
                  </div>
                </>
              ) : (
                /* --- BƯỚC 2: NHẬP OTP & MẬT KHẨU MỚI --- */
                <div className="space-y-4">
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                      <p className="text-xs text-orange-700 font-bold">Mã xác thực đã được gửi tới {forgotPasswordEmail}</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã OTP (6 số)</label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="text" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 text-center text-xl font-black tracking-[10px] text-[#f97316]" placeholder="000000" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium" placeholder="••••••••" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setResetStep("EMAIL")} className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">Quay lại</button>
                    <button onClick={handleResetPassword} disabled={isLoading} className="flex-1 py-3.5 bg-[#f97316] text-white rounded-2xl font-black text-sm hover:bg-[#ea580c] transition-all flex items-center justify-center gap-2">
                      {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Xác nhận đổi"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <EmailExistsModal
          visible={showEmailExistsModal}
          onClose={() => setShowEmailExistsModal(false)}
          onGoLogin={() => {
            setIsSignUp(false);
            setIsStaffPortal(false);
            setShowEmailExistsModal(false);
          }}
        />

        <RegisterSuccessModal
          visible={showRegisterSuccessModal}
          onClose={() => setShowRegisterSuccessModal(false)}
        />

        <style>{`
          @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
          .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.4,0,0.2,1); }
          @keyframes scaleIn { 0% { transform: scale(0.96); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .animate-scaleIn { animation: scaleIn 0.25s cubic-bezier(0.4,0,0.2,1); }
        `}</style>
      </div>
    </>
  );
};

export default AuthPage;
