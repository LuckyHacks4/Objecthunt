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
    
    // Check if player already submitted a photo for this round
    const existingSubmission = room.submissions.find(sub => sub.playerId === socket.id);
    if (existingSubmission) {
      console.log("Player already submitted photo for this round:", socket.id);
      return;
    }
    
    room.submissions.push({ playerId: socket.id, photo: photoData, time: timestamp, votes: [] });
    console.log(`Photo submitted by ${socket.id}. Total submissions: ${room.submissions.length}/${room.players.length}`);
    
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

// Use PORT from environment variable (for Render) or default to 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
