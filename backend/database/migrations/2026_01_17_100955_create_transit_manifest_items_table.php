<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transit_manifest_item', function (Blueprint $table) {
            $table->id('manifest_item_id');
            $table->unsignedBigInteger('manifest_id');
            $table->unsignedBigInteger('shipment_id');
            $table->string('item_status', 30);
            $table->dateTime('added_at');
            $table->dateTime('removed_at')->nullable();
            $table->text('note')->nullable();
            
            $table->foreign('manifest_id')
                ->references('manifest_id')
                ->on('transit_manifest')
                ->onDelete('cascade');
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->index('manifest_id');
            $table->index('shipment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transit_manifest_item');
    }
};
