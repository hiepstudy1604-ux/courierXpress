<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transit_manifest', function (Blueprint $table) {
            $table->id('manifest_id');
            $table->string('manifest_code', 50)->unique();
            $table->unsignedBigInteger('vehicle_id');
            $table->unsignedBigInteger('driver_id');
            $table->unsignedBigInteger('origin_branch_id');
            $table->string('origin_warehouse_role', 20)->nullable();
            $table->unsignedBigInteger('dest_branch_id');
            $table->string('dest_warehouse_role', 20)->nullable();
            $table->string('route_scope', 30);
            $table->string('service_type', 30)->nullable();
            $table->string('status', 30);
            $table->string('created_by_type', 20)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('loaded_at')->nullable();
            $table->dateTime('departed_at')->nullable();
            $table->dateTime('arrived_at')->nullable();
            $table->dateTime('closed_at')->nullable();
            $table->text('note')->nullable();
            
            $table->foreign('vehicle_id')
                ->references('vehicle_id')
                ->on('vehicles')
                ->onDelete('cascade');
            
            $table->foreign('driver_id')
                ->references('driver_id')
                ->on('driver')
                ->onDelete('cascade');
            
            $table->foreign('origin_branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('cascade');
            
            $table->foreign('dest_branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('cascade');
            
            $table->index('vehicle_id');
            $table->index('driver_id');
            $table->index('origin_branch_id');
            $table->index('dest_branch_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transit_manifest');
    }
};
