const socket = typeof io !== 'undefined' ? io() : { emit: () => {}, on: () => {}, connected: false, id: 'local' };

function rebootGame() {
  const isHost = activeConfigs.length > 0 && activeConfigs[0].id === socket.id;

  if (socket.connected) {
    if (isHost) {
      netAction.broadcastStart();
    }
  } else {
    gameEngine.start();
  }
}

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

    // only host (first player) can start
    const isHost = activeConfigs.length > 0 && activeConfigs[0].id === socket.id;
  
    if (sessionId && socket.connected && isHost) {
      socket.emit('requestStart', sessionId);
    }
  }
};
socket.on && socket.on('gameResults', (data) => {
  if (!data || !Array.isArray(data.players)) return;

  // store globally so game.js can use it
  window.finalResults = data.players;
});
socket.on && socket.on('roomJoined', (data) => {
  maxRoomSize = data.maxPlayers || 4;
  document.getElementById('session-id').value = data.sessionId;
  window.isHost = data.isHost === true;

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
  if (!gameRunning || !data) return;

  // update players
  if (Array.isArray(data.players)) {
    data.players.forEach(remote => {
      let p = players.find(x => x.id === remote.id);

      if (!p) {
        // create if missing
        p = new window.Bird(remote);
        players.push(p);
      }

      p.x = remote.x;
      p.y = remote.y;
      p.isDead = remote.isDead;
      p.distance = remote.distance || 0;
      p.color = remote.color;
      p.name = remote.name;
    });
  }

  // update pipes
  if (Array.isArray(data.pipes) && data.pipes.length) {
    pipes = data.pipes.map(pipeData => {
      const pipe = new window.Pipe(ModeHandler.getCurrent(), canvas.width, canvas.height);
      pipe.x = pipeData.x;
      pipe.topHeight = pipeData.topHeight;
      return pipe;
    });
  }
  }); // ✅ <-- THIS WAS MISSING

socket.on && socket.on('startGameNow', () => {
  window.finalResults = [];
  gameEngine.start();
});
socket.on && socket.on('errorMsg', (msg) => {
  alert(msg);
});
socket.on && socket.on('flap', (data) => {
  if (!window.isHost) return;

  const p = players.find(x => x.id === data.id);
  if (p && !p.isDead) {
    p.flap();
  }
});