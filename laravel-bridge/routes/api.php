<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BotBridgeController;
use App\Http\Controllers\AtomicController;
use App\Http\Controllers\WaygroundController;

/*
|--------------------------------------------------------------------------
| API Routes — Astraonyx Polaris Laravel & Laragon Companion
|--------------------------------------------------------------------------
|
| Rute-rute ini menyediakan API RESTful untuk ekosistem Polaris di atas
| basis data PostgreSQL, terhubung langsung dengan engine WhatsApp Baileys.
|
*/

Route::prefix('v1')->group(function () {
    // Autentikasi Pengguna
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::get('/auth/users', [AuthController::class, 'listUsers']);

    // WhatsApp Bot Bridge (Komunikasi Dua Arah dengan Node.js Express Baileys)
    Route::get('/bot/status', [BotBridgeController::class, 'getStatus']);
    Route::post('/bot/webhook', [BotBridgeController::class, 'handleWebhook']);
    Route::post('/bot/send-message', [BotBridgeController::class, 'sendMessage']);

    // Atomic Pillar (Produktivitas & Kebiasaan)
    Route::get('/atomic/habits', [AtomicController::class, 'getHabits']);
    Route::post('/atomic/habits', [AtomicController::class, 'createHabit']);
    Route::post('/atomic/habits/{id}/checkin', [AtomicController::class, 'checkinHabit']);
    Route::get('/atomic/todos', [AtomicController::class, 'getTodos']);
    Route::post('/atomic/todos', [AtomicController::class, 'createTodo']);
    Route::get('/atomic/savings', [AtomicController::class, 'getSavings']);

    // Luminary Wayground (Modul Kuis & Pembelajaran)
    Route::get('/wayground/quizzes', [WaygroundController::class, 'getQuizzes']);
    Route::get('/wayground/quizzes/{id}', [WaygroundController::class, 'getQuizDetail']);
    Route::post('/wayground/play/submit', [WaygroundController::class, 'submitScore']);
});
