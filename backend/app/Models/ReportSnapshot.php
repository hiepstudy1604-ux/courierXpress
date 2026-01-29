<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportSnapshot extends Model
{
    protected $primaryKey = 'report_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $table = 'report_snapshots';

    protected $fillable = [
        'role_scope',
        'branch_id',
        'created_by',
        'date_start',
        'date_end',
        'aggregated_metrics',
        'chart_data',
        'export_format',
        'file_path',
        'generated_at',
    ];

    protected $casts = [
        'date_start' => 'date',
        'date_end' => 'date',
        'aggregated_metrics' => 'array',
        'chart_data' => 'array',
        'generated_at' => 'datetime',
    ];

    /**
     * Get the branch that this report belongs to (for agent scope)
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    /**
     * Get the user who created this report
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }
}
