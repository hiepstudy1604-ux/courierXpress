<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminTaskEvent extends Model
{
    protected $table = 'admin_task_event';
    protected $primaryKey = 'task_event_id';
    
    public $timestamps = false;
    
    protected $fillable = [
        'task_id',
        'event_type',
        'event_at',
        'actor_type',
        'actor_id',
        'old_status',
        'new_status',
        'message',
    ];
    
    protected $casts = [
        'event_at' => 'datetime',
    ];
    
    public function task(): BelongsTo
    {
        return $this->belongsTo(AdminTask::class, 'task_id', 'task_id');
    }
}
