// server/sessionBus.js — Pemancar peristiwa sesi dalam satu proses.
// auth.js memancarkan; wsServer.js mendengarkan dan memutus soket yang sesinya sudah tidak sah.
//
//   'session-replaced'  { userId, sessionId }        login baru: soket dengan sessionId lain harus ditutup
//   'user-revoked'      { userId, reason, sessionId? }  reason: 'banned' | 'deleted' | 'logout'
//                                                      sessionId diisi untuk logout (hanya sesi itu yang ditutup)
const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(20);

module.exports = bus;
