const canvas = document.getElementById('birdCanvas');
const ctx = canvas.getContext('2d');
let players = [], pipes = [], gameRunning = false, frameCount = 0;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let lastSync = 0;
const now = Date.now();
const gameEngine = {
  start: () => {
    window.finalResults = [];
    document.getElementById('lobby-menu').style.display = 'none';
    document.getElementById('die-menu').style.display = 'none';
    canvas.style.display = 'block';
    pipes = [];
    players = activeConfigs.map(c => new window.Bird({
  ...c
}));

    gameRunning = true;
    frameCount = 0;
    gameEngine.loop();
  },

  announceDeath: (name, color) => {
    const announcer = document.createElement('div');
    announcer.className = 'death-announcement';
    announcer.style.borderLeft = `4px solid ${color}`;
    announcer.innerHTML = `<span style="color:${color}">${name}</span> CRASHED`;
    document.getElementById('game-container').appendChild(announcer);
    setTimeout(() => announcer.remove(), 2000);
    window.finalResults = [];
  },

  loop: () => {
    
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const m = ModeHandler.getCurrent();

  if (window.isHost) {
  if (frameCount++ % m.spawn === 0) {
    pipes.push(new window.Pipe(m, canvas.width, canvas.height));
  }
}

    pipes.forEach((p, i) => {

  // ONLY host updates pipes
  if (window.isHost) {
    p.update(canvas.height);

    if (p.x < -100) {
      pipes.splice(i, 1);
    }
  }

  // EVERYONE draws pipes
  p.draw(ctx, canvas.height);

});

    players.forEach(p => {
      if (window.isHost) {
        // ONLY host runs physics
        if (!p.isDead) {
          p.update(canvas.height);
    
          pipes.forEach(pipe => {
            if (p.x + p.radius > pipe.x && p.x - p.radius < pipe.x + pipe.width) {
              if (p.y - p.radius < pipe.topHeight || p.y + p.radius > pipe.topHeight + pipe.spacing) {
                if (!p.isDead) {
                  p.isDead = true;
                  gameEngine.announceDeath(p.name, p.color);
                }
              }
            }
          });
        }
      }
    // smooth movement for non-host
if (!window.isHost) {
  if (!window.isHost && p.targetX !== undefined) {
  p.x += (p.targetX - p.x) * 0.25;
  p.y += (p.targetY - p.y) * 0.25;
}
}
      // ✅ EVERYONE draws
      p.draw(ctx);
    });

    if (socket.connected && window.isHost) {
      const sessionId = (document.getElementById('session-id').value || '').trim().toUpperCase();
    
      socket.emit('syncGame', {
  sessionId,
  players: players.map(p => ({
    id: p.id,
    x: p.x,
    y: p.y,
    isDead: p.isDead,
    distance: p.distance,
    color: p.color,
    name: p.name
  }))
});
    }

    if (players.length > 0 && players.every(p => p.isDead)) {
      gameRunning = false;
    
      if (socket.connected) {
        const sessionId = (document.getElementById('session-id').value || '').trim().toUpperCase();
    
        socket.emit('gameOver', {
          sessionId,
          players
        });
      }
    
      setTimeout(() => gameEngine.over(), 1000);
      return;
    }

    requestAnimationFrame(gameEngine.loop);
  },

  over: () => {
    canvas.style.display = 'none';
    document.getElementById('die-menu').style.display = 'flex';
  
    const currentModeKey = document.getElementById('game-mode').value;
  
    const list = (window.finalResults && window.finalResults.length)
      ? window.finalResults
      : players;
  
    document.getElementById('results-list').innerHTML = list.map(p => {
      const finalScore = Math.floor((p.distance || 0) / 10);
  
      if (socket.connected && p.id === socket.id) {
        socket.emit('submitScore', {
          name: p.name,
          score: finalScore,
          mode: currentModeKey,
          color: p.color
        });
      }
  
      return `<div style="color:${p.color}; font-family:monospace; margin-bottom:5px;">
        ${p.name}: ${finalScore}m
      </div>`;
    }).join('');
  }
};

window.addEventListener('keydown', e => {
  if (typeof bindingIndex !== 'undefined' && bindingIndex !== -1) return;
  if (!gameRunning) return;
  players.forEach(p => {
    const isLocal = p.id === socket.id || p.isLocal;
    if (isLocal && e.keyCode === p.key) {
      if (window.isHost) {
        p.flap();
      } else {
        const sessionId = (document.getElementById('session-id').value || '').trim().toUpperCase();

socket.emit('flap', {
  id: socket.id,
  sessionId
});
      }
    }
  });
});

window.addEventListener('touchstart', (e) => {
  if (!gameRunning) return;
  e.preventDefault();

  players.forEach(p => {
    const isLocal = p.id === socket.id || p.isLocal;

    if (isLocal) {
      if (window.isHost) {
        p.flap();
      } else {
        const sessionId = (document.getElementById('session-id').value || '').trim().toUpperCase();

        socket.emit('flap', {
          id: socket.id,
          sessionId
        });
      }
    }
  });
}, { passive: false });