<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoodsEvidenceMedia extends Model
{
    protected $primaryKey = 'media_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $table = 'goods_evidence_media';

    protected $fillable = [
        'shipment_id',
        'inspection_id',
        'assignment_id',
        'driver_id',
        'branch_id',
        'media_type',
        'media_url',
        'captured_at',
        'file_hash',
        'note',
    ];

    protected $casts = [
        'captured_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    /**
     * Get the shipment that this media belongs to
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'shipment_id', 'shipment_id');
    }

    /**
     * Get the inspection that this media belongs to
     */
    public function inspection(): BelongsTo
    {
        return $this->belongsTo(GoodsInspection::class, 'inspection_id', 'inspection_id');
    }

    /**
     * Get the assignment that this media belongs to
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(DriverAssignment::class, 'assignment_id', 'assignment_id');
    }

    /**
     * Get the driver who captured this media
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'driver_id', 'driver_id');
    }

    /**
     * Get the branch associated with this media
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }
}
