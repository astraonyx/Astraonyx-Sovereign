<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AtomicHabit;

class AtomicController
{
    public function getHabits()
    {
        $habits = AtomicHabit::where('archived', false)->get();
        return response()->json([
            'success' => true,
            'habits' => $habits
        ]);
    }

    public function createHabit(Request $request)
    {
        $title = $request->input('title');
        if (!$title) {
            return response()->json(['success' => false, 'error' => 'Judul kebiasaan wajib diisi'], 400);
        }

        $habit = AtomicHabit::create([
            'id' => 'hbt_' . time(),
            'user_id' => 'default_user',
            'title' => $title,
            'category' => $request->input('category', 'Kesehatan'),
            'frequency' => $request->input('frequency', 'daily'),
            'target_days' => $request->input('targetDays', 21),
            'streak' => 0,
            'archived' => false,
            'created_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'habit' => $habit
        ]);
    }

    public function checkinHabit($id)
    {
        $habit = AtomicHabit::find($id);
        if (!$habit) {
            return response()->json(['success' => false, 'error' => 'Kebiasaan tidak ditemukan'], 404);
        }

        $habit->streak += 1;
        $habit->last_completed_at = now();
        $habit->save();

        return response()->json([
            'success' => true,
            'streak' => $habit->streak,
            'message' => 'Check-in berhasil tercatat di PostgreSQL!'
        ]);
    }
}
