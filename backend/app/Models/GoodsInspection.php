<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GoodsInspection extends Model
{
    protected $primaryKey = 'inspection_id';
    public $incrementing = true;
    protected $keyType = 'int';
    public $timestamps = false; // Table only has created_at, not updated_at

    protected $table = 'goods_inspection';

    protected $fillable = [
        'shipment_id',
        'assignment_id',
        'driver_id',
        'branch_id',
        'inspected_at',
        'actual_weight_kg',
        'actual_length_cm',
        'actual_width_cm',
        'actual_height_cm',
        'actual_volume_m3',
        'packaging_condition',
        'special_handling_flags',
        'note',
    ];

    protected $casts = [
        'inspected_at' => 'datetime',
        'actual_weight_kg' => 'decimal:2',
        'actual_length_cm' => 'decimal:2',
        'actual_width_cm' => 'decimal:2',
        'actual_height_cm' => 'decimal:2',
        'actual_volume_m3' => 'decimal:3',
        'created_at' => 'datetime',
    ];

    /**
     * Get the shipment that this inspection belongs to
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the assignment that this inspection belongs to
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(DriverAssignment::class, 'assignment_id', 'assignment_id');
    }

    /**
     * Get the driver who performed the inspection
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'driver_id', 'driver_id');
    }

    /**
     * Get the branch associated with this inspection
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    /**
     * Get the evidence media for this inspection
     */
    public function evidenceMedia(): HasMany
    {
        return $this->hasMany(GoodsEvidenceMedia::class, 'inspection_id', 'inspection_id');
    }
}
