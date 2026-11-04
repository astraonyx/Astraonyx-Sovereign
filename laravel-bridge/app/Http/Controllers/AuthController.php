<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;

class AuthController
{
    public function listUsers()
    {
        $users = User::select('id', 'username', 'role', 'is_banned', 'linked_owner_number', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'count' => $users->count(),
            'users' => $users
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'user' => [
                'username' => 'cosmos_test',
                'role' => 'cosmos',
                'tier' => 'Supreme Commander'
            ]
        ]);
    }
}
