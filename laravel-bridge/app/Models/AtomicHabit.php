<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AtomicHabit extends Model
{
    protected $table = 'atomic_habits';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'title',
        'category',
        'frequency',
        'target_days',
        'streak',
        'last_completed_at',
        'archived',
        'created_at'
    ];

    public $timestamps = false;

    protected $casts = [
        'streak' => 'integer',
        'archived' => 'boolean',
        'last_completed_at' => 'datetime',
        'created_at' => 'datetime'
    ];
}
