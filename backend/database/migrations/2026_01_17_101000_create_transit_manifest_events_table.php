<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transit_manifest_event', function (Blueprint $table) {
            $table->id('event_id');
            $table->unsignedBigInteger('manifest_id');
            $table->string('event_type', 50);
            $table->dateTime('event_at');
            $table->string('actor_type', 20)->nullable();
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('old_status', 30)->nullable();
            $table->string('new_status', 30)->nullable();
            $table->text('message')->nullable();
            
            $table->foreign('manifest_id')
                ->references('manifest_id')
                ->on('transit_manifest')
                ->onDelete('cascade');
            
            $table->index('manifest_id');
            $table->index('event_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transit_manifest_event');
    }
};
