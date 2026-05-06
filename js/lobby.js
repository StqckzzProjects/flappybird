let activeConfigs = [];
let maxRoomSize = 6;
let bindingIndex = -1;

const uiAction = {
  enterLobby: (mode) => {
    document.getElementById('nav-menu').style.display = 'none';
    document.getElementById('lobby-menu').style.display = 'flex';
    document.getElementById('online-controls').style.display = (mode === 'online') ? 'block' : 'none';

    activeConfigs = [];
    if (mode === 'local') uiAction.addPlayer(true);
    uiAction.render();
  },

  addPlayer: (isLocal = false, remoteData = null) => {
    const newId = remoteData
      ? remoteData.id
      : (isLocal ? (socket.id || `local_${Math.random().toString(36).substr(2,5)}`)
                 : `remote_${Math.random().toString(36).substr(2, 5)}`);

    if (activeConfigs.some(p => p.id === newId)) return;
    if (activeConfigs.length >= maxRoomSize) return;

    const i = activeConfigs.length;
    const config = remoteData || {
      id: newId,
      name: `PLAYER ${i + 1}`,
      color: ColorManager.defaults[i] || '#fff',
      key: 32,
      keyName: 'SPACE',
      isLocal
    };

    activeConfigs.push(config);

    activeConfigs.sort((a, b) => {
      if (a.id === socket.id) return -1;
      if (b.id === socket.id) return 1;
      return 0;
    });

    uiAction.render();

    if (isLocal && socket.connected) {
      const idx = activeConfigs.findIndex(p => p.id === socket.id);
      if (idx !== -1) uiAction.syncProfile(idx);
    }
  },

  removePlayer: (idx) => {
    activeConfigs.splice(idx, 1);
    uiAction.render();
  },

  updateColor: (idx, val) => {
    activeConfigs[idx].color = val;
    uiAction.render();
    uiAction.syncProfile(idx);
  },

  updateName: (idx, val) => {
    activeConfigs[idx].name = val;
    uiAction.syncProfile(idx);
  },

  render: () => {
    const container = document.getElementById('player-slots-container');
    if (!container) return;

    container.innerHTML = activeConfigs.map((p, i) => {
      const isMe = p.id === socket.id || p.isLocal;
      return `
        <div class="player-card${isMe ? '' : ' remote-card'}" style="border:2px solid ${p.color}">
          <span>${isMe ? 'YOU' : 'REMOTE'}</span>
          <input type="text" value="${p.name}" ${isMe ? '' : 'disabled'}
            onchange="uiAction.updateName(${i}, this.value)">
          <input type="color" value="${p.color}" ${isMe ? '' : 'disabled'}
            onchange="uiAction.updateColor(${i}, this.value)">
          <div class="key-box">${p.keyName}</div>
        </div>
      `;
    }).join('');
  },

  syncProfile: (idx) => {
    const sessionId = (document.getElementById('session-id').value || '').trim().toUpperCase();
    if (sessionId && socket.connected && activeConfigs[idx]) {
      socket.emit('updateProfile', {
        sessionId,
        config: activeConfigs[idx]
      });
    }
  }
};