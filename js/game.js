const canvas = document.getElementById('birdCanvas');
const ctx = canvas.getContext('2d');
let players = [], pipes = [], gameRunning = false, frameCount = 0;

const gameEngine = {
    start: () => {
        if (!window.Bird) return alert("Entities missing!");
        document.getElementById('lobby-menu').style.display = 'none';
        document.getElementById('die-menu').style.display = 'none';
        canvas.style.display = 'block';
        
        // Reset game state
        pipes = []; 
        players = activeConfigs.map(c => new window.Bird(c));
        gameRunning = true; 
        frameCount = 0;
        
        gameEngine.loop();
    },

    // New non-intrusive announcement
    announceDeath: (name, color) => {
        const announcer = document.createElement('div');
        announcer.className = 'death-announcement';
        announcer.style.borderLeft = `4px solid ${color}`;
        announcer.innerHTML = `<span style="color:${color}">${name}</span> CRASHED`;
        document.getElementById('game-container').appendChild(announcer);
        
        setTimeout(() => announcer.classList.add('fade-out'), 2000);
        setTimeout(() => announcer.remove(), 2500);
    },

    loop: () => {
        if (!gameRunning) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Get Current Mode Settings
        const m = ModeHandler.getCurrent();
        
        // Spawn pipes based on mode-specific timing
        if (frameCount++ % m.spawn === 0) {
            pipes.push(new window.Pipe(m, canvas.width, canvas.height));
        }
        
        pipes.forEach((p, i) => {
            p.update(canvas.height); // Pass canvas height here
            p.draw(ctx, canvas.height);
            if (p.x < -100) pipes.splice(i, 1);
        });

        players.forEach(p => {
            if (!p.isDead) {
                p.update(canvas.height);
                
                pipes.forEach(pipe => {
                    // Collision Logic
                    if (p.x + 10 > pipe.x && p.x - 10 < pipe.x + pipe.width) {
                        if (p.y - 10 < pipe.topHeight || p.y + 10 > pipe.topHeight + pipe.spacing) {
                            p.isDead = true;
                            gameEngine.announceDeath(p.name, p.color);
                        }
                    }
                });

                // Sync with server if online
                const sessionId = document.getElementById('session-id').value;
                if (typeof socket !== 'undefined' && sessionId) {
                    socket.emit('syncGame', { sessionId, id: p.name, x: p.x, y: p.y, color: p.color });
                }
            }
            p.draw(ctx);
        });

        if (players.length > 0 && players.every(p => p.isDead)) {
            setTimeout(() => {
                gameRunning = false; 
                gameEngine.over();
            }, 1000);
        } else {
            requestAnimationFrame(gameEngine.loop);
        }
    },

    over: () => {
        canvas.style.display = 'none';
        document.getElementById('die-menu').style.display = 'flex';
        
        // Get the key of the current mode (classic, hardcore, or zen)
        const currentModeKey = document.getElementById('game-mode').value;
    
        document.getElementById('results-list').innerHTML = players.map(p => {
            const finalScore = Math.floor(p.distance/10);
            
            if (typeof socket !== 'undefined' && socket.connected) {
                // WE NOW SEND THE MODE KEY
                socket.emit('submitScore', { 
                    name: p.name, 
                    score: finalScore, 
                    mode: currentModeKey 
                });
            }
            return `<div>${p.name}: ${finalScore}m</div>`;
        }).join('');
    }
};

window.addEventListener('keydown', e => {
    if (bindingIndex !== -1) {
        activeConfigs[bindingIndex].key = e.keyCode;
        activeConfigs[bindingIndex].keyName = e.keyCode === 32 ? 'SPACE' : e.key.toUpperCase();
        bindingIndex = -1; 
        uiAction.render();
    } else if (gameRunning) {
        players.forEach(p => { if (e.keyCode === p.key) p.flap(); });
    }
});