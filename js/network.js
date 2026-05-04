let rawLeaderboardData = []; // Store the full list here
let currentLBFilter = 'classic'; // Default filter

// Listen for the leaderboard update from server
socket.on('updateLeaderboard', (data) => {
    rawLeaderboardData = data;
    renderFilteredLB(); // Draw it immediately
});

function renderFilteredLB() {
    const lbContainer = document.getElementById('leaderboard-data');
    if (!lbContainer) return;

    // Filter the raw data based on the current mode
    const filtered = rawLeaderboardData.filter(entry => entry.mode === currentLBFilter);

    if (filtered.length === 0) {
        lbContainer.innerHTML = `<div style="padding:20px; opacity:0.5; text-align:center; font-size:10px;">NO ${currentLBFilter.toUpperCase()} RECORDS</div>`;
        return;
    }

    // Display top 10 for that specific mode
    lbContainer.innerHTML = filtered.slice(0, 10).map((entry, index) => `
        <div class="lb-entry">
            <span><span style="color:#444; margin-right:8px;">#${index + 1}</span> ${entry.name}</span>
            <span style="color:var(--neon-blue); font-weight:bold;">${entry.score}m</span>
        </div>
    `).join('');
}