<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_snapshots', function (Blueprint $table) {
            $table->id('report_id');
            $table->string('role_scope', 20);
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->date('date_start');
            $table->date('date_end');
            $table->json('aggregated_metrics')->nullable();
            $table->json('chart_data')->nullable();
            $table->string('export_format', 10)->nullable();
            $table->string('file_path', 500)->nullable();
            $table->dateTime('generated_at');
            $table->timestamps();
            
            $table->foreign('branch_id')
                ->references('id')
                ->on('branches')
                ->onDelete('set null');
            
            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
            
            $table->index('branch_id');
            $table->index('created_by');
            $table->index(['date_start', 'date_end']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_snapshots');
    }
};
