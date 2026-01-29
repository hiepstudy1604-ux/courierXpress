<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('goods_evidence_media', function (Blueprint $table) {
            $table->id('media_id');
            $table->unsignedBigInteger('shipment_id');
            $table->unsignedBigInteger('inspection_id')->nullable();
            $table->unsignedBigInteger('assignment_id')->nullable();
            $table->unsignedBigInteger('driver_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('media_type', 30);
            $table->string('media_url', 500);
            $table->dateTime('captured_at');
            $table->string('file_hash', 64)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->foreign('inspection_id')
                ->references('inspection_id')
                ->on('goods_inspection')
                ->onDelete('set null');
            
            $table->foreign('assignment_id')
                ->references('assignment_id')
                ->on('driver_assignment')
                ->onDelete('set null');
            
            $table->foreign('driver_id')
                ->references('driver_id')
                ->on('driver')
                ->onDelete('set null');
            
            $table->foreign('branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('set null');
            
            $table->index('shipment_id');
            $table->index('inspection_id');
            $table->index('assignment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goods_evidence_media');
    }
};
