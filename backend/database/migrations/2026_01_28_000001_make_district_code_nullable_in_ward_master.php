<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ward_master', function (Blueprint $table) {
            $table->dropForeign(['district_code']);
        });

        Schema::table('ward_master', function (Blueprint $table) {
            $table->string('district_code', 10)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('ward_master', function (Blueprint $table) {
            $table->string('district_code', 10)->nullable(false)->change();
        });

        Schema::table('ward_master', function (Blueprint $table) {
            $table->foreign('district_code')
                ->references('district_code')
                ->on('district_master')
                ->onDelete('cascade');
        });
    }
};
