<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Mail\CourierXpressMail;
use App\Mail\WelcomeMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Auth, Hash, Cache, Mail, Log, Validator};
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    /**
     * 1. Kiểm tra tính hợp lệ của Email và Domain (DNS + Disposable)
     */
    public function checkEmail(Request $request)
    {
        $request->validate(['email' => 'required|email:rfc,dns|max:255']);

        $email = strtolower(trim((string) $request->email));
        $domain = substr(strrchr($email, "@") ?: '', 1);

        if (!$domain) {
            return response()->json(['success' => true, 'data' => ['is_real' => false, 'reason' => 'invalid_domain']]);
        }

        // Chuyển đổi IDN (tên miền tiếng Việt) sang ASCII
        if (function_exists('idn_to_ascii')) {
            $domain = idn_to_ascii($domain, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46) ?: $domain;
        }

        // Danh sách Domain rác
        $disposable = [
            'mailinator.com',
            'guerrillamail.com',
            'guerrillamail.net',
            'guerrillamail.org',
            '10minutemail.com',
            '10minutemail.net',
            'tempmail.com',
            'temp-mail.org',
            'yopmail.com',
            'yopmail.fr',
            'yopmail.net',
            'trashmail.com',
            'getnada.com'
        ];

        if (in_array($domain, $disposable, true)) {
            return response()->json([
                'success' => true,
                'data' => ['is_real' => false, 'reason' => 'disposable_domain', 'domain' => $domain]
            ]);
        }

        // Kiểm tra DNS (MX và A record) - Cache 1 giờ
        $isReal = Cache::remember("dns_check_{$domain}", 3600, function () use ($domain) {
            $hasMx = @checkdnsrr($domain, 'MX');
            $hasA = @checkdnsrr($domain, 'A') || @checkdnsrr($domain, 'AAAA');
            return $hasMx || $hasA;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'is_real' => $isReal,
                'reason' => $isReal ? null : 'domain_not_receiving_mail',
                'domain' => $domain
            ]
        ]);
    }

    /**
     * 2. Đăng ký tài khoản
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|string',
        ]);

        $user = \App\Models\User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'role' => $validated['role'],
        ]);

        $mailData = [
            'title' => 'Đăng ký tài khoản thành công',
            'name' => $user->name,
            'content' => "Bạn đã đăng ký tài khoản thành công trên CourierXpress.\nCảm ơn bạn đã sử dụng dịch vụ!",
        ];
        \Mail::to($user->email)->send(new WelcomeMail($mailData));

        return response()->json([
            'success' => true,
            'message' => 'Đăng ký thành công',
            'data' => ['user' => $user],
        ]);
    }

    /**
     * 3. Đăng nhập
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (!$token = auth('api')->attempt($credentials)) {
            return response()->json(['success' => false, 'message' => 'Email hoặc mật khẩu không chính xác.'], 401);
        }

        $user = auth('api')->user();

        if ($user->status !== 'ACTIVE') {
            auth('api')->logout();
            return response()->json(['success' => false, 'message' => 'Tài khoản của bạn đang bị khóa.'], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data'    => [
                'user'  => $this->formatUserResponse($user),
                'token' => $token,
            ]
        ]);
    }

    /**
     * 4. Quên mật khẩu & Reset
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email|exists:users,email']);
        $user = User::where('email', $request->email)->first();

        $otp = (string) random_int(100000, 999999);
        Cache::put('password_otp_' . $user->email, $otp, now()->addMinutes(5));

        try {
            Mail::to($user->email)->send(new CourierXpressMail([
                'subject' => 'Reset Password OTP - CourierXpress',
                'title'   => 'Yêu cầu đặt lại mật khẩu',
                'name'    => $user->name,
                'content' => "Mã OTP của bạn là: **{$otp}**. Mã có hiệu lực trong 5 phút.",
                'action_url' => config('app.frontend_url') . "/reset-password?email=" . urlencode($user->email),
                'action_text' => 'Đặt lại mật khẩu'
            ]));
            return response()->json(['success' => true, 'message' => 'Mã OTP đã được gửi về email.']);
        } catch (\Exception $e) {
            Log::error("Mail Error: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Lỗi gửi mail.'], 500);
        }
    }

    public function resetPassword(Request $request)
    {
        // BƯỚC 1: Validate dữ liệu đầu vào
        $request->validate([
            'email'    => 'required|email|exists:users,email',
            'otp'      => 'required|string|size:6',
            'password' => 'required|string|min:8|confirmed', // confirmed yêu cầu có thêm password_confirmation
        ]);

        // BƯỚC 2: Kiểm tra mã OTP trong Cache
        if (Cache::get('password_otp_' . $request->email) !== $request->otp) {
            return response()->json(['success' => false, 'message' => 'Mã OTP không chính xác hoặc đã hết hạn.'], 400);
        }

        // BƯỚC 3: Lấy thông tin User hiện tại
        $user = User::where('email', $request->email)->first();

        // BƯỚC 4: Kiểm tra mật khẩu mới có trùng với mật khẩu cũ không
        // Hash::check sẽ so sánh mật khẩu chưa mã hóa từ request với mật khẩu đã mã hóa trong DB
        if (Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu mới không được trùng với mật khẩu cũ. Vui lòng nhập mật khẩu khác.'
            ], 400);
        }

        // BƯỚC 5: Cập nhật mật khẩu mới (phải Hash trước khi lưu)
        $user->update(['password' => Hash::make($request->password)]);

        // BƯỚC 6: Xóa OTP trong Cache sau khi đổi thành công để bảo mật
        Cache::forget('password_otp_' . $request->email);

        return response()->json([
            'success' => true,
            'message' => 'Mật khẩu đã được thay đổi thành công.'
        ]);
    }

    /**
     * 5. Xác thực OTP Email cho đăng ký mới
     */
    public function requestEmailOtp(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $code = (string) random_int(100000, 999999);

        Cache::put('email_otp_' . $request->email, $code, now()->addMinutes(5));

        try {
            Mail::raw("Mã xác thực CourierXpress của bạn là: {$code}", function ($m) use ($request) {
                $m->to($request->email)->subject('Verification OTP');
            });
            return response()->json(['success' => true, 'message' => 'Mã OTP đã được gửi.']);
        } catch (\Throwable $e) {
            Log::error('Send OTP failed: ' . $e->getMessage());
            if (config('app.env') === 'local') {
                return response()->json(['success' => true, 'debug_otp' => $code, 'message' => 'Local mode: Mail không gửi nhưng OTP đã tạo.']);
            }
            return response()->json(['success' => false, 'message' => 'Lỗi hệ thống không thể gửi mail.'], 500);
        }
    }

    public function verifyEmailOtp(Request $request)
    {
        $request->validate(['email' => 'required|email', 'code' => 'required|digits:6']);

        if (Cache::get('email_otp_' . $request->email) !== $request->code) {
            return response()->json(['success' => false, 'message' => 'Mã OTP không chính xác.'], 422);
        }

        Cache::forget('email_otp_' . $request->email);
        Cache::put('email_verified_' . $request->email, true, now()->addMinutes(15));

        return response()->json(['success' => true, 'message' => 'Xác thực email thành công.']);
    }

    public function me()
    {
        $user = auth('api')->user();
        if (!$user) return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        return response()->json(['success' => true, 'data' => $this->formatUserResponse($user)]);
    }

    public function logout()
    {
        auth('api')->logout();
        return response()->json(['success' => true, 'message' => 'Logout successful']);
    }

    private function formatUserResponse(User $user)
    {
        if (!$user->relationLoaded('branch')) {
            $user->load('branch');
        }

        return [
            'id'      => $user->role === 'CUSTOMER' ? 'KH-' . str_pad((string)$user->id, 4, '0', STR_PAD_LEFT) : (string)$user->id,
            'name'    => $user->name,
            'email'   => $user->email,
            'role'    => $user->role,
            'phone'   => $user->phone,
            'branch'  => $user->branch ? $user->branch->name : null,
            'status'  => $user->status,
            'city'    => $user->city ?? null,
            'address' => $user->address ?? null,
        ];
    }
}
