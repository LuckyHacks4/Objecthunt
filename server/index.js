const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let rooms = {};
let votingTimers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create-room", ({ roomId, username, roundTime = 60, maxPlayers = 6 }) => {
    console.log("Create room request:", { roomId, username, socketId: socket.id, roundTime, maxPlayers });
    if (!rooms[roomId]) {
      console.log("Creating new room:", roomId);
      rooms[roomId] = {
        players: [],
        submissions: [],
        round: 0,
        scores: {},
        gameEnded: false,
        roundTime: Number(roundTime),
        maxPlayers: Number(maxPlayers)
      };
    }
    // Enforce max players
    if (rooms[roomId].players.length >= rooms[roomId].maxPlayers) {
      socket.emit("room-full");
      return;
    }
    // Prevent duplicate player in room
    if (!rooms[roomId].players.find(p => p.id === socket.id)) {
      console.log("Adding player to room:", { username, socketId: socket.id });
      const player = { id: socket.id, name: username, ready: false };
      rooms[roomId].players.push(player);
      rooms[roomId].scores[socket.id] = 0;
    } else {
      console.log("Player already in room:", socket.id);
    }
    socket.join(roomId);
    console.log("Room players after join:", rooms[roomId].players);
    io.to(roomId).emit("room-update", rooms[roomId].players);
  });

  socket.on("player-ready", ({ roomId }) => {
    const player = rooms[roomId]?.players.find(p => p.id === socket.id);
    if (player) player.ready = true;
    io.to(roomId).emit("room-update", rooms[roomId].players);
  });

  socket.on("submit-photo", ({ roomId, photoData, timestamp }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.submissions.push({ playerId: socket.id, photo: photoData, time: timestamp, votes: [] });
    if (room.submissions.length === room.players.length) {
      io.to(roomId).emit("start-voting", room.submissions);
      // Start voting countdown timer (use room.roundTime)
      if (votingTimers[roomId]) {
        clearTimeout(votingTimers[roomId]);
      }
      votingTimers[roomId] = setTimeout(() => {
        processVotingResults(roomId);
      }, (room.roundTime || 60) * 1000);
    }
  });

  socket.on("vote", ({ roomId, photoIndex, vote }) => {
    const sub = rooms[roomId].submissions[photoIndex];
    // Prevent voting on own submission
    if (sub.playerId === socket.id) {
      console.log("Player tried to vote on their own submission, ignoring.");
      return;
    }
    if (!sub.votes.find(v => v.voter === socket.id)) {
      sub.votes.push({ voter: socket.id, vote });
      
      // Check if all players have voted (excluding the photo owner)
      const votersCount = rooms[roomId].players.length - 1;
      const totalVotes = rooms[roomId].submissions.reduce((total, sub) => total + sub.votes.length, 0);
      
      if (totalVotes >= votersCount * rooms[roomId].submissions.length) {
        // All votes are in, process results immediately
        if (votingTimers[roomId]) {
          clearTimeout(votingTimers[roomId]);
          delete votingTimers[roomId];
        }
        processVotingResults(roomId);
      }
    }
  });

  function processVotingResults(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Process each submission
    room.submissions.forEach(submission => {
      const yesVotes = submission.votes.filter(v => v.vote === "yes").length;
      const totalVotes = submission.votes.length;
      
      if (totalVotes > 0) {
        const ratio = yesVotes / totalVotes;
        if (ratio >= 0.5) {
          const rank = room.submissions
            .sort((a, b) => a.time - b.time)
            .findIndex(s => s.playerId === submission.playerId);
          const speedBonus = 1 - rank * 0.1;
          const points = Math.round(100 * speedBonus * ratio);
          room.scores[submission.playerId] += points;
        }
      }
    });

    // Update scores and move to next round
    io.to(roomId).emit("score-update", room.scores);
    
    // Wait 3 seconds before next round (to allow clients to show round results modal)
    setTimeout(() => {
      nextRound(roomId);
    }, 3000);
  }

  function nextRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.round += 1;
    if (room.round > 5) {
      room.gameEnded = true;
      io.to(roomId).emit("game-ended", room.scores);
      return;
    }
    
    room.submissions = [];
    const wordList = ["bottle", "pen", "cup", "shoe", "book", "chair", "table", "phone", "key", "lamp"];
    const newWord = wordList[Math.floor(Math.random() * wordList.length)];
    io.to(roomId).emit("new-round", { round: room.round, word: newWord });
  }

  socket.on("next-round", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.players.length < 2) return;
    if (!room.players.every(p => p.ready)) return;
    nextRound(roomId);
    room.players.forEach(p => p.ready = false);
    io.to(roomId).emit("room-update", room.players);
  });

  socket.on("send-message", ({ roomId, user, message }) => {
    io.to(roomId).emit("chat-message", { user, message });
  });

  socket.on("disconnecting", () => {
    for (const roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      delete rooms[roomId].scores[socket.id];
      
      // Clean up voting timer if room is empty
      if (rooms[roomId].players.length === 0) {
        if (votingTimers[roomId]) {
          clearTimeout(votingTimers[roomId]);
          delete votingTimers[roomId];
        }
      }
    }
  });

  // KICK PLAYER (admin only)
  socket.on("kick-player", ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room) return;
    // Only admin (first player) can kick
    if (room.players[0]?.id !== socket.id) return;
    // Don't allow kicking self
    if (playerId === socket.id) return;
    // Remove player
    room.players = room.players.filter(p => p.id !== playerId);
    delete room.scores[playerId];
    io.to(roomId).emit("room-update", room.players);
    // Also forcibly disconnect the kicked player from the room
    io.to(playerId).emit("kicked");
    io.to(playerId).socketsLeave(roomId);
  });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../client/dist")));
// For any other requests, send back React's index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

server.listen(3001, () => console.log("Server running on http://localhost:3001"));
