// === Enhanced Visuals and Transitions for Object Hunt ===
// Adds transitions, animations, and visual polish to improve addictiveness and UX.

import { useEffect, useRef, useState } from "react";
import socket from "./socket";
import shutterSoundFile from "./sounds/shutter.mp3";
import voteSoundFile from "./sounds/vote.mp3";
import endSoundFile from "./sounds/end.mp3";
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
  
  const videoRef = useRef();
  const canvasRef = useRef();
  const shutterSound = useRef(new Audio(shutterSoundFile));
  const voteSound = useRef(new Audio(voteSoundFile));
  const endSound = useRef(new Audio(endSoundFile));

  useEffect(() => {
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

    return () => {
      socket.off("room-update");
      socket.off("new-round");
      socket.off("start-voting");
      socket.off("score-update");
      socket.off("game-ended");
      socket.off("chat-message");
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
    }
    return () => clearTimeout(timer);
  }, [votingTimeLeft, gameState]);

  // --- CAMERA LOGIC ---
  useEffect(() => {
    if (showCamera) {
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
        }
      })();
    } else {
      // Clean up camera stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
  }, [showCamera]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
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
    
    socket.emit("submit-photo", {
      roomId,
      photoData,
      timestamp: Date.now()
    });
    
    setShowCamera(false);
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
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
                    <span className="font-bold text-secondary">{player.name}</span>
                    <span className={`px-2 py-1 rounded text-sm ${player.ready ? 'bg-primary text-white' : 'bg-gray-300 text-secondary'}`}>
                      {player.ready ? 'Ready' : 'Not Ready'}
                    </span>
                    {player.id === mySocketId && !player.ready && (
                      <button onClick={handleReady} className={`ml-2 ${orangeButtonOutline} px-3 py-1 text-sm`}>Ready</button>
                    )}
                    {isAdmin && player.id !== mySocketId && (
                      <button onClick={() => handleKick(player.id)} className="ml-2 text-xs text-red-600 font-bold px-2 py-1 rounded border border-red-300 hover:bg-red-100">Kick</button>
                    )}
                  </div>
                ))}
              </div>
              {players.length >= 2 && players.every(p => p.ready) && isAdmin && (
                <button
                  onClick={startGame}
                  className={`w-full mt-4 ${orangeButton}`}
                >
                  Start Game
                </button>
              )}
              <div className="mt-4 text-center text-primary-dark text-sm">Share the Room ID with friends to join!</div>
              <div className="mt-2 text-xs text-primary-dark">Per-round time: <b>{roundTime}s</b> | Max players: <b>{maxPlayers}</b></div>
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
            <button
              onClick={startCamera}
              className={`${orangeButton} px-8 text-lg`}
            >
              📸 Take Photo
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${orangeOverlay} rounded-lg p-6`}>
            <h3 className="text-xl font-semibold mb-4 text-primary-dark">Players</h3>
            <div className="space-y-2">
              {players.map((player) => (
                <div key={player.id} className="flex justify-between items-center p-2 bg-accent rounded">
                  <span className="font-bold text-secondary">{player.name}</span>
                  <span className="font-semibold text-primary-dark">{scores[player.id] || 0} pts</span>
                </div>
              ))}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <img 
                  src={submission.photo} 
                  alt="Submission" 
                  className="w-full h-48 object-cover"
                />
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
  const renderGameEnd = () => (
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
        <button
          onClick={() => window.location.reload()}
          className={`w-full mt-6 ${orangeButton}`}
        >
          Play Again
        </button>
      </div>
    </motion.div>
  );

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

  // --- CAMERA MODAL ---
  const renderCamera = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${orangeOverlay} rounded-lg p-4 max-w-md w-full`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full rounded-lg mb-4"
        />
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
        {gameState !== "lobby" && renderHeader()}
        {showCamera && renderCamera()}
        {showRoundResults && renderRoundResults()}
        {gameState === "lobby" && renderLobby()}
        {gameState === "playing" && renderGame()}
        {gameState === "voting" && renderVoting()}
        {gameState === "ended" && renderGameEnd()}
      </div>
    </div>
  );
};

export default App;
