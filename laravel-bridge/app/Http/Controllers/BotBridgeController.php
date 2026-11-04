<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BotBridgeController
{
    protected string $nodeUrl;

    public function __construct()
    {
        $this->nodeUrl = env('POLARIS_NODE_URL', 'http://localhost:3000');
    }

    /**
     * Mengambil status real-time WhatsApp Bot Baileys dari service Node.js
     */
    public function getStatus()
    {
        try {
            $response = Http::timeout(3)->get("{$this->nodeUrl}/api/bot/status");
            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'status' => 'DISCONNECTED',
                'error' => 'Node.js Baileys bot bridge tidak dapat dihubungi: ' . $e->getMessage()
            ], 503);
        }
    }

    /**
     * Menerima Webhook pesan dari WhatsApp Baileys bot ke database PostgreSQL
     */
    public function handleWebhook(Request $request)
    {
        $payload = $request->all();
        Log::info('[Polaris Bot Webhook Received]', $payload);

        return response()->json([
            'success' => true,
            'message' => 'Pesan berhasil diterima oleh Laravel PostgreSQL Bridge'
        ]);
    }

    /**
     * Mengirim pesan WhatsApp keluar melalui Baileys Node.js socket
     */
    public function sendMessage(Request $request)
    {
        $target = $request->input('target');
        $message = $request->input('message');

        if (!$target || !$message) {
            return response()->json([
                'success' => false,
                'error' => 'Nomor tujuan (target) dan pesan (message) wajib disertakan.'
            ], 400);
        }

        try {
            $response = Http::post("{$this->nodeUrl}/api/bot/send", [
                'target' => $target,
                'message' => $message,
            ]);
            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Gagal meneruskan pesan ke engine Baileys: ' . $e->getMessage()
            ], 500);
        }
    }
}
