const socket = typeof io !== 'undefined' ? io() : { emit: () => {}, on: () => {}, connected: false, id: 'local' };

const netAction = {
  host: () => {
    const id = Math.random().toString(36).substring(2, 7).toUpperCase();
    const sizeEl = document.getElementById('room-size');
    const max = sizeEl ? parseInt(sizeEl.value, 10) || 4 : 4;
    document.getElementById('session-id').value = id;
    socket.emit('createRoom', { id, maxPlayers: max, privacy: 'public' });
  },

  join: () => {
    const id = (document.getElementById('session-id').value || '').trim().toUpperCase();
    if (id) socket.emit('joinSession', id);
  },

  broadcastStart: () => {
    const sessionId = (document.getElementById('session-id').value || '').trim().toUpperCase();
    if (sessionId && socket.connected) {
      socket.emit('requestStart', sessionId);
    } else {
      gameEngine.start();
    }
  }
};

socket.on && socket.on('roomJoined', (data) => {
  maxRoomSize = data.maxPlayers || 4;
  document.getElementById('session-id').value = data.sessionId;

  const me = activeConfigs.find(p => p.id === socket.id);
  if (!me) uiAction.addPlayer(true);

  if (Array.isArray(data.existingPlayers)) {
    data.existingPlayers.forEach(pid => {
      if (!activeConfigs.some(p => p.id === pid)) {
        uiAction.addPlayer(false, {
          id: pid,
          name: 'REMOTE',
          color: ColorManager.defaults[activeConfigs.length] || '#fff',
          key: 32, keyName: 'SPACE', isLocal: false
        });
      }
    });
    socket.emit('requestProfiles', data.sessionId);
  }

  const myIdx = activeConfigs.findIndex(p => p.id === socket.id);
  if (myIdx !== -1) uiAction.syncProfile(myIdx);
});

socket.on && socket.on('playerJoinedRoom', (data) => {
  if (!data || !data.id) return;
  if (activeConfigs.some(p => p.id === data.id)) return;
  uiAction.addPlayer(false, {
    id: data.id,
    name: 'REMOTE',
    color: ColorManager.defaults[activeConfigs.length] || '#fff',
    key: 32, keyName: 'SPACE', isLocal: false
  });
  const myIdx = activeConfigs.findIndex(p => p.id === socket.id);
  if (myIdx !== -1) uiAction.syncProfile(myIdx);
});

socket.on && socket.on('sendYourProfile', () => {
  const myIdx = activeConfigs.findIndex(p => p.id === socket.id);
  if (myIdx !== -1) uiAction.syncProfile(myIdx);
});

socket.on && socket.on('profileUpdated', (config) => {
  if (!config || !config.id) return;
  const idx = activeConfigs.findIndex(p => p.id === config.id);
  if (idx === -1) {
    uiAction.addPlayer(false, { ...config, isLocal: false });
  } else {
    activeConfigs[idx] = { ...activeConfigs[idx], ...config, isLocal: false };
    uiAction.render();
  }
});

socket.on && socket.on('playerLeftRoom', (data) => {
  if (!data || !data.id) return;
  const idx = activeConfigs.findIndex(p => p.id === data.id);
  if (idx !== -1) {
    activeConfigs.splice(idx, 1);
    uiAction.render();
  }
});

socket.on && socket.on('gameUpdate', (data) => {
  if (!gameRunning || !data || !Array.isArray(data.players)) return;
  data.players.forEach(remote => {
    const p = players.find(x => x.id === remote.id);
    if (p && p.id !== socket.id) {
      p.x = remote.x;
      p.y = remote.y;
      p.isDead = remote.isDead;
    }
  });
});

socket.on && socket.on('startGameNow', () => {
  gameEngine.start();
});

socket.on && socket.on('errorMsg', (msg) => {
  alert(msg);
});
