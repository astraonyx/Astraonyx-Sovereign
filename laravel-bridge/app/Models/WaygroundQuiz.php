<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WaygroundQuiz extends Model
{
    protected $table = 'wayground_quizzes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'title',
        'description',
        'category',
        'topic',
        'icon',
        'time_limit',
        'difficulty',
        'questions_json',
        'play_count',
        'author',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'questions_json' => 'array',
        'play_count' => 'integer',
        'time_limit' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
}
