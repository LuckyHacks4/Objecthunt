// === Enhanced Visuals and Transitions for Object Hunt ===
// Adds transitions, animations, and visual polish to improve addictiveness and UX.

import { useEffect, useRef, useState } from "react";
import socket from "./socket";
import shutterSoundFile from "./sounds/shutter.mp3.mp3";
import voteSoundFile from "./sounds/vote.mp3.mp3";
import endSoundFile from "./sounds/end.mp3.mp3";
import { motion, AnimatePresence } from "framer-motion";
import logo from "./logo.png";
import bg from "./bg.png";

const App = () => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [players, setPlayers] = useState([]);
  const [currentWord, setCurrentWord] = useState("");
  const [round, setRound] = useState(0);
  const [gameState, setGameState] = useState("lobby"); // lobby, playing, voting, ended
  const [submissions, setSubmissions] = useState([]);
  const [scores, setScores] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [photoData, setPhotoData] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [showRoundResults, setShowRoundResults] = useState(false);
  const [lastRoundScores, setLastRoundScores] = useState({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [votingTimeLeft, setVotingTimeLeft] = useState(30);
  const [myVotes, setMyVotes] = useState(new Set());
  const [votingProgress, setVotingProgress] = useState({});
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [mySocketId, setMySocketId] = useState(null);
  const [roundTime, setRoundTime] = useState(60);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [hasSubmittedPhoto, setHasSubmittedPhoto] = useState(false);
  const [photoSubmitted, setPhotoSubmitted] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [playerAvatars, setPlayerAvatars] = useState({});
  const [showAvatarCamera, setShowAvatarCamera] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(3);
  
  const videoRef = useRef();
  const canvasRef = useRef();
  const shutterSound = useRef();
  const voteSound = useRef();
  const endSound = useRef();

  // Initialize sounds
  useEffect(() => {
    shutterSound.current = new Audio(shutterSoundFile);
    voteSound.current = new Audio(voteSoundFile);
    endSound.current = new Audio(endSoundFile);
    
    // Preload sounds
    shutterSound.current.load();
    voteSound.current.load();
    endSound.current.load();
    
    // Set volume
    shutterSound.current.volume = 0.5;
    voteSound.current.volume = 0.5;
    endSound.current.volume = 0.5;
    
    // Play loading sound
    const playLoadingSound = () => {
      try {
        // Create a simple beep sound for loading
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.log("Could not play loading sound:", error);
      }
    };
    
    // Play loading sound after a short delay
    setTimeout(playLoadingSound, 500);
  }, []);

  useEffect(() => {
    // Check for room parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      setRoomId(roomFromUrl);
      // Auto-join the room if username is provided
      const usernameFromUrl = urlParams.get('username');
      if (usernameFromUrl) {
        setUsername(usernameFromUrl);
      }
    }

    // Initial loading screen
    setTimeout(() => {
      setShowLoading(false);
    }, 2000);

    console.log("Initial socket ID:", socket.id);
    setMySocketId(socket.id);
    socket.on("connect", () => {
      console.log("Socket connected, new ID:", socket.id);
      setMySocketId(socket.id);
    });
    return () => {
      socket.off("connect");
    };
  }, []);

  useEffect(() => {
    socket.on("room-update", (updatedPlayers) => {
      console.log("Room update received:", updatedPlayers);
      console.log("My socket ID:", mySocketId);
      setPlayers(updatedPlayers);
      if (!joinedRoom) {
        console.log("Setting joinedRoom to true");
        setJoinedRoom(true);
      }
      const me = updatedPlayers.find(p => p.id === mySocketId);
      console.log("Found me in players:", me);
      setIsReady(!!me?.ready);
    });

    socket.on("new-round", ({ round: newRound, word }) => {
      setRound(newRound);
      setCurrentWord(word);
      setGameState("playing");
      setTimeLeft(60);
      setSubmissions([]);
      setMyVotes(new Set());
      setVotingProgress({});
      setShowRoundResults(false);
      setHasSubmittedPhoto(false);
      setPhotoSubmitted(false);
      
      // Show countdown before starting
      setShowCountdown(true);
      setCountdownNumber(3);
      
      const countdownInterval = setInterval(() => {
        setCountdownNumber(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowCountdown(false);
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Auto-scroll to top for mobile
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    });

    socket.on("start-voting", (subs) => {
      setSubmissions(subs);
      setGameState("voting");
      setVotingTimeLeft(30);
      setMyVotes(new Set());
      setVotingProgress({});
      voteSound.current.play();
    });

    socket.on("score-update", (newScores) => {
      setLastRoundScores(newScores);
      setShowRoundResults(true);
      setTimeout(() => {
        setShowRoundResults(false);
      }, 2500);
      setScores(newScores);
    });

    socket.on("game-ended", (finalScores) => {
      setScores(finalScores);
      setGameState("ended");
      endSound.current.play();
    });

    socket.on("chat-message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on("room-full", () => {
      alert("Room is full. Cannot join.");
      window.location.reload();
    });

    socket.on("kicked", () => {
      alert("You have been kicked from the room.");
      window.location.reload();
    });

    socket.on("avatar-updated", ({ playerId, avatarData }) => {
      setPlayerAvatars(prev => ({ ...prev, [playerId]: avatarData }));
    });

    return () => {
      socket.off("room-update");
      socket.off("new-round");
      socket.off("start-voting");
      socket.off("score-update");
      socket.off("game-ended");
      socket.off("chat-message");
      socket.off("avatar-updated");
    };
  }, [joinedRoom, mySocketId]);

  useEffect(() => {
    let timer;
    if (gameState === "playing" && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, gameState]);

  useEffect(() => {
    let timer;
    if (gameState === "voting" && votingTimeLeft > 0) {
      timer = setTimeout(() => setVotingTimeLeft(votingTimeLeft - 1), 1000);
    } else if (gameState === "voting" && votingTimeLeft === 0) {
      // Play timeout sound
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.log("Could not play timeout sound:", error);
      }
    }
    return () => clearTimeout(timer);
  }, [votingTimeLeft, gameState]);

  // --- CAMERA LOGIC ---
  useEffect(() => {
    if (showCamera || showAvatarCamera) {
      document.body.classList.add('modal-open');
      // Camera stream is handled by startCamera and startAvatarCamera functions
    } else {
      // Clean up camera stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      document.body.classList.remove('modal-open');
    }
  }, [showCamera, showAvatarCamera, cameraStream]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const createRoom = () => {
    if (!username.trim() || !roomId.trim()) return;
    console.log("Creating room:", { roomId, username, socketId: mySocketId, roundTime, maxPlayers });
    socket.emit("create-room", { roomId, username, roundTime, maxPlayers });
    setJoinedRoom(true);
  };

  const joinRoom = () => {
    if (!username.trim() || !roomId.trim()) return;
    socket.emit("create-room", { roomId, username });
    setGameState("lobby");
  };

  const startGame = () => {
    socket.emit("next-round", roomId);
  };

  const exitLobby = () => {
    window.location.reload();
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    
    const photoData = canvas.toDataURL("image/jpeg");
    setPhotoData(photoData);
    shutterSound.current.play();
    
    // Show confirmation
    setPhotoSubmitted(true);
    setHasSubmittedPhoto(true);
    
    socket.emit("submit-photo", {
      roomId,
      photoData,
      timestamp: Date.now()
    });
    
    setShowCamera(false);
    
    // Hide confirmation after 3 seconds
    setTimeout(() => {
      setPhotoSubmitted(false);
    }, 3000);
  };

  const vote = (photoIndex, vote) => {
    if (myVotes.has(photoIndex)) return; // Prevent double voting
    
    socket.emit("vote", { roomId, photoIndex, vote });
    setMyVotes(prev => new Set([...prev, photoIndex]));
    
    // Update voting progress
    setVotingProgress(prev => ({
      ...prev,
      [photoIndex]: (prev[photoIndex] || 0) + 1
    }));
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    socket.emit("send-message", { roomId, user: username, message: newMessage });
    setNewMessage("");
  };

  const startCamera = async () => {
    if (hasSubmittedPhoto) {
      alert("You have already submitted a photo for this round!");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const startAvatarCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', // Always start with front camera for avatar
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowAvatarCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const flipCamera = async () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setFacingMode(facingMode === 'user' ? 'environment' : 'user');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode === 'user' ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error flipping camera:", err);
    }
  };

  const takeAvatarPhoto = async () => {
    if (!videoRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    
    // Crop to focus on face (center 60% of the image)
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    
    const cropSize = Math.min(canvas.width, canvas.height) * 0.6;
    const cropX = (canvas.width - cropSize) / 2;
    const cropY = (canvas.height - cropSize) / 2;
    
    croppedCanvas.width = cropSize;
    croppedCanvas.height = cropSize;
    croppedCtx.drawImage(canvas, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize);
    
    const avatarData = croppedCanvas.toDataURL("image/jpeg");
    setPlayerAvatars(prev => ({ ...prev, [mySocketId]: avatarData }));
    
    // Send avatar to server so other players can see it
    socket.emit("update-avatar", { roomId, avatarData });
    
    setShowAvatarCamera(false);
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // --- READY BUTTON ---
  const handleReady = () => {
    socket.emit("player-ready", { roomId });
    setIsReady(true);
  };

  const handleKick = (playerId) => {
    socket.emit("kick-player", { roomId, playerId });
  };

  // --- THEMED HEADER ---
  const renderHeader = () => (
    <header className="w-full flex items-center justify-center py-8" style={{background: 'transparent'}}>
      <img src={logo} alt="Object Hunt Logo" className="h-20 drop-shadow-xl" />
    </header>
  );

  // --- LOBBY ---
  const renderLobby = () => {
    // Determine if current user is admin (host)
    const isAdmin = players.length > 0 && players[0].id === mySocketId;
    const shareUrl = `${window.location.origin}?room=${roomId}&username=${encodeURIComponent(username)}`;
    
    const copyShareLink = () => {
      navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`min-h-screen flex flex-col items-center justify-center p-4`}
      >
        {renderHeader()}
        <div className={`${orangeOverlay} rounded-3xl p-10 max-w-md w-full`}>
          <h1 className="text-3xl font-bold text-center mb-8 text-primary-dark drop-shadow">Welcome to Object Hunt</h1>
          {!joinedRoom ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border-2 border-primary-light rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-accent/40 text-secondary"
              />
              <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-3 border-2 border-primary-light rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-accent/40 text-secondary"
              />
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-primary-dark text-sm font-semibold mb-1">Per-round time (seconds)</label>
                  <select
                    value={roundTime}
                    onChange={e => setRoundTime(Number(e.target.value))}
                    className="w-full p-2 border-2 border-primary-light rounded-lg bg-accent/40 text-secondary"
                  >
                    <option value={30}>30</option>
                    <option value={45}>45</option>
                    <option value={60}>60</option>
                    <option value={90}>90</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-primary-dark text-sm font-semibold mb-1">Max players</label>
                  <input
                    type="number"
                    min={2}
                    max={12}
                    value={maxPlayers}
                    onChange={e => setMaxPlayers(Number(e.target.value))}
                    className="w-full p-2 border-2 border-primary-light rounded-lg bg-accent/40 text-secondary"
                  />
                </div>
              </div>
              <button
                onClick={createRoom}
                className={`w-full ${orangeButton}`}
              >
                Create/Join Room
              </button>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-primary-dark">Players in Room:</h3>
              <div className="space-y-2 mb-4">
                {players.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-2 bg-accent rounded-xl border border-primary-light">
                    <div className="flex items-center space-x-3">
                      {playerAvatars[player.id] ? (
                        <img 
                          src={playerAvatars[player.id]} 
                          alt="Avatar" 
                          className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                          👤
                        </div>
                      )}
                      <span className="font-bold text-secondary">{player.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-sm ${player.ready ? 'bg-primary text-white' : 'bg-gray-300 text-secondary'}`}>
                        {player.ready ? 'Ready' : 'Not Ready'}
                      </span>
                      {player.id === mySocketId && !player.ready && (
                        <button onClick={handleReady} className={`${orangeButtonOutline} px-3 py-1 text-sm`}>Ready</button>
                      )}
                      {isAdmin && player.id !== mySocketId && (
                        <button onClick={() => handleKick(player.id)} className="text-xs text-red-600 font-bold px-2 py-1 rounded border border-red-300 hover:bg-red-100">Kick</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Avatar button for current user */}
              {!playerAvatars[mySocketId] && (
                <button
                  onClick={startAvatarCamera}
                  className={`w-full mb-4 ${orangeButtonOutline}`}
                >
                  📸 Take Avatar Photo
                </button>
              )}
              
              {players.length >= 2 && players.every(p => p.ready) && isAdmin && (
                <button
                  onClick={startGame}
                  className={`w-full mt-4 ${orangeButton}`}
                >
                  Start Game
                </button>
              )}
              
              {/* Share section */}
              <div className="mt-4 p-3 bg-accent rounded-lg">
                <div className="text-center text-primary-dark text-sm mb-2">Share with friends:</div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 p-2 text-xs border border-primary-light rounded bg-white"
                  />
                  <button
                    onClick={copyShareLink}
                    className={`px-3 py-2 ${orangeButton} text-sm`}
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-primary-dark text-center">
                Per-round time: <b>{roundTime}s</b> | Max players: <b>{maxPlayers}</b>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // --- THEME CLASSES ---
  const orangeBg = ""; // No gradient, just use the background image
  const orangeOverlay = "bg-white/95 border-2 border-primary shadow-xl";
  const orangeButton = "bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow transition-colors";
  const orangeButtonOutline = "border-2 border-primary text-primary font-bold py-3 rounded-xl bg-white hover:bg-primary-light transition-colors";

  // --- GAME ---
  const renderGame = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen p-4 flex flex-col items-center justify-center`}
    >
      <div className="max-w-4xl mx-auto w-full">
        <div className={`${orangeOverlay} rounded-lg p-6 mb-4`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-primary-dark">Round {round}/5</h2>
            <div className="text-xl font-semibold text-primary-dark">Time: {timeLeft}s</div>
          </div>
          <div className="text-center mb-6">
            <h3 className="text-3xl font-bold text-primary mb-2">Find this object:</h3>
            <div className="text-4xl font-bold text-secondary bg-accent p-4 rounded-lg">
              {currentWord}
            </div>
          </div>
          <div className="flex justify-center">
            {hasSubmittedPhoto ? (
              <div className="text-center">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-lg font-semibold text-primary-dark">Photo Submitted!</div>
                <div className="text-sm text-primary-dark">Waiting for other players...</div>
              </div>
            ) : (
              <button
                onClick={startCamera}
                className={`${orangeButton} px-8 text-lg`}
              >
                📸 Take Photo
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${orangeOverlay} rounded-lg p-6`}>
            <h3 className="text-xl font-semibold mb-4 text-primary-dark">Players & Scores</h3>
            <div className="space-y-2">
              {players
                .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
                .map((player, index) => {
                  const isTopPlayer = index === 0 && (scores[player.id] || 0) > 0;
                  return (
                    <div key={player.id} className="flex justify-between items-center p-2 bg-accent rounded relative">
                      <div className="flex items-center space-x-3">
                        {isTopPlayer && (
                          <div className="absolute -top-1 -left-1 text-2xl">👑</div>
                        )}
                        {playerAvatars[player.id] ? (
                          <img 
                            src={playerAvatars[player.id]} 
                            alt="Avatar" 
                            className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                            👤
                          </div>
                        )}
                        <span className="font-bold text-secondary">{player.name}</span>
                      </div>
                      <span className="text-primary-dark font-semibold">{scores[player.id] || 0} pts</span>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className={`${orangeOverlay} rounded-lg p-6`}>
            <h3 className="text-xl font-semibold mb-4 text-primary-dark">Chat</h3>
            <div className="h-48 overflow-y-auto mb-4 space-y-2">
              {messages.map((msg, index) => (
                <div key={index} className="p-2 bg-accent rounded">
                  <span className="font-semibold text-primary-dark">{msg.user}:</span> {msg.message}
                </div>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 p-2 border border-primary-light rounded-l-lg focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={sendMessage}
                className={`${orangeButton} px-4 py-2 rounded-l-none rounded-r-lg`}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // --- VOTING ---
  const renderVoting = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen p-4 flex flex-col items-center justify-center`}
    >
      <div className="max-w-6xl mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary-dark mb-4">Vote on the Photos!</h2>
          <div className="bg-accent rounded-lg p-4 inline-block border-2 border-primary">
            <div className="text-2xl font-bold text-primary-dark">Time Left: {votingTimeLeft}s</div>
            <div className="w-full bg-primary-light rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(votingTimeLeft / 30) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((submission, index) => {
            const player = players.find(p => p.id === submission.playerId);
            const hasVoted = myVotes.has(index);
            const voteCount = votingProgress[index] || 0;
            const totalVoters = players.length - 1;
            const isOwnSubmission = submission.playerId === mySocketId;
            return (
              <motion.div
                key={index}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`bg-white rounded-lg shadow-xl overflow-hidden border-2 border-primary ${hasVoted ? 'ring-2 ring-primary-dark' : ''}`}
              >
                <div className="relative">
                  <img 
                    src={submission.photo} 
                    alt="Submission" 
                    className="w-full h-40 sm:h-48 object-contain bg-gray-100"
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    {player?.name || 'Unknown'}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2 text-primary-dark">{player?.name || 'Unknown'}</h3>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-primary-dark mb-1">
                      <span>Votes: {voteCount}/{totalVoters}</span>
                      <span>{hasVoted ? '✅ Voted' : '⏳ Waiting'}</span>
                    </div>
                    <div className="w-full bg-primary-light rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(voteCount / totalVoters) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {isOwnSubmission ? (
                      <div className="flex-1 text-center text-primary-dark font-semibold opacity-60 py-2">You can't vote your own photo</div>
                    ) : (
                      <>
                        <button
                          onClick={() => vote(index, "yes")}
                          disabled={hasVoted}
                          className={`flex-1 py-2 rounded transition-colors ${hasVoted ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : orangeButton}`}
                        >
                          👍 Yes
                        </button>
                        <button
                          onClick={() => vote(index, "no")}
                          disabled={hasVoted}
                          className={`flex-1 py-2 rounded transition-colors ${hasVoted ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : orangeButtonOutline}`}
                        >
                          👎 No
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {votingTimeLeft <= 5 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="fixed top-4 right-4 bg-primary-dark text-white px-6 py-3 rounded-lg shadow-lg"
          >
            ⏰ Voting ends in {votingTimeLeft}s!
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  // --- GAME END ---
  const renderGameEnd = () => {
    const isHost = players.length > 0 && players[0].id === mySocketId;
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`min-h-screen flex items-center justify-center p-4`}
      >
        <div className={`${orangeOverlay} rounded-lg p-8 max-w-2xl w-full`}>
          <h2 className="text-4xl font-bold text-center mb-8 text-primary-dark">Game Over!</h2>
          <div className="space-y-4">
            {Object.entries(scores)
              .sort(([,a], [,b]) => b - a)
              .map(([playerId, score], index) => {
                const player = players.find(p => p.id === playerId);
                return (
                  <motion.div
                    key={playerId}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex justify-between items-center p-4 rounded-lg ${index === 0 ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-100'}`}
                  >
                    <span className="text-lg font-semibold text-primary-dark">
                      {index + 1}. {player?.name || 'Unknown'}
                    </span>
                    <span className="text-xl font-bold text-primary-dark">{score} points</span>
                  </motion.div>
                );
              })}
          </div>
          <div className="mt-6 space-y-3">
            {isHost ? (
              <button
                onClick={startGame}
                className={`w-full ${orangeButton}`}
              >
                Start New Game
              </button>
            ) : (
              <div className="text-center">
                <p className="text-primary-dark mb-3">Waiting for host to start a new game...</p>
                <button
                  onClick={exitLobby}
                  className={`w-full ${orangeButtonOutline}`}
                >
                  Exit Lobby
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // --- ROUND RESULTS MODAL ---
  const renderRoundResults = () => (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
      <div className={`${orangeOverlay} rounded-2xl p-8 max-w-md w-full text-center`}>
        <h2 className="text-2xl font-bold mb-4 text-primary-dark">Round Results</h2>
        <div className="space-y-2">
          {Object.entries(lastRoundScores)
            .sort(([,a], [,b]) => b - a)
            .map(([playerId, score], idx) => {
              const player = players.find(p => p.id === playerId);
              return (
                <div key={playerId} className={`flex justify-between items-center p-2 rounded-lg ${idx === 0 ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-100'}`}>
                  <span className="font-semibold text-primary-dark">{player?.name || 'Unknown'}</span>
                  <span className="font-bold text-primary-dark">{score} pts</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );

  // --- LOADING SCREEN ---
  const renderLoadingScreen = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center z-50"
    >
      <div className="text-center">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 360]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-8"
        >
          <img src={logo} alt="Object Hunt Logo" className="h-32 mx-auto drop-shadow-2xl" />
        </motion.div>
        <motion.h1 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-4xl font-bold text-white mb-4 drop-shadow-lg"
        >
          Object Hunt
        </motion.h1>
        <motion.div
          animate={{ width: [0, 200, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-2 bg-white rounded-full mx-auto"
        />
        <motion.p
          animate={{ opacity: [0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
          className="text-white mt-4 text-lg"
        >
          Loading...
        </motion.p>
      </div>
    </motion.div>
  );

  // --- COUNTDOWN SCREEN ---
  const renderCountdown = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
    >
      <div className="text-center">
        <motion.div
          key={countdownNumber}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          className="text-8xl font-bold text-white mb-4"
        >
          {countdownNumber}
        </motion.div>
        <motion.p
          animate={{ opacity: [0.5, 1] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="text-2xl text-white"
        >
          Get Ready!
        </motion.p>
      </div>
    </motion.div>
  );

  // --- CAMERA MODAL ---
  const renderCamera = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${orangeOverlay} rounded-lg p-4 max-w-md w-full`}>
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg mb-4"
          />
          <button
            onClick={flipCamera}
            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
          >
            🔄
          </button>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div className="flex space-x-4">
          <button
            onClick={takePhoto}
            className={`flex-1 ${orangeButton}`}
          >
            📸 Take Photo
          </button>
          <button
            onClick={() => setShowCamera(false)}
            className={`flex-1 ${orangeButtonOutline}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // --- AVATAR CAMERA MODAL ---
  const renderAvatarCamera = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${orangeOverlay} rounded-lg p-4 max-w-md w-full`}>
        <h3 className="text-lg font-semibold mb-4 text-center text-primary-dark">Take Your Avatar Photo</h3>
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg mb-4"
          />
          <button
            onClick={flipCamera}
            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
          >
            🔄
          </button>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div className="flex space-x-4">
          <button
            onClick={takeAvatarPhoto}
            className={`flex-1 ${orangeButton}`}
          >
            📸 Set Avatar
          </button>
          <button
            onClick={() => setShowAvatarCamera(false)}
            className={`flex-1 ${orangeButtonOutline}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // --- MAIN RENDER ---
  return (
    <div
      className="App min-h-screen font-sans relative"
      style={{
        minHeight: '100vh',
        width: '100vw',
        overflowX: 'hidden',
      }}
    >
      {/* Fixed background image */}
      <div
        style={{
          backgroundImage: `url(${bg})`,
          backgroundColor: '#ff9800',
          backgroundRepeat: 'repeat',
          backgroundSize: 'cover',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
        }}
      />
      {/* Orange overlay for readability */}
      <div className="fixed inset-0" style={{background: 'rgba(255, 152, 0, 0.80)', zIndex: 1}} />

      <div className="relative z-10">
        <AnimatePresence>
          {showLoading && renderLoadingScreen()}
        </AnimatePresence>
        
        {!showLoading && (
          <>
            {gameState !== "lobby" && renderHeader()}
            {showCamera && renderCamera()}
            {showAvatarCamera && renderAvatarCamera()}
            {showRoundResults && renderRoundResults()}
            {showCountdown && renderCountdown()}
            {photoSubmitted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50"
              >
                ✅ Photo submitted successfully!
              </motion.div>
            )}
            {gameState === "lobby" && renderLobby()}
            {gameState === "playing" && renderGame()}
            {gameState === "voting" && renderVoting()}
            {gameState === "ended" && renderGameEnd()}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
