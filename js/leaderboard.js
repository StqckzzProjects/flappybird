let __leaderboardCache = [];

function renderLeaderboard() {
  const ul = document.getElementById('leaderboard-list');
  const modeSel = document.getElementById('leaderboard-mode');
  if (!ul) return;
  const mode = modeSel ? modeSel.value : 'all';
  const filtered = (mode === 'all'
    ? __leaderboardCache
    : __leaderboardCache.filter(e => e.mode === mode)
  ).slice(0, 20);
  ul.innerHTML = filtered.map((e, i) =>
    `<li><span>#${i+1}</span> <span>${e.name}</span> <span>${e.score}</span> <span class="mode-tag">${e.mode}</span></li>`
  ).join('') || '<li>No scores yet</li>';
}

socket.on('leaderboard-update', (lb) => {
  __leaderboardCache = lb || [];
  renderLeaderboard();
});

window.addEventListener('DOMContentLoaded', () => {
  socket.emit('get-leaderboard', (lb) => {
    __leaderboardCache = lb || [];
    renderLeaderboard();
  });
  const sel = document.getElementById('leaderboard-mode');
  if (sel) sel.onchange = renderLeaderboard;
});