<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'nullable|in:ADMIN,AGENT,CUSTOMER',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role ?? 'CUSTOMER',
            'phone' => $request->phone,
            'address' => $request->address,
            'city' => $request->city,
            'status' => 'ACTIVE',
        ]);

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully',
            'data' => [
                'user' => [
                    'id' => (string) $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'branch' => $user->branch ? $user->branch->name : null,
                    'phone' => $user->phone,
                ],
                'token' => $token,
            ]
        ], 201);
    }

    /**
     * Login user
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $credentials = $request->only('email', 'password');

        if (!$token = JWTAuth::attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password'
            ], 401);
        }

        $user = Auth::user();
        if ($user->status !== 'ACTIVE') {
        auth()->logout(); // Quan trọng: Hủy ngay cái token vừa tạo ra
        return response()->json([
            'success' => false,
            'message' => 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin.',
        ], 403);
    }

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => [
                    'id' => (string) $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'branch' => $user->branch ? $user->branch->name : null,
                    'phone' => $user->phone,
                ],
                'token' => $token,
            ]
        ]);
    }

    /**
     * Get authenticated user
     */
    public function me()
    {
        $user = Auth::user();
        $user->load('branch');

        // Format customer ID if role is CUSTOMER
        $userId = $user->role === 'CUSTOMER' 
            ? 'KH-' . str_pad((string) $user->id, 4, '0', STR_PAD_LEFT)
            : (string) $user->id;

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $userId,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'branch' => $user->branch ? [
                    'id' => (string) $user->branch->id,
                    'name' => $user->branch->name,
                ] : null,
                'phone' => $user->phone,
                'address' => $user->address,
                'city' => $user->city,
                'status' => $user->status,
            ]
        ]);
    }

    /**
     * Logout user
     */
    public function logout()
    {
        JWTAuth::invalidate(JWTAuth::getToken());

        return response()->json([
            'success' => true,
            'message' => 'Logout successful'
        ]);
    }

    /**
     * Request password reset
     */
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // For security, return success even if email doesn't exist
            return response()->json([
                'success' => true,
                'message' => 'If the email exists, a password reset link has been sent.'
            ]);
        }

        // TODO: Generate reset token and send email
        // For now, just return success message
        // In production, you would:
        // 1. Generate a secure token
        // 2. Store it in password_reset_tokens table
        // 3. Send email with reset link
        // 4. Token expires after 1 hour

        return response()->json([
            'success' => true,
            'message' => 'If the email exists, a password reset link has been sent to your email.'
        ]);
    }

    /**
     * Reset password with token
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // TODO: Verify token from password_reset_tokens table
        // For now, this is a placeholder
        // In production, you would:
        // 1. Check if token exists and is valid
        // 2. Check if token hasn't expired
        // 3. Update user password
        // 4. Delete the token

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }

        // For now, just update password (in production, verify token first)
        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password has been reset successfully'
        ]);
    }
}
