<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CourierController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProvinceController;
use App\Http\Controllers\Api\DistrictController;
use App\Http\Controllers\Api\WardController;
use App\Http\Controllers\Api\Admin\AgentController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

// Province routes (public for address selection)
Route::get('/provinces', [ProvinceController::class, 'index']);
Route::get('/provinces/grouped', [ProvinceController::class, 'groupedByRegion']);
Route::get('/provinces/{code}', [ProvinceController::class, 'show']);

// District routes (public for address selection)
Route::get('/districts', [DistrictController::class, 'index']);
Route::get('/districts/{code}', [DistrictController::class, 'show']);

// Ward routes (public for address selection)
Route::get('/wards', [WardController::class, 'index']);
Route::get('/wards/{code}', [WardController::class, 'show']);

// Protected routes
Route::middleware('auth:api')->group(function () {
    // Auth routes
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Courier routes
    Route::get('/courier', [CourierController::class, 'index']);
    Route::post('/courier/quote', [CourierController::class, 'quote']);
    Route::post('/courier', [CourierController::class, 'store']);
    Route::get('/courier/{id}', [CourierController::class, 'show']);
    Route::put('/courier/{id}', [CourierController::class, 'update']);
    Route::delete('/courier/{id}', [CourierController::class, 'destroy']);
    Route::get('/courier/track/{trackingId}', [CourierController::class, 'track']);
    Route::post('/courier/{orderId}/confirm', [CourierController::class, 'confirmOrder']);
    Route::get('/courier/{orderId}/suitable-vehicles', [CourierController::class, 'getSuitableVehicles']);
    Route::post('/courier/{orderId}/assign-vehicle', [CourierController::class, 'assignVehicle']);
    Route::post('/courier/{orderId}/find-branch', [CourierController::class, 'findSuitableBranch']);

    // Shipment routes (for CourierManagement - new workflow)
    Route::get('/shipments', [ShipmentController::class, 'index']);
    Route::get('/shipments/{id}', [ShipmentController::class, 'show']);

    // User routes
    Route::get('/user', [UserController::class, 'index']);
    Route::get('/user/{id}', [UserController::class, 'show']);
    Route::delete('/user/{id}', [UserController::class, 'destroy']);

    // Billing routes
    Route::get('/billing', [BillingController::class, 'index']);
    Route::get('/billing/{id}', [BillingController::class, 'show']);

    // Customer routes
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::get('/customers/{id}', [CustomerController::class, 'show']);
    Route::put('/customers/{id}', [CustomerController::class, 'update']);

    // Branch routes
    Route::get('/branches', [BranchController::class, 'index']);
    Route::get('/branches/{id}', [BranchController::class, 'show']);
    Route::put('/branches/{id}', [BranchController::class, 'update']);

    // Vehicle routes
    Route::get('/vehicles', [VehicleController::class, 'index']);
    Route::get('/vehicles/{id}', [VehicleController::class, 'show']);

    // Shipment routes (removed - logic moved to CourierController)
    Route::patch('/shipments/{id}', [ShipmentController::class, 'updateStatus']);

    // Dashboard routes
    Route::get('/dashboard/stats', [DashboardController::class, 'index']);

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // Admin routes
    Route::prefix('admin')->group(function () {
        Route::post('/agents', [AgentController::class, 'store']);
        Route::get('/agents/check/{agentCode}', [AgentController::class, 'checkAvailability']);
        Route::get('/branches/{id}', [BranchController::class, 'show']);
        
    });

    // Report routes
    Route::get('/reports', [ReportController::class, 'index']);
    Route::post('/reports/export', [ReportController::class, 'export']);
    Route::get('/reports/{id}/download', [ReportController::class, 'download']);

    // Shipment routes
    Route::post('/shipments/{id}/assign-branch', [ShipmentController::class, 'assignBranch']);
    Route::post('/shipments/auto-assign-branches', [ShipmentController::class, 'autoAssignBranches']);
});
