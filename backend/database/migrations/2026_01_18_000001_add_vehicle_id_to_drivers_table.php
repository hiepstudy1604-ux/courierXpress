<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add vehicle_id to drivers table and create driver_vehicle_assignment_history table
     * Option A: Alter existing table (preserve data)
     */
    public function up(): void
    {
        // Add vehicle_id column to driver table if not exists
        if (!Schema::hasColumn('driver', 'vehicle_id')) {
            Schema::table('driver', function (Blueprint $table) {
                $table->unsignedBigInteger('vehicle_id')->nullable()->after('branch_id');
                $table->foreign('vehicle_id')
                    ->references('vehicle_id')
                    ->on('vehicles')
                    ->onDelete('set null');
                $table->index('vehicle_id');
            });
        }

        // Create driver_vehicle_assignment_history table
        if (!Schema::hasTable('driver_vehicle_assignment_history')) {
            Schema::create('driver_vehicle_assignment_history', function (Blueprint $table) {
                $table->id('history_id');
                $table->unsignedBigInteger('driver_id');
                $table->unsignedBigInteger('vehicle_id')->nullable();
                $table->dateTime('assigned_at');
                $table->dateTime('unassigned_at')->nullable();
                $table->unsignedBigInteger('assigned_by')->nullable();
                $table->text('note')->nullable();
                $table->timestamps();
                
                $table->foreign('driver_id')
                    ->references('driver_id')
                    ->on('driver')
                    ->onDelete('cascade');
                
                $table->foreign('vehicle_id')
                    ->references('vehicle_id')
                    ->on('vehicles')
                    ->onDelete('set null');
                
                $table->foreign('assigned_by')
                    ->references('id')
                    ->on('users')
                    ->onDelete('set null');
                
                $table->index(['driver_id', 'assigned_at']);
                $table->index(['vehicle_id', 'unassigned_at']);
                $table->index('assigned_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_vehicle_assignment_history');
        
        if (Schema::hasColumn('driver', 'vehicle_id')) {
            Schema::table('driver', function (Blueprint $table) {
                $table->dropForeign(['vehicle_id']);
                $table->dropIndex(['vehicle_id']);
                $table->dropColumn('vehicle_id');
            });
        }
    }
};
