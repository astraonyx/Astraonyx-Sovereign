<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\WaygroundQuiz;

class WaygroundController
{
    public function getQuizzes(Request $request)
    {
        $search = $request->input('search');
        $query = WaygroundQuiz::query();

        if ($search) {
            $query->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        $quizzes = $query->get();

        return response()->json([
            'success' => true,
            'count' => $quizzes->count(),
            'quizzes' => $quizzes
        ]);
    }

    public function getQuizDetail($id)
    {
        $quiz = WaygroundQuiz::find($id);
        if (!$quiz) {
            return response()->json(['success' => false, 'error' => 'Kuis tidak ditemukan'], 404);
        }

        return response()->json([
            'success' => true,
            'quiz' => $quiz
        ]);
    }
}
