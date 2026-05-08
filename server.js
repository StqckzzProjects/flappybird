const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '/')));

const LEADERBOARD_FILE = './leaderboard.json';

let globalLeaderboard = [];

// load saved leaderboard
if (fs.existsSync(LEADERBOARD_FILE)) {
  try {
    const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
    globalLeaderboard = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
    globalLeaderboard = [];
  }
}

let activeRooms = []; // { id, privacy, playerCount, maxPlayers, hostId }

io.on('connection', (socket) => {
  console.log(`Connection established: ${socket.id}`);
  socket.on('gameOver', (data) => {
    if (!data || !data.sessionId || !Array.isArray(data.players)) return;
  
    io.to(data.sessionId).emit('gameResults', {
      players: data.players
    });
  });
  socket.on('flap', (data) => {
  if (!data || !data.sessionId) return;
  socket.to(data.sessionId).emit('flap', {
    id: data.id,
    sessionId: data.sessionId
  });
});
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

  if (!data || typeof data.score !== 'number' || data.score <= 0) {
    return;
  }

  const entry = {
    name: data.name || 'ANON',
    score: data.score,
    mode: data.mode || 'classic',
    color: data.color || '#ffffff',
    time: Date.now()
  };

  // save ALL scores forever
  globalLeaderboard.push(entry);

  // sort highest first
  globalLeaderboard.sort((a, b) => b.score - a.score);

  // save to file permanently
  try {
    fs.writeFileSync(
      LEADERBOARD_FILE,
      JSON.stringify(globalLeaderboard, null, 2)
    );
  } catch (err) {
    console.error('Failed to save leaderboard:', err);
  }

  // only broadcast if score entered top 10
  const top10 = globalLeaderboard.slice(0, 10);

  const madeTop10 = top10.some(s =>
    s.name === entry.name &&
    s.score === entry.score &&
    s.time === entry.time
  );

  if (madeTop10) {
    io.emit('updateLeaderboard', globalLeaderboard);
  }
});
  socket.on('get-leaderboard', (callback) => {
  if (typeof callback === 'function') {
    callback(globalLeaderboard);
  }
});

  // ---- LOBBY ----
  socket.on('createRoom', (data) => {
  if (!data || !data.id) return;

  const id = String(data.id).toUpperCase();
  const maxPlayers = Number(data.maxPlayers) || 4;
  const privacy = data.privacy || 'public';

  socket.join(id);

  // create or update room
  let room = activeRooms.find(r => r.id === id);

  if (!room) {
    room = {
      id,
      privacy,
      maxPlayers,
      hostId: socket.id,
      playerCount: 1
    };
    activeRooms.push(room);
  } else {
    room.maxPlayers = maxPlayers;
    room.privacy = privacy;
  }

  // ALWAYS recompute player count accurately
  const set = io.sockets.adapter.rooms.get(id);
  room.playerCount = set ? set.size : 1;

socket.emit('roomJoined', {
  sessionId: id,
  maxPlayers: room ? room.maxPlayers : maxPlayers,
  isHost: true,
  hostId: room ? room.hostId : socket.id,
  existingPlayers: []
});

  // IMPORTANT: broadcast updated room list AFTER state is correct
  io.emit('publicRooms', activeRooms.filter(r => r.privacy === 'public'));
});

  socket.on('joinSession', (sessionId) => {
  if (!sessionId) return;

  const id = String(sessionId).toUpperCase();

  // find room ONCE only
  const room = activeRooms.find(r => r.id === id);

  if (!room) {
    socket.emit('errorMsg', 'Room not found');
    return;
  }

  const set = io.sockets.adapter.rooms.get(id);
  const current = set ? set.size : 0;

  if (current >= room.maxPlayers) {
    socket.emit('errorMsg', 'Room is full!');
    return;
  }

  socket.join(id);

  // update player count safely
  const updatedSet = io.sockets.adapter.rooms.get(id);
  room.playerCount = updatedSet ? updatedSet.size : 1;

  const peers = Array.from(updatedSet || []).filter(sid => sid !== socket.id);

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

  const id = String(sessionId).toUpperCase();
  const room = activeRooms.find(r => r.id === id);

  if (!room) return;

  // ONLY ALLOW START FROM HOST (but safer check)
  const isHost = room.hostId === socket.id;

  if (!isHost) return;

  io.to(id).emit('startGameNow');
});

  // ---- GAME SYNC ----
  socket.on('syncGame', (data) => {
  if (!data || !data.sessionId) return;

  // immediate relay (no buffering)
socket.to(data.sessionId).emit('gameUpdate', data);
});

  // ---- DISCONNECT ----
socket.on('disconnect', () => {
  for (let i = activeRooms.length - 1; i >= 0; i--) {
    const room = activeRooms[i];
    const set = io.sockets.adapter.rooms.get(room.id);

    if (!set || set.size === 0) {
      activeRooms.splice(i, 1);
      continue;
    }

    room.playerCount = set.size;

    // if host left → assign new host
    if (room.hostId === socket.id) {
      const remaining = Array.from(set);
      room.hostId = remaining.length > 0 ? remaining[0] : null;
    }

    io.to(room.id).emit('playerLeftRoom', { id: socket.id });
  }

  io.emit('publicRooms', activeRooms.filter(r => r.privacy === 'public'));
  console.log(`Connection terminated: ${socket.id}`);
});
});


server.listen(PORT, () => {
  console.log(`STQCKZZ BIRD SERVER RUNNING ON PORT ${PORT}`);
});
