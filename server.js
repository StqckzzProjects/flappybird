const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '/')));


// Updated "Database" to handle modes
let globalLeaderboard = [];

io.on('connection', (socket) => {
    // ... existing room logic ...

    socket.on('requestLeaderboard', () => {
        socket.emit('updateLeaderboard', globalLeaderboard);
    });

    socket.on('submitScore', (data) => {
        // data now includes: { name, score, mode }
        if (data.score > 0) {
            globalLeaderboard.push({
                name: data.name,
                score: data.score,
                mode: data.mode || 'classic' // Fallback
            });

            // Sort and keep top 50 overall (filtering happens on client)
            globalLeaderboard.sort((a, b) => b.score - a.score);
            if (globalLeaderboard.length > 100) globalLeaderboard.shift();

            io.emit('updateLeaderboard', globalLeaderboard);
        }
    });
});