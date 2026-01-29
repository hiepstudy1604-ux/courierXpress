<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_task', function (Blueprint $table) {
            $table->id('task_id');
            $table->string('task_code', 50)->unique();
            $table->string('task_type', 50);
            $table->integer('priority')->default(100);
            $table->string('status', 30);
            $table->unsignedBigInteger('shipment_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('driver_id')->nullable();
            $table->unsignedBigInteger('manifest_id')->nullable();
            $table->unsignedBigInteger('return_order_id')->nullable();
            $table->string('related_table', 50)->nullable();
            $table->unsignedBigInteger('related_id')->nullable();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->dateTime('due_at')->nullable();
            $table->unsignedBigInteger('assigned_to')->nullable();
            $table->dateTime('assigned_at')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->string('resolution_code', 30)->nullable();
            $table->text('resolution_note')->nullable();
            $table->timestamps();
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('set null');
            
            $table->foreign('branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('set null');
            
            $table->foreign('driver_id')
                ->references('driver_id')
                ->on('driver')
                ->onDelete('set null');
            
            $table->foreign('manifest_id')
                ->references('manifest_id')
                ->on('transit_manifest')
                ->onDelete('set null');
            
            $table->foreign('return_order_id')
                ->references('return_order_id')
                ->on('return_order')
                ->onDelete('set null');
            
            $table->index('task_type');
            $table->index('status');
            $table->index('shipment_id');
            $table->index('branch_id');
            $table->index('driver_id');
            $table->index('assigned_to');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_task');
    }
};
