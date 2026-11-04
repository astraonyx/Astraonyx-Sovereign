// dashboard/js/ws.js — WebSocket Realtime Client Polaris
(function () {
  'use strict';

  let socket = null;
  let reconnectTimer = null;
  const terminalBody = document.getElementById('terminal-body');

  function getWsUrl() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/ws`;
  }

  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      socket = new WebSocket(getWsUrl());
    } catch (err) {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch (err) {
        console.error('[ws client] Error parsing message:', err);
      }
    };

    socket.onclose = () => {
      scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 3000);
  }

  function handleWsMessage(msg) {
    const { type, data } = msg;

    switch (type) {
      case 'STATUS':
        // Hanya update jika user sedang melihat primary bot (misal admin)
        if (!window.selectedClusterBotId || window.selectedClusterBotId === 'primary') {
          updateStatusUI(data);
        }
        break;

      case 'LOG':
        if (!window.selectedClusterBotId || window.selectedClusterBotId === 'primary') {
          appendTerminalLine(data);
        }
        break;

      case 'LOG_HISTORY':
        if (terminalBody && Array.isArray(data)) {
          if (!window.selectedClusterBotId || window.selectedClusterBotId === 'primary') {
            terminalBody.innerHTML = '';
            data.forEach(appendTerminalLine);
          }
        }
        break;

      case 'QR':
        if (data && data.qrDataUrl) {
          if (!window.selectedClusterBotId || window.selectedClusterBotId === 'primary') {
            updateQrUI(data.qrDataUrl);
          }
        }
        break;

      case 'PAIRING_CODE':
        if (data && data.code) {
          if (!window.selectedClusterBotId || window.selectedClusterBotId === 'primary') {
            showPairingCodeUI(data.code);
          }
        }
        break;

      case 'LOGS_CLEARED':
        if (!window.selectedClusterBotId || window.selectedClusterBotId === 'primary') {
          if (terminalBody) terminalBody.innerHTML = '';
        }
        break;

      case 'VIRTEX_ATTACK_BLOCKED':
        window.dispatchEvent(new CustomEvent('polaris:virtex-blocked', { detail: data }));
        break;

      case 'CLUSTER_QR':
        if (data && data.instanceId && data.qrDataUrl) {
          if (typeof window.onClusterQrUpdate === 'function') {
            window.onClusterQrUpdate(data.instanceId, data.qrDataUrl);
          }
          if (window.selectedClusterBotId && window.selectedClusterBotId === data.instanceId) {
            updateQrUI(data.qrDataUrl);
          }
        }
        break;

      case 'CLUSTER_PAIRING_CODE':
        if (data && data.instanceId && data.code) {
          if (typeof window.onClusterPairingCodeUpdate === 'function') {
            window.onClusterPairingCodeUpdate(data.instanceId, data.code);
          }
          if (window.selectedClusterBotId && window.selectedClusterBotId === data.instanceId) {
            showPairingCodeUI(data.code);
          }
        }
        break;

      case 'CLUSTER_STATUS':
        if (data && data.instanceId) {
          if (typeof window.onClusterStatusUpdate === 'function') {
            window.onClusterStatusUpdate(data);
          }
          if (window.selectedClusterBotId && window.selectedClusterBotId === data.instanceId) {
            updateStatusUI(data);
          }
        }
        break;

      case 'CLUSTER_LOG':
        if (data && data.instanceId && data.line) {
          if (typeof window.onClusterLogUpdate === 'function') {
            window.onClusterLogUpdate(data.instanceId, data.line);
          }
          if (window.selectedClusterBotId && window.selectedClusterBotId === data.instanceId) {
            appendTerminalLine(data.line);
          }
        }
        break;

      case 'CLUSTER_LOGS_CLEARED':
        if (data && data.instanceId && window.selectedClusterBotId === data.instanceId) {
          if (terminalBody) terminalBody.innerHTML = '';
        }
        break;

      case 'SOCIAL_DM_NEW':
        window.dispatchEvent(new CustomEvent('polaris:social-dm-new', { detail: data }));
        break;
    }
  }

  function updateStatusUI(statusData) {
    const rawStatus = (statusData.botStatus || statusData.status || 'OFFLINE').toUpperCase();
    let status = 'OFFLINE';
    if (rawStatus === 'CONNECTED' || rawStatus === 'ONLINE') status = 'CONNECTED';
    else if (rawStatus === 'STARTING' || rawStatus === 'CONNECTING') status = 'STARTING';
    else if (rawStatus === 'QR_READY' || rawStatus === 'WAITING_QR') status = 'QR_READY';
    else if (rawStatus === 'PAIRING' || rawStatus === 'PAIRING_MODE') status = 'PAIRING';
    else status = 'OFFLINE';

    const beaconDot = document.getElementById('beacon-dot');
    const beaconLabel = document.getElementById('beacon-label');
    const heroStatus = document.getElementById('hero-bot-status');
    const heroStatusText = document.getElementById('hero-status-text');

    if (beaconDot && beaconLabel) {
      beaconDot.className = 'beacon-dot';
      if (status === 'CONNECTED') {
        beaconDot.classList.add('online');
        beaconLabel.textContent = 'Online';
      } else if (status === 'STARTING') {
        beaconDot.classList.add('starting');
        beaconLabel.textContent = 'Memulai';
      } else if (status === 'QR_READY') {
        beaconDot.classList.add('qr-ready');
        beaconLabel.textContent = 'QR siap';
      } else if (status === 'PAIRING') {
        beaconDot.classList.add('starting');
        beaconLabel.textContent = 'Pairing';
      } else {
        beaconDot.classList.add('offline');
        beaconLabel.textContent = 'Offline';
      }
    }

    if (heroStatus && heroStatusText) {
      heroStatusText.textContent = status;
      heroStatus.className = `badge badge-${status === 'CONNECTED' ? 'emerald' : status === 'OFFLINE' ? 'rose' : 'cyan'}`;
    }

    // Update tombol start/stop legacy
    const startBtn = document.getElementById('btn-start-bot');
    const stopBtn = document.getElementById('btn-stop-bot');
    if (startBtn && stopBtn) {
      if (status === 'CONNECTED' || status === 'STARTING' || status === 'QR_READY' || status === 'PAIRING') {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
      } else {
        startBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
      }
    }

    // Update Cluster Focus Card untuk Bot Terpilih
    const clusterStatusBadge = document.getElementById('cluster-focus-status-badge');
    const clusterLaunchBtn = document.getElementById('btn-cluster-focus-launch');
    const clusterStopBtn = document.getElementById('btn-cluster-focus-stop');
    const clusterPlaceholder = document.getElementById('cluster-qr-placeholder');
    const clusterQrContainer = document.getElementById('cluster-qr-container');
    const clusterPairing = document.getElementById('cluster-pairing-code-display');
    const clusterOnline = document.getElementById('cluster-online-display');

    if (status === 'CONNECTED') {
      if (clusterStatusBadge) {
        clusterStatusBadge.className = 'badge badge-emerald';
        clusterStatusBadge.innerHTML = '<span class="badge-dot" style="background:#10b981;"></span> ONLINE (CONNECTED)';
      }
      if (clusterLaunchBtn && clusterStopBtn) {
        clusterLaunchBtn.style.display = 'none';
        clusterStopBtn.style.display = 'inline-flex';
      }
      if (clusterPlaceholder) clusterPlaceholder.style.display = 'none';
      if (clusterQrContainer) clusterQrContainer.style.display = 'none';
      if (clusterPairing) clusterPairing.style.display = 'none';
      if (clusterOnline) clusterOnline.style.display = 'block';
    } else if (status === 'QR_READY') {
      if (clusterStatusBadge) {
        clusterStatusBadge.className = 'badge badge-rose';
        clusterStatusBadge.innerHTML = '<span class="badge-dot" style="background:#f43f5e;"></span> WAITING QR';
      }
      if (clusterLaunchBtn && clusterStopBtn) {
        clusterLaunchBtn.style.display = 'none';
        clusterStopBtn.style.display = 'inline-flex';
      }
      if (statusData.lastQrDataUrl) {
        updateQrUI(statusData.lastQrDataUrl);
      }
    } else if (status === 'PAIRING') {
      if (clusterStatusBadge) {
        clusterStatusBadge.className = 'badge badge-cyan';
        clusterStatusBadge.innerHTML = '<span class="badge-dot" style="background:#38bdf8;"></span> PAIRING MODE';
      }
      if (clusterLaunchBtn && clusterStopBtn) {
        clusterLaunchBtn.style.display = 'none';
        clusterStopBtn.style.display = 'inline-flex';
      }
      if (statusData.pairingCode) {
        showPairingCodeUI(statusData.pairingCode);
      }
    } else if (status === 'STARTING') {
      if (clusterStatusBadge) {
        clusterStatusBadge.className = 'badge badge-purple';
        clusterStatusBadge.innerHTML = '<span class="badge-dot" style="background:#a855f7;"></span> CONNECTING...';
      }
      if (clusterLaunchBtn && clusterStopBtn) {
        clusterLaunchBtn.style.display = 'none';
        clusterStopBtn.style.display = 'inline-flex';
      }
    } else if (status === 'OFFLINE') {
      if (clusterStatusBadge) {
        clusterStatusBadge.className = 'badge badge-rose';
        clusterStatusBadge.innerHTML = '<span class="badge-dot" style="background:#f43f5e;"></span> OFFLINE';
      }
      if (clusterLaunchBtn && clusterStopBtn) {
        clusterLaunchBtn.style.display = 'inline-flex';
        clusterStopBtn.style.display = 'none';
      }
      if (clusterQrContainer) clusterQrContainer.style.display = 'none';
      if (clusterPairing) clusterPairing.style.display = 'none';
      if (clusterOnline) clusterOnline.style.display = 'none';
      if (clusterPlaceholder) {
        clusterPlaceholder.style.display = 'flex';
        const radarTitle = document.getElementById('cluster-radar-title');
        const radarSub = document.getElementById('cluster-radar-subtitle');
        if (radarTitle) radarTitle.textContent = 'Standby / Siap Digunakan';
        if (radarSub) radarSub.textContent = 'Klik "Launch Bot" untuk scan QR';
      }
    }

    if (typeof window.onClusterStatusUpdate === 'function' && (!statusData.instanceId || statusData.instanceId === 'primary')) {
      window.onClusterStatusUpdate({ instanceId: 'primary', botStatus: status, ...statusData });
    }

    if (status === 'CONNECTED' || status === 'QR_READY' || status === 'OFFLINE' || status === 'PAIRING') {
      if (typeof window.hideBlackholeLoader === 'function') {
        window.hideBlackholeLoader();
      }
    }
  }

  function appendTerminalLine(line) {
    if (!terminalBody) return;
    const div = document.createElement('div');
    div.className = 'terminal-line';

    // Highlight text berdasarkan tipe
    if (line.includes('❌') || line.includes('STDERR') || line.includes('Error')) {
      div.style.color = '#f87171';
    } else if (line.includes('✅') || line.includes('CONNECTED')) {
      div.style.color = '#34d399';
    } else if (line.includes('🚀') || line.includes('Polaris')) {
      div.style.color = '#38bdf8';
    } else if (line.includes('🔑') || line.includes('PAIRING_CODE')) {
      div.style.color = '#fbbf24';
      div.style.fontWeight = 'bold';
    }

    div.textContent = line;
    terminalBody.appendChild(div);

    // Auto-scroll jika mendekati bawah
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }

  function updateQrUI(dataUrl) {
    // 1. Elemen legacy
    const qrContainer = document.getElementById('qr-container');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const qrImg = document.getElementById('qr-code-img');

    if (qrContainer && qrImg) {
      qrImg.src = dataUrl;
      qrContainer.style.display = 'flex';
      if (qrPlaceholder) qrPlaceholder.style.display = 'none';
    }

    // 2. Elemen Cluster Focus Card yang aktif dilihat di dashboard
    const clusterQrContainer = document.getElementById('cluster-qr-container');
    const clusterQrImg = document.getElementById('cluster-qr-code-img');
    const clusterPlaceholder = document.getElementById('cluster-qr-placeholder');
    const clusterPairing = document.getElementById('cluster-pairing-code-display');
    const clusterOnline = document.getElementById('cluster-online-display');
    const clusterStatusBadge = document.getElementById('cluster-focus-status-badge');

    if (clusterQrContainer && clusterQrImg) {
      clusterQrImg.src = dataUrl;
      clusterQrContainer.style.display = 'flex';
      if (clusterPlaceholder) clusterPlaceholder.style.display = 'none';
      if (clusterPairing) clusterPairing.style.display = 'none';
      if (clusterOnline) clusterOnline.style.display = 'none';
    }
    if (clusterStatusBadge) {
      clusterStatusBadge.className = 'badge badge-rose';
      clusterStatusBadge.innerHTML = '<span class="badge-dot" style="background:#f43f5e;"></span> WAITING QR';
    }

    if (typeof window.onClusterQrUpdate === 'function') {
      window.onClusterQrUpdate('primary', dataUrl);
    }

    if (typeof window.hideBlackholeLoader === 'function') {
      window.hideBlackholeLoader();
    }
  }

  function showPairingCodeUI(code) {
    const clusterDisplay = document.getElementById('cluster-pairing-code-display');
    const clusterDigits = document.getElementById('cluster-pairing-digits');
    const clusterPlaceholder = document.getElementById('cluster-qr-placeholder');
    const clusterQrContainer = document.getElementById('cluster-qr-container');
    const clusterOnline = document.getElementById('cluster-online-display');
    const clusterStatusBadge = document.getElementById('cluster-focus-status-badge');

    if (clusterPlaceholder) clusterPlaceholder.style.display = 'none';
    if (clusterQrContainer) clusterQrContainer.style.display = 'none';
    if (clusterOnline) clusterOnline.style.display = 'none';
    if (clusterDisplay && clusterDigits) {
      clusterDigits.textContent = code;
      clusterDisplay.style.display = 'block';
    }
    if (clusterStatusBadge) {
      clusterStatusBadge.className = 'badge badge-cyan';
      clusterStatusBadge.innerHTML = '<span class="badge-dot" style="background:#38bdf8;"></span> PAIRING MODE';
    }

    const pairingDisplay = document.getElementById('pairing-code-display');
    const pairingDigits = document.getElementById('pairing-digits');
    if (pairingDisplay && pairingDigits) {
      pairingDigits.textContent = code;
      pairingDisplay.style.display = 'block';
    }

    if (typeof window.onClusterPairingCodeUpdate === 'function') {
      window.onClusterPairingCodeUpdate('primary', code);
    }

    if (typeof showToast === 'function') {
      showToast(`🔑 Kode Pairing WhatsApp Diterima: ${code}`, 'success');
    }

    if (typeof window.hideBlackholeLoader === 'function') {
      window.hideBlackholeLoader();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }

  window.PolarisWS = {
    connect,
    updateStatusUI,
    updateQrUI,
    showPairingCodeUI,
  };
})();
