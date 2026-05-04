const canvas = document.getElementById('birdCanvas');
const ctx = canvas.getContext('2d');
let players = [], pipes = [], gameRunning = false, frameCount = 0;

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const gameEngine = {
  start: () => {
    document.getElementById('lobby-menu').style.display = 'none';
    document.getElementById('die-menu').style.display = 'none';
    canvas.style.display = 'block';

    pipes = [];
    players = activeConfigs.map(c => new window.Bird(c));

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
  },

  loop: () => {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const m = ModeHandler.getCurrent();

    if (frameCount++ % m.spawn === 0) {
      pipes.push(new window.Pipe(m, canvas.width, canvas.height));
    }

    pipes.forEach((p, i) => {
      p.update(canvas.height);
      p.draw(ctx, canvas.height);
      if (p.x < -100) pipes.splice(i, 1);
    });

    players.forEach(p => {
      const isLocal = p.id === socket.id || p.isLocal;
      if (!p.isDead && isLocal) {
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
      p.draw(ctx);
    });

    if (socket.connected) {
      const sessionId = (document.getElementById('session-id').value || '').trim().toUpperCase();
      const myBirds = players.filter(p => p.id === socket.id);
      if (myBirds.length > 0 && sessionId) {
        socket.emit('syncGame', {
          sessionId,
          players: myBirds.map(b => ({
            id: b.id, x: b.x, y: b.y, isDead: b.isDead
          }))
        });
      }
    }

    if (players.length > 0 && players.every(p => p.isDead)) {
      gameRunning = false;
      setTimeout(() => gameEngine.over(), 1000);
      return;
    }

    requestAnimationFrame(gameEngine.loop);
  },

  over: () => {
    canvas.style.display = 'none';
    document.getElementById('die-menu').style.display = 'flex';

    const currentModeKey = document.getElementById('game-mode').value;

    document.getElementById('results-list').innerHTML = players.map(p => {
      const finalScore = Math.floor(p.distance / 10);
      if (socket.connected && p.id === socket.id) {
        socket.emit('submitScore', { name: p.name, score: finalScore, mode: currentModeKey });
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
    if (isLocal && e.keyCode === p.key) p.flap();
  });
});

window.addEventListener('touchstart', (e) => {
  if (!gameRunning) return;
  e.preventDefault();
  players.forEach(p => {
    const isLocal = p.id === socket.id || p.isLocal;
    if (isLocal) p.flap();
  });
}, { passive: false });
