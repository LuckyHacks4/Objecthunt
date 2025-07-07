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
let photoSubmissionTimers = {};
let afkCheckTimers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create-room", ({ roomId, username, roundTime = 60, maxPlayers = 6, sessionId }) => {
    console.log("Create room request:", { roomId, username, socketId: socket.id, roundTime, maxPlayers, sessionId });
    
    // Check for session restoration first
    if (sessionId) {
      for (const [existingRoomId, room] of Object.entries(rooms)) {
        const existingPlayer = room.players.find(p => p.sessionId === sessionId);
        if (existingPlayer) {
          console.log("Session found, restoring player to room:", existingRoomId);
          // Update socket ID for the existing player
          const oldSocketId = existingPlayer.id;
          existingPlayer.id = socket.id;
          existingPlayer.sessionId = sessionId;
          existingPlayer.afk = false; // Mark as not AFK when reconnecting
          existingPlayer.lastActivity = Date.now();
          
          // Update scores mapping
          if (room.scores[oldSocketId] !== undefined) {
            room.scores[socket.id] = room.scores[oldSocketId];
            delete room.scores[oldSocketId];
          }
          
          socket.join(existingRoomId);
          io.to(existingRoomId).emit("session-restored", {
            gameState: room.gameEnded ? "ended" : room.round > 0 ? "playing" : "lobby",
            round: room.round,
            scores: room.scores,
            submissions: room.submissions,
            avatars: room.avatars || {},
            customWords: room.customWords || [],
            roomId: existingRoomId
          });
          io.to(existingRoomId).emit("room-update", room.players);
          return;
        }
      }
      // Session not found, emit invalid session
      socket.emit("session-invalid");
    }
    
    // Generate room code if not provided
    let finalRoomId = roomId;
    if (!finalRoomId) {
      do {
        finalRoomId = generateRoomCode();
      } while (rooms[finalRoomId]);
    }
    
    if (!rooms[finalRoomId]) {
      console.log("Creating new room:", finalRoomId);
      rooms[finalRoomId] = {
        players: [],
        submissions: [],
        round: 0,
        scores: {},
        gameEnded: false,
        roundTime: Number(roundTime),
        maxPlayers: Number(maxPlayers),
        avatars: {},
        customWords: [],
        usedWords: []
      };
    }
    
    // Enforce max players
    if (rooms[finalRoomId].players.length >= rooms[finalRoomId].maxPlayers) {
      socket.emit("room-full");
      return;
    }
    
    // Prevent duplicate player in room
    if (!rooms[finalRoomId].players.find(p => p.id === socket.id)) {
      console.log("Adding player to room:", { username, socketId: socket.id, sessionId });
      const player = { 
        id: socket.id, 
        name: username, 
        ready: false, 
        sessionId,
        afk: false,
        lastActivity: Date.now()
      };
      rooms[finalRoomId].players.push(player);
      rooms[finalRoomId].scores[socket.id] = 0;
    } else {
      console.log("Player already in room:", socket.id);
    }
    
    socket.join(finalRoomId);
    console.log("Room players after join:", rooms[finalRoomId].players);
    io.to(finalRoomId).emit("room-update", rooms[finalRoomId].players);
    
    // Start AFK monitoring for this room
    startAFKMonitoring(finalRoomId);
  });

  function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  socket.on("player-ready", ({ roomId }) => {
    const player = rooms[roomId]?.players.find(p => p.id === socket.id);
    if (player) player.ready = true;
    io.to(roomId).emit("room-update", rooms[roomId].players);
  });

  socket.on("submit-photo", ({ roomId, photoData, timestamp }) => {
    const room = rooms[roomId];
    if (!room) return;
    
    // Check if player already submitted a photo for this round
    const existingSubmission = room.submissions.find(sub => sub.playerId === socket.id);
    if (existingSubmission) {
      console.log("Player already submitted photo for this round:", socket.id);
      return;
    }

    // Update player activity
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.lastActivity = Date.now();
      player.afk = false;
    }
    
    room.submissions.push({ playerId: socket.id, photo: photoData, time: timestamp, votes: [] });
    console.log(`Photo submitted by ${socket.id}. Total submissions: ${room.submissions.length}/${room.players.length}`);
    
    // Check if all active players have submitted
    const activePlayers = room.players.filter(p => !p.afk);
    const activeSubmissions = room.submissions.filter(sub => {
      const submitter = room.players.find(p => p.id === sub.playerId);
      return submitter && !submitter.afk;
    });
    
    if (activeSubmissions.length === activePlayers.length || room.submissions.length === room.players.length) {
      // Clear photo submission timer if it exists
      if (photoSubmissionTimers[roomId]) {
        clearTimeout(photoSubmissionTimers[roomId]);
        delete photoSubmissionTimers[roomId];
      }
      
      startVotingPhase(roomId);
    }
  });

  socket.on("vote", ({ roomId, photoIndex, vote }) => {
    const room = rooms[roomId];
    if (!room) return;
    
    const sub = room.submissions[photoIndex];
    if (!sub) return;
    
    // Update player activity
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.lastActivity = Date.now();
      player.afk = false;
    }
    
    // Prevent voting on own submission
    if (sub.playerId === socket.id) {
      console.log("Player tried to vote on their own submission, ignoring.");
      return;
    }
    
    if (!sub.votes.find(v => v.voter === socket.id)) {
      sub.votes.push({ voter: socket.id, vote });
      
      // Check if all active players have voted
      const activePlayers = room.players.filter(p => !p.afk);
      const activeVoters = activePlayers.filter(p => 
        room.submissions.some(s => s.playerId !== p.id) // Players who can vote (not their own submission)
      );
      
      const totalVotesNeeded = activeVoters.length * room.submissions.length;
      const totalVotesCast = room.submissions.reduce((total, sub) => {
        return total + sub.votes.filter(v => {
          const voter = room.players.find(p => p.id === v.voter);
          return voter && !voter.afk;
        }).length;
      }, 0);
      
      if (totalVotesCast >= totalVotesNeeded) {
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
    
    // Start photo submission timer for this round
    startPhotoSubmissionTimer(roomId);
    
    // Initialize used words if not exists
    if (!room.usedWords) room.usedWords = [];
    
    const wordList = [
      // Simple household items that can be picked up
      "pen", "pencil", "book", "paper", "notebook", "ruler", "eraser", "marker", "crayon", "scissors",
      "tape", "glue", "stapler", "paperclip", "rubber band", "sticker", "envelope", "stamp", "card", "photo",
      
      // Kitchen items (portable)
      "spoon", "fork", "knife", "plate", "bowl", "cup", "mug", "glass", "bottle", "can",
      "apple", "banana", "orange", "cookie", "bread", "egg", "salt", "pepper", "napkin", "tissue",
      
      // Clothing & accessories
      "shoe", "sock", "shirt", "hat", "cap", "glove", "scarf", "belt", "tie", "watch",
      "glasses", "sunglasses", "ring", "necklace", "bracelet", "earring", "wallet", "purse", "bag", "backpack",
      
      // Personal care items
      "toothbrush", "toothpaste", "soap", "shampoo", "brush", "comb", "mirror", "towel", "tissue", "lotion",
      "perfume", "deodorant", "razor", "nail clipper", "makeup", "lipstick", "powder", "cream", "bandaid", "medicine",
      
      // Electronics (small/portable)
      "phone", "remote", "headphones", "charger", "mouse", "keyboard", "cable", "battery", "flashlight", "calculator",
      "camera", "game", "cd", "dvd", "usb", "speaker", "microphone", "earbuds", "tablet", "laptop",
      
      // Toys & games
      "ball", "toy", "doll", "car", "truck", "puzzle", "card", "dice", "coin", "marble",
      "yo-yo", "slinky", "blocks", "lego", "action figure", "stuffed animal", "balloon", "kite", "frisbee", "jump rope",
      
      // Office/school supplies
      "folder", "binder", "clipboard", "calendar", "planner", "highlighter", "whiteboard marker", "chalk", "pushpin", "thumbtack",
      
      // Tools (simple/small)
      "hammer", "screwdriver", "wrench", "nail", "screw", "key", "lock", "flashlight", "tape measure", "level",
      
      // Bathroom items
      "cup", "bottle", "container", "jar", "tube", "spray bottle", "cotton ball", "q-tip", "tweezers", "nail file",
      
      // Bedroom items
      "pillow", "blanket", "sheet", "pillowcase", "alarm clock", "lamp", "candle", "picture frame", "book", "magazine",
      
      // Kitchen utensils
      "spatula", "whisk", "ladle", "tongs", "can opener", "bottle opener", "measuring cup", "timer", "oven mitt", "pot holder",
      
      // Cleaning supplies
      "sponge", "cloth", "paper towel", "spray bottle", "brush", "dustpan", "gloves", "bucket", "mop", "broom",
      
      // Art supplies
      "paint", "paintbrush", "colored pencil", "chalk", "charcoal", "canvas", "sketchbook", "palette", "easel", "frame",
      
      // Garden items (small)
      "flower", "plant", "seed", "watering can", "gloves", "small shovel", "pruners", "pot", "fertilizer", "soil",
      
      // Sports items (portable)
      " ball", "racket", "bat", "glove", "helmet",, "water bottle", "towel", "whistle", "stopwatch", "medal",
      
      // Food items
      "cereal", "milk", "juice", "water", "soda", "coffee", "tea", "sugar", "honey", "jam",
      "peanut butter", "crackers", "chips", "candy", "chocolate", "gum", "mint", "lemon", "lime", "grape",
      
      // Miscellaneous portable items
      "box", "bag", "container", "basket", "jar", "bottle", "tube", "stick", "string", "rope",
      "wire", "chain", "hook", "clip", "pin", "button", "zipper", "velcro", "magnet", "sticker"
    ];
    
    // Combine regular words with custom words
    let allWords = [...wordList];
    if (room.customWords && room.customWords.length > 0) {
      allWords = [...allWords, ...room.customWords];
    }
    
    // Filter out used words
    const availableWords = allWords.filter(word => !room.usedWords.includes(word));
    
    // If all words used, reset the used words list
    if (availableWords.length === 0) {
      room.usedWords = [];
    }
    
    // Ensure at least 2 custom words are used in a 5-round game
    let newWord;
    if (room.round <= 2 && room.customWords && room.customWords.length > 0) {
      // For first 2 rounds, prioritize custom words
      const availableCustomWords = room.customWords.filter(word => !room.usedWords.includes(word));
      if (availableCustomWords.length > 0) {
        newWord = availableCustomWords[Math.floor(Math.random() * availableCustomWords.length)];
      } else {
        newWord = availableWords[Math.floor(Math.random() * availableWords.length)];
      }
    } else {
      newWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    }
    
    room.usedWords.push(newWord);
    
    io.to(roomId).emit("new-round", { round: room.round, word: newWord });
  }

  socket.on("next-round", (data) => {
    const { roomId, customWords } = data;
    const room = rooms[roomId];
    if (!room) return;
    if (room.players.length < 2) return;
    if (!room.players.every(p => p.ready)) return;
    
    // Store custom words in room
    if (customWords && customWords.length > 0) {
      room.customWords = customWords;
    }
    
    nextRound(roomId);
    room.players.forEach(p => p.ready = false);
    io.to(roomId).emit("room-update", room.players);
  });

  socket.on("send-message", ({ roomId, user, message }) => {
    io.to(roomId).emit("chat-message", { user, message });
  });

  socket.on("update-avatar", ({ roomId, avatarData }) => {
    const room = rooms[roomId];
    if (!room) return;
    
    // Store avatar in room data
    if (!room.avatars) room.avatars = {};
    room.avatars[socket.id] = avatarData;
    
    // Broadcast avatar update to all players in room
    io.to(roomId).emit("avatar-updated", { playerId: socket.id, avatarData });
  });

  socket.on("reset-game", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    
    // Reset game state
    room.round = 0;
    room.scores = {};
    room.submissions = [];
    room.gameEnded = false;
    room.usedWords = [];
    
    // Reset all players to not ready
    room.players.forEach(player => {
      player.ready = false;
      room.scores[player.id] = 0;
    });
    
    // Broadcast reset to all players
    io.to(roomId).emit("game-reset", room.players);
  });

  socket.on("disconnecting", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const disconnectedPlayer = room.players.find(p => p.id === socket.id);
      
      if (disconnectedPlayer) {
        // Mark as AFK instead of removing immediately
        disconnectedPlayer.afk = true;
        disconnectedPlayer.lastActivity = Date.now() - (6 * 60 * 1000);
        console.log(`Player ${disconnectedPlayer.name} disconnected, marked as AFK`);
        
        // Remove after 10 minutes if not reconnected
        setTimeout(() => {
          const currentPlayer = room.players.find(p => p.sessionId === disconnectedPlayer.sessionId);
          if (currentPlayer && currentPlayer.afk && (Date.now() - currentPlayer.lastActivity) > 10 * 60 * 1000) {
            room.players = room.players.filter(p => p.sessionId !== disconnectedPlayer.sessionId);
            delete room.scores[currentPlayer.id];
            io.to(roomId).emit("room-update", room.players);
            console.log(`Player ${disconnectedPlayer.name} removed after 10 minutes of inactivity`);
          }
        }, 10 * 60 * 1000);
      }
      
      // Clean up voting timer if room is empty
      if (room.players.length === 0) {
        if (votingTimers[roomId]) {
          clearTimeout(votingTimers[roomId]);
          delete votingTimers[roomId];
        }
        if (photoSubmissionTimers[roomId]) {
          clearTimeout(photoSubmissionTimers[roomId]);
          delete photoSubmissionTimers[roomId];
        }
        if (afkCheckTimers[roomId]) {
          clearTimeout(afkCheckTimers[roomId]);
          delete afkCheckTimers[roomId];
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

  // AFK and ping handlers
  socket.on("ping", () => {
    // Simple ping response to keep connection alive
    socket.emit("pong");
  });

  socket.on("user-afk", ({ roomId, socketId }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socketId);
    if (player) {
      player.afk = true;
      player.lastActivity = Date.now() - (6 * 60 * 1000); // Mark as 6 minutes ago
      io.to(roomId).emit("room-update", room.players);
      console.log(`Player ${player.name} is now AFK`);
      
      // Check if we need to advance the game
      checkGameProgression(roomId);
    }
  });

  socket.on("user-activity", ({ roomId, socketId }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socketId || p.id === socket.id);
    if (player) {
      player.afk = false;
      player.lastActivity = Date.now();
      io.to(roomId).emit("room-update", room.players);
      console.log(`Player ${player.name} is back from AFK`);
    }
  });

  socket.on("voting-timeout", ({ roomId }) => {
    console.log("Voting timeout triggered for room:", roomId);
    if (votingTimers[roomId]) {
      clearTimeout(votingTimers[roomId]);
      delete votingTimers[roomId];
    }
    processVotingResults(roomId);
  });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../client/dist")));

// For any other requests, send back React's index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

// Use PORT from environment variable (for Render) or default to 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Helper functions for enhanced AFK handling
function startAFKMonitoring(roomId) {
  if (afkCheckTimers[roomId]) {
    clearTimeout(afkCheckTimers[roomId]);
  }
  
  const checkAFK = () => {
    const room = rooms[roomId];
    if (!room) return;
    
    const now = Date.now();
    let playersUpdated = false;
    
    room.players.forEach(player => {
      const timeSinceActivity = now - (player.lastActivity || now);
      if (timeSinceActivity > 3 * 60 * 1000 && !player.afk) { // 3 minutes for AFK
        player.afk = true;
        playersUpdated = true;
        console.log(`Player ${player.name} marked as AFK due to inactivity`);
      }
    });
    
    if (playersUpdated) {
      io.to(roomId).emit("room-update", room.players);
      checkGameProgression(roomId);
    }
    
    // Schedule next check
    afkCheckTimers[roomId] = setTimeout(checkAFK, 30000); // Check every 30 seconds
  };
  
  afkCheckTimers[roomId] = setTimeout(checkAFK, 30000);
}

function checkGameProgression(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  // If we're in playing phase and waiting for photo submissions
  if (room.round > 0 && room.submissions.length < room.players.length) {
    const activePlayers = room.players.filter(p => !p.afk);
    const activeSubmissions = room.submissions.filter(sub => {
      const submitter = room.players.find(p => p.id === sub.playerId);
      return submitter && !submitter.afk;
    });
    
    if (activeSubmissions.length === activePlayers.length && activePlayers.length > 0) {
      // All active players have submitted, start voting
      if (photoSubmissionTimers[roomId]) {
        clearTimeout(photoSubmissionTimers[roomId]);
        delete photoSubmissionTimers[roomId];
      }
      startVotingPhase(roomId);
    }
  }
}

function startVotingPhase(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  io.to(roomId).emit("start-voting", room.submissions);
  
  // Start voting countdown timer (30 seconds for voting)
  if (votingTimers[roomId]) {
    clearTimeout(votingTimers[roomId]);
  }
  votingTimers[roomId] = setTimeout(() => {
    processVotingResults(roomId);
  }, 30 * 1000);
}

function startPhotoSubmissionTimer(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  // Give players 90 seconds to submit photos, then proceed with active players
  photoSubmissionTimers[roomId] = setTimeout(() => {
    console.log(`Photo submission time limit reached for room ${roomId}`);
    const activePlayers = room.players.filter(p => !p.afk);
    const activeSubmissions = room.submissions.filter(sub => {
      const submitter = room.players.find(p => p.id === sub.playerId);
      return submitter && !submitter.afk;
    });
    
    if (activeSubmissions.length > 0) {
      startVotingPhase(roomId);
    } else {
      // No submissions, skip to next round
      setTimeout(() => {
        nextRound(roomId);
      }, 3000);
    }
  }, 90 * 1000); // 90 seconds
}
