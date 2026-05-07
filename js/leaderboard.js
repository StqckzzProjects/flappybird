let __leaderboardCache = [];
let showAllScores = false;
  function toggleLeaderboardView() {

  showAllScores = !showAllScores;

  const btn = document.getElementById('toggle-leaderboard-btn');

  if (btn) {
    btn.innerText = showAllScores
      ? 'SHOW TOP 5'
      : 'SHOW ALL';
  }

  renderLeaderboard();
}
function renderLeaderboard() {

  const ul = document.getElementById('leaderboard-list');
  const modeSel = document.getElementById('leaderboard-mode');
  if (!ul) return;
  const mode = modeSel ? modeSel.value : 'all';
  let filtered = (
  mode === 'all'
    ? __leaderboardCache
    : __leaderboardCache.filter(e => e.mode === mode)
);

if (!showAllScores) {
  filtered = filtered.slice(0, 5);
}
  ul.innerHTML = filtered.map((e, i) => {

  let rankClass = '';

  if (i === 0) rankClass = 'gold';
  else if (i === 1) rankClass = 'silver';
  else if (i === 2) rankClass = 'bronze';

  return `
    <li>

      <span class="lb-rank ${rankClass}">
        #${i + 1}
      </span>

      <span class="lb-name"
        style="color:${e.color || '#ffffff'}">
        ${e.name}
      </span>

      <span class="lb-score">
        ${e.score}
      </span>

      <span class="mode-tag">
        ${e.mode}
      </span>

    </li>
  `;
}).join('') || '<li>No scores yet</li>';
}

socket.on('updateLeaderboard', (lb) => {
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