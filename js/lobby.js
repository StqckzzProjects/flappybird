let activeConfigs = [];
let bindingIndex = -1;

const uiAction = {
    enterLobby: (mode) => {
        document.getElementById('nav-menu').style.display = 'none';
        document.getElementById('lobby-menu').style.display = 'flex';
        document.getElementById('online-controls').style.display = (mode === 'online') ? 'block' : 'none';
        
        // Request the leaderboard from the server
        if (typeof socket !== 'undefined') {
            socket.emit('requestLeaderboard');
        }

        activeConfigs = [];
        uiAction.addPlayer();
        uiAction.render();
    },
    addPlayer: () => {
        if (activeConfigs.length >= 4) return;
        const i = activeConfigs.length;
        activeConfigs.push({
            name: `PLAYER ${i+1}`,
            color: ColorManager.defaults[i] || '#ffffff',
            key: [32, 87, 38, 73][i],
            keyName: ['SPACE', 'W', 'UP', 'I'][i]
        });
        uiAction.render();
    },
    updateColor: (idx, val) => {
        activeConfigs[idx].color = val;
        const card = document.querySelectorAll('.player-card')[idx];
        if (card) {
            card.style.borderColor = val;
            card.style.boxShadow = ColorManager.getGlow(val);
        }
    },
    render: () => {
        const container = document.getElementById('player-slots-container');
        if (!container) return;
        container.innerHTML = activeConfigs.map((p, i) => `
            <div class="player-card" style="border: 2px solid ${p.color}; box-shadow: ${ColorManager.getGlow(p.color)}">
                <span style="color:${p.color};">PLAYER ${i+1}</span>
                <input type="text" value="${p.name}" onchange="activeConfigs[${i}].name=this.value">
                <input type="color" value="${p.color}" oninput="uiAction.updateColor(${i}, this.value)" onchange="uiAction.render()">
                <div class="key-box" onclick="bindingIndex=${i}; uiAction.render();">${bindingIndex === i ? '???' : p.keyName}</div>
            </div>
        `).join('') + (activeConfigs.length < 4 ? `<div class="add-player-card" onclick="uiAction.addPlayer()">+</div>` : '');
    }
};