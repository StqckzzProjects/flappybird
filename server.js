const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '/')));

let globalLeaderboard = [
  { name: "CORE_PILOT", score: 1000, mode: "classic" },
  { name: "NEON_BIRD",  score: 750,  mode: "classic" },
  { name: "STQCKZZ",    score: 500,  mode: "hardcore" }
];

let activeRooms = []; // { id, privacy, playerCount, maxPlayers, hostId }

io.on('connection', (socket) => {
  console.log(`Connection established: ${socket.id}`);

  // Initial data push
  socket.emit('updateLeaderboard', globalLeaderboard);
  socket.emit('publicRooms', activeRooms.filter(r => r.privacy === 'public'));

  // ---- PROFILE RELAY ----
  socket.on('updateProfile', (data) => {
    if (!data || !data.sessionId) return;
    socket.to(data.sessionId).emit('profileUpdated', data.config);
  });

  // Newcomer asks existing peers to broadcast their profiles
  socket.on('requestProfiles', (sessionId) => {
    socket.to(sessionId).emit('sendYourProfile', { to: socket.id });
  });

  // ---- MODE RELAY ----
  socket.on('updateGameMode', (data) => {
    if (!data || !data.sessionId) return;
    socket.to(data.sessionId).emit('modeChanged', data.mode);
  });

  // ---- LEADERBOARD ----
  socket.on('submitScore', (data) => {
    if (!data || typeof data.score !== 'number' || data.score <= 0) return;
    globalLeaderboard.push({
      name: data.name || 'ANON',
      score: data.score,
      mode: data.mode || 'classic'
    });
    globalLeaderboard.sort((a, b) => b.score - a.score);
    globalLeaderboard = globalLeaderboard.slice(0, 50);
    io.emit('updateLeaderboard', globalLeaderboard);
  });

  // ---- LOBBY ----
  socket.on('createRoom', (data) => {
    if (!data || !data.id) return;
    const id = String(data.id).toUpperCase();
    const maxPlayers = Number(data.maxPlayers) || 4;
    const privacy = data.privacy || 'public';

    socket.join(id);

    let room = activeRooms.find(r => r.id === id);
    if (!room) {
      room = { id, privacy, playerCount: 1, maxPlayers, hostId: socket.id };
      activeRooms.push(room);
    } else {
      room.playerCount = (io.sockets.adapter.rooms.get(id) || new Set()).size;
    }

    socket.emit('roomJoined', {
      sessionId: id,
      maxPlayers: room.maxPlayers,
      isHost: true,
      existingPlayers: []
    });
    io.emit('publicRooms', activeRooms.filter(r => r.privacy === 'public'));
  });

  socket.on('joinSession', (sessionId) => {
    if (!sessionId) return;
    const id = String(sessionId).toUpperCase();
    const room = activeRooms.find(r => r.id === id);
    if (!room) { socket.emit('errorMsg', 'Room not found'); return; }

    const current = (io.sockets.adapter.rooms.get(id) || new Set()).size;
    if (current >= room.maxPlayers) { socket.emit('errorMsg', 'Room is full!'); return; }

    socket.join(id);
    room.playerCount = current + 1;

    const peers = Array.from(io.sockets.adapter.rooms.get(id) || [])
      .filter(sid => sid !== socket.id);

    socket.emit('roomJoined', {
      sessionId: id,
      maxPlayers: room.maxPlayers,
      isHost: false,
      existingPlayers: peers
    });

    socket.to(id).emit('playerJoinedRoom', { id: socket.id });
    io.emit('publicRooms', activeRooms.filter(r => r.privacy === 'public'));
  });

  // ---- START ----
  socket.on('requestStart', (sessionId) => {
    if (!sessionId) return;
    io.to(String(sessionId).toUpperCase()).emit('startGameNow');
  });

  // ---- GAME SYNC ----
  socket.on('syncGame', (data) => {
    if (!data || !data.sessionId) return;
    socket.to(data.sessionId).emit('gameUpdate', data);
  });

  // ---- DISCONNECT ----
  socket.on('disconnect', () => {
    for (let i = activeRooms.length - 1; i >= 0; i--) {
      const room = activeRooms[i];
      const set = io.sockets.adapter.rooms.get(room.id);
      if (!set || set.size === 0) {
        activeRooms.splice(i, 1);
      } else {
        room.playerCount = set.size;
        io.to(room.id).emit('playerLeftRoom', { id: socket.id });
      }
    }
    io.emit('publicRooms', activeRooms.filter(r => r.privacy === 'public'));
    console.log(`Connection terminated: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`STQCKZZ BIRD SERVER RUNNING ON PORT ${PORT}`);
});
