<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    protected $table = 'users';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'username',
        'password_hash',
        'display_name',
        'role',
        'require_2fa',
        'pin_hash',
        'is_banned',
        'linked_owner_number',
        'avatar_url',
        'bio',
        'created_at',
        'updated_at'
    ];

    protected $hidden = [
        'password_hash',
        'pin_hash'
    ];

    protected $casts = [
        'require_2fa' => 'boolean',
        'is_banned' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
