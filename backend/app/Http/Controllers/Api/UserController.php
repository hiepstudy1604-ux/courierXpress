<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    /**
     * Get all users
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        // Only admin can view all users
        if ($user->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $query = User::with('branch');

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $users->map(function ($user) {
                return [
                    'id' => (string) $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'branch' => $user->branch ? $user->branch->name : null,
                    'phone' => $user->phone,
                ];
            }),
            'meta' => [
                'current_page' => $users->currentPage(),
                'total' => $users->total(),
                'per_page' => $users->perPage(),
            ]
        ]);
    }

    /**
     * Get user by ID
     */
    public function show($id)
    {
        $user = Auth::user();

        // Only admin can view other users
        if ($user->role !== 'ADMIN' && $user->id != $id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $targetUser = User::with('branch')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
                'role' => $targetUser->role,
                'branch' => $targetUser->branch ? $targetUser->branch->name : null,
                'phone' => $targetUser->phone,
            ]
        ]);
    }

    /**
     * Delete user
     */
    public function destroy($id)
    {
        $user = Auth::user();

        // Only admin can delete users
        if ($user->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $targetUser = User::findOrFail($id);
        $targetUser->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    }
}
