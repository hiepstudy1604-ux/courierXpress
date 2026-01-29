<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bills', function (Blueprint $table) {
            $table->unsignedBigInteger('shipment_id')->nullable()->after('courier_id');
            
            $table->foreign('shipment_id')
                ->references('shipment_id')
                ->on('shipments')
                ->onDelete('cascade');
            
            $table->index('shipment_id');
        });
    }

    public function down(): void
    {
        Schema::table('bills', function (Blueprint $table) {
            $table->dropForeign(['shipment_id']);
            $table->dropIndex(['shipment_id']);
            $table->dropColumn('shipment_id');
        });
    }
};
