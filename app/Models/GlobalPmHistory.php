<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GlobalPmHistory extends Model
{
    public $timestamps = false;

    protected $table = 'global_pm_history';

    protected $fillable = [
        'global_pm_id',
        'done_date',
        'performed_by',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'done_date'  => 'date',
        'created_at' => 'datetime',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(GlobalPm::class);
    }
}
