const canvas = document.getElementById('birdCanvas');
canvas.width = 1000;
canvas.height = 700;
const ctx = canvas.getContext('2d');
let players = [], pipes = [], gameRunning = false, frameCount = 0;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let lastTime = 0; // Tracks time between frames
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
    
    // 👇 ADD THIS TO FIX THE MISSING BIRD:
   lastTime = performance.now();

cancelAnimationFrame(window.currentGameLoop);

window.gameLoopRunning = true;

window.currentGameLoop = requestAnimationFrame(gameEngine.loop);
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

  loop: (timestamp) => {
    if (!gameRunning) {
  window.gameLoopRunning = false;
  return;
}

    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / (1000 / 60); 
    lastTime = timestamp;
    // make sure non-host actually runs rendering loop even if host logic is off
if (!window.isHost && players.length === 0) {
  requestAnimationFrame(gameEngine.loop);
  return;
}

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const m = ModeHandler.getCurrent();

  if (window.isHost) {
  if (frameCount++ % m.spawn === 0) {
    pipes.push(new window.Pipe(m, canvas.width, canvas.height));
  }
}

    // 1. UPDATE PIPES
pipes.forEach((p, i) => {

  // ONLY HOST MOVES PIPES
  // clients just render synced positions
  if (window.isHost) {
    p.update(canvas.height, deltaTime);

    if (p.x < -100) {
      pipes.splice(i, 1);
      return;
    }
  }

  p.draw(ctx, canvas.height);
});

    // 2. UPDATE PLAYERS (Prediction + Interpolation)
    players.forEach(p => {

  const isMyBird = p.id === socket.id;

  // HOST RUNS EVERYTHING
  if (window.isHost) {

    if (!p.isDead) {
      p.update(canvas.height, deltaTime);

      pipes.forEach(pipe => {
        if (
          p.x + p.radius > pipe.x &&
          p.x - p.radius < pipe.x + pipe.width
        ) {
          if (
            p.y - p.radius < pipe.topHeight ||
            p.y + p.radius > pipe.topHeight + pipe.spacing
          ) {
            if (!p.isDead) {
              p.isDead = true;
              gameEngine.announceDeath(p.name, p.color);
            }
          }
        }
      });
    }

  } else {

    // MY OWN BIRD = FULL LOCAL PHYSICS
    if (isMyBird) {

      if (!p.isDead) {
        p.update(canvas.height, deltaTime);
      }

      // tiny correction only
      if (p.targetY != null) {
        p.y += (p.targetY - p.y) * 0.03;
      }

    } else {

      // OTHER PLAYERS = interpolation
      if (p.targetY != null) {
        p.y += (p.targetY - p.y) * 0.35;
      }

    }
  }

  p.draw(ctx);
});

    // 🔥 PERFORMANCE FIX: Only sync every 2nd frame to prevent lag spikes
    if (socket.connected && window.isHost && frameCount % 3 === 0) {
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
        })),
        // 👇 ADD PIPES BACK IN (Critical for non-host movement)
        pipes: pipes.map(pipe => ({
          x: pipe.x,
          topHeight: pipe.topHeight,
          width: pipe.width,
          spacing: pipe.spacing
        }))
      });
    }

if (players.length > 0 && players.every(p => p.isDead)) {

  gameRunning = false;

  const sessionId = (
    document.getElementById('session-id').value || ''
  ).trim().toUpperCase();

  // HOST TELLS EVERYONE TO END
  if (socket.connected && window.isHost) {

    socket.emit('forceGameOver', {
      sessionId,
      players
    });

    socket.emit('gameOver', {
      sessionId,
      players
    });
  }

  setTimeout(() => {
    gameEngine.over();
  }, 500);

  return;
}

   window.currentGameLoop =
  requestAnimationFrame(gameEngine.loop);
  },

  over: () => {
    gameRunning = false;
window.gameLoopRunning = false;
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
      // 1. JUMP INSTANTLY (Prediction)
      p.flap(); 

      // 2. TELL THE HOST (If you aren't the host)
      if (!window.isHost) {
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
      // 1. JUMP INSTANTLY (Prediction)
      p.flap();

      // 2. TELL THE HOST (If you aren't the host)
      if (!window.isHost) {
        const sessionId = (document.getElementById('session-id').value || '').trim().toUpperCase();
        socket.emit('flap', {
          id: socket.id,
          sessionId
        });
      }
    }
  });
}, { passive: false });