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
    const privacy =
  document.getElementById('room-privacy')?.value || 'public';

socket.emit('createRoom', {
  id,
  maxPlayers: max,
  privacy
});
  },

  join: () => {
    const id = (document.getElementById('session-id').value || '').trim().toUpperCase();
    if (id) socket.emit('joinSession', id);
  },

 broadcastStart: () => {

  // LOCAL GAME
  if (!socket.connected || window.isHost && !document.getElementById('session-id').value) {
    window.finalResults = [];
    gameEngine.start();
    return;
  }

  // ONLINE GAME
  const sessionId = (document.getElementById('session-id').value || '').trim().toUpperCase();

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
  window.isHost = (data.hostId === socket.id);

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

socket.on('gameUpdate', (data) => {
  if (!gameRunning || !data) return;

  // 1. SYNC PLAYERS (Fixes the "bird stuck" and "laggy bird" issue)
  if (Array.isArray(data.players)) {
    data.players.forEach(serverPlayer => {
      const localPlayer = players.find(p => p.id === serverPlayer.id);
      if (localPlayer) {
        localPlayer.targetX = serverPlayer.x;
        localPlayer.targetY = serverPlayer.y;
        localPlayer.isDead = serverPlayer.isDead;
        localPlayer.distance = serverPlayer.distance;
      }
    });
  }

  // 2. SYNC PIPES (Fixes missing/stuck obstacles)
  if (Array.isArray(data.pipes)) {
    while (pipes.length < data.pipes.length) {
      pipes.push(new window.Pipe(ModeHandler.getCurrent(), canvas.width, canvas.height));
    }
    while (pipes.length > data.pipes.length) {
      pipes.pop();
    }
    data.pipes.forEach((pipeData, i) => {
      if (!pipes[i]) return;
      pipes[i].x = pipeData.x;
      pipes[i].topHeight = pipeData.topHeight;
      pipes[i].width = pipeData.width;
      pipes[i].spacing = pipeData.spacing;
    });
  }
});

socket.on('startGameNow', () => {
  window.finalResults = [];
  gameRunning = true; // 🔥 THIS IS REQUIRED
  gameEngine.start();
});
socket.on && socket.on('errorMsg', (msg) => {
  alert(msg);
});
socket.on && socket.on('flap', (data) => {
  if (!window.isHost) return;
socket.on && socket.on('publicRooms', (rooms) => {
  const active = document.getElementById('rooms-list-data');
  if (!active) return;

  active.innerHTML = rooms.map(r => `
    <div class="active-room">
      <strong>${r.id}</strong>
      <span>${r.playerCount || 1}/${r.maxPlayers}</span>
      <em>${r.privacy}</em>
    </div>
  `).join('');
});
  const p = players.find(x => x.id === data.id);
  if (p && !p.isDead) {
    p.flap();
  }
  
});
function renderPublicRooms(rooms) {

  const container = document.getElementById('public-rooms-list');

  if (!container) return;

  if (!rooms || !rooms.length) {
    container.innerHTML = '<div>No public rooms</div>';
    return;
  }

  container.innerHTML = rooms.map(room => `
    <div class="public-room-card">
      
      <div>
        <strong>${room.id}</strong>
      </div>

      <div>
        ${room.playerCount}/${room.maxPlayers} PLAYERS
      </div>

      <div>
        ${room.privacy.toUpperCase()}
      </div>

      <button onclick="joinPublicRoom('${room.id}')">
        JOIN
      </button>

    </div>
  `).join('');
}
function joinPublicRoom(roomId) {

  document.getElementById('session-id').value = roomId;

  netAction.join();

}