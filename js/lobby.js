let activeConfigs = [];
let maxRoomSize = 6;
let bindingIndex = -1;

const uiAction = {
  enterLobby: (mode) => {
    document.getElementById('nav-menu').style.display = 'none';
    document.getElementById('lobby-menu').style.display = 'flex';
    document.getElementById('online-controls').style.display = (mode === 'online') ? 'block' : 'none';
const addBtn = document.getElementById('add-local-player-btn');

if (addBtn) {
  addBtn.style.display = (mode === 'local') ? 'inline-block' : 'none';
}
    activeConfigs = [];
    window.isHost = (mode === 'local');
    if (mode === 'local') uiAction.addPlayer(true);
    uiAction.render();
  },

  addPlayer: (isLocal = false, remoteData = null) => {
    let newId;

if (remoteData) {

  newId = remoteData.id;

} else if (isLocal) {

  // LOCAL MODE = unique IDs for every player
  const onlineMode =
    document.getElementById('online-controls').style.display !== 'none';

  if (onlineMode) {
    // online local player = actual socket id
    newId = socket.id;
  } else {
    // true local multiplayer
    newId = `local_${Math.random().toString(36).substr(2, 5)}`;
  }

} else {

  newId = `remote_${Math.random().toString(36).substr(2, 5)}`;
}
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
          <div
  class="key-box"
  onclick="uiAction.startKeyBind(${i})"
>
  ${p.keyName}
</div>
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
  },
  startKeyBind: (idx) => {

  const player = activeConfigs[idx];
  if (!player) return;

  // prevent editing remote players
  const isMe = player.id === socket.id || player.isLocal;

  if (!isMe) return;

  bindingIndex = idx;

  const boxes = document.querySelectorAll('.key-box');

  if (boxes[idx]) {
    boxes[idx].innerText = 'PRESS KEY';
  }
},
};
window.addEventListener('keydown', (e) => {

  if (bindingIndex === -1) return;

  e.preventDefault();

  const player = activeConfigs[bindingIndex];

  if (!player) {
    bindingIndex = -1;
    return;
  }

  player.key = e.keyCode;

  // prettier key names
  const keyMap = {
    32: 'SPACE',
    37: 'LEFT',
    38: 'UP',
    39: 'RIGHT',
    40: 'DOWN'
  };

  player.keyName =
    keyMap[e.keyCode] ||
    e.key.toUpperCase();

  uiAction.render();

  uiAction.syncProfile(bindingIndex);

  bindingIndex = -1;
});