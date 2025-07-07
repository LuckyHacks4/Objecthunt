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
import MakeInIndiaLogo from "./components/MakeInIndiaLogo";
import HowToPlayGuide from "./components/HowToPlayGuide";
import TermsOfService from "./components/TermsOfService";

const App = () => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [players, setPlayers] = useState([]);
  const [currentWord, setCurrentWord] = useState("");
  const [round, setRound] = useState(0);
  const [gameState, setGameState] = useState("lobby"); // lobby, playing, voting, ended
  const [gameJustEnded, setGameJustEnded] = useState(false); // Track if game just ended vs reset
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
  const [showCelebration, setShowCelebration] = useState(false);
  const [winnerName, setWinnerName] = useState("");
  const [customWords, setCustomWords] = useState([]);
  const [newCustomWord, setNewCustomWord] = useState("");
  const [loadingFact, setLoadingFact] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  
  // New state variables for room management
  const [currentScreen, setCurrentScreen] = useState("main"); // main, create-room, join-room, lobby
  const [numberOfRounds, setNumberOfRounds] = useState(3);
  
  // AFK Detection States
  const [isAFK, setIsAFK] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [afkTimeout, setAfkTimeout] = useState(null);
  const [pingInterval, setPingInterval] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  
  // --- FUNNY FACTS ---
  const funnyFacts = [
    "Did you know? The average person spends 6 months of their life waiting for red lights to turn green!",
    "Fun fact: A group of flamingos is called a 'flamboyance'!",
    "Here's something wild: Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old!",
    "Did you know? Bananas are berries, but strawberries aren't!",
    "Fun fact: A day on Venus is longer than its year!",
    "Here's a weird one: The shortest war in history lasted only 38 minutes!",
    "Did you know? Cows have best friends and get stressed when separated!",
    "Fun fact: The average person walks the equivalent of three times around the world in a lifetime!",
    "Here's something cool: A group of penguins is called a 'waddle'!",
    "Did you know? The Great Wall of China is not visible from space with the naked eye!",
    "Fun fact: A day on Mars is only 37 minutes longer than a day on Earth!",
    "Here's wild: The average person spends 5 years of their life eating!",
    "Did you know? A group of owls is called a 'parliament'!",
    "Fun fact: The shortest complete sentence in English is 'I am'!",
    "Here's something amazing: Your brain uses 20% of your body's total energy!",
    "Did you know? A group of jellyfish is called a 'smack'!",
    "Fun fact: The average person spends 6 months of their life waiting for things to load!",
    "Here's a cool one: A day on Jupiter is only 10 hours long!",
    "Did you know? The average person spends 2 weeks of their life kissing!",
    "Fun fact: A group of cats is called a 'clowder'!"
  ];
  
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
    
    // Initialize Google AdSense
    if (window.adsbygoogle) {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  }, []);

  // Initialize AdSense ads when they are added to the DOM
  useEffect(() => {
    const initializeAds = () => {
      if (window.adsbygoogle) {
        console.log('Initializing AdSense ads...');
        const adElements = document.querySelectorAll('.adsbygoogle');
        console.log('Found', adElements.length, 'ad elements');
        
        let initializedCount = 0;
        adElements.forEach((element, index) => {
          // Check if ad is already initialized or has ads
          const hasAds = element.hasAttribute('data-ad-status') || 
                        element.querySelector('iframe') || 
                        element.innerHTML.trim() !== '';
          
          if (!hasAds) {
            console.log('Initializing ad element', index);
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
              initializedCount++;
            } catch (error) {
              console.log('Error initializing ad element', index, ':', error.message);
            }
          } else {
            console.log('Ad element', index, 'already has ads or status:', element.getAttribute('data-ad-status'));
          }
        });
        
        console.log('Successfully initialized', initializedCount, 'new ad elements');
      } else {
        console.log('AdSense not loaded yet');
      }
    };

    // Only initialize once when component mounts, not on every screen change
    const timer = setTimeout(initializeAds, 2000);
    
    // Also set up a mutation observer to handle dynamically added ads
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const newAds = mutation.target.querySelectorAll('.adsbygoogle');
          if (newAds.length > 0) {
            console.log('New ad elements detected, initializing...');
            setTimeout(initializeAds, 500);
          }
        }
      });
    });
    
    // Start observing the document body for new ad elements
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []); // Remove dependencies to prevent multiple initializations

  const playLoadingSound = () => {
    try {
      // Only create AudioContext if it's not already created or if it's suspended
      let audioContext = window.audioContext;
      if (!audioContext || audioContext.state === 'suspended') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        window.audioContext = audioContext;
      }
      
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
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

  useEffect(() => {
    // Session persistence and AFK detection setup
    const savedSession = localStorage.getItem('objectHuntSession');
    const savedRoomId = localStorage.getItem('objectHuntRoomId');
    const savedUsername = localStorage.getItem('objectHuntUsername');
    
    if (savedSession && savedRoomId && savedUsername) {
      // Try to restore session
      setSessionId(savedSession);
      setRoomId(savedRoomId);
      setUsername(savedUsername);
      console.log("🔄 Attempting to restore session:", { sessionId: savedSession, roomId: savedRoomId, username: savedUsername });
    } else {
      // Check for room parameter in URL
      const urlParams = new URLSearchParams(window.location.search);
      const roomFromUrl = urlParams.get('room');
      if (roomFromUrl) {
        setRoomId(roomFromUrl);
        // Generate random username instead of using the one from URL
        const randomNames = [
          "Player", "Gamer", "Hunter", "Seeker", "Finder", "Explorer", "Adventurer", "Champion", "Winner", "Hero",
          "Star", "Legend", "Master", "Pro", "Elite", "Ninja", "Warrior", "Knight", "Wizard", "Mage"
        ];
        const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
        const randomNumber = Math.floor(Math.random() * 1000);
        setUsername(`${randomName}${randomNumber}`);
      }
    }

    // Set a random funny fact
    setLoadingFact(funnyFacts[Math.floor(Math.random() * funnyFacts.length)]);
    
    // Initial loading screen
    setTimeout(() => {
      setShowLoading(false);
    }, 2000);

    console.log("Initial socket ID:", socket.id);
    setMySocketId(socket.id);
    
    socket.on("connect", () => {
      console.log("Socket connected, new ID:", socket.id);
      setMySocketId(socket.id);
      
      // Try to restore session if available
      const storedSessionId = localStorage.getItem('objectHuntSession');
      const storedRoomId = localStorage.getItem('objectHuntRoomId');
      const storedUsername = localStorage.getItem('objectHuntUsername');
      
      if (storedSessionId && storedRoomId && storedUsername) {
        console.log("🔄 Attempting to restore session:", { storedSessionId, storedRoomId, storedUsername });
        setSessionId(storedSessionId);
        setRoomId(storedRoomId);
        setUsername(storedUsername);
        
        // Attempt to restore session
        socket.emit("create-room", { 
          roomId: storedRoomId, 
          username: storedUsername,
          sessionId: storedSessionId
        });
      }
    });
    
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      alert("Connection failed. Please refresh the page.");
    });
    
    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      
      // Show loading screen if we have a session to restore
      const storedSessionId = localStorage.getItem('objectHuntSession');
      const storedRoomId = localStorage.getItem('objectHuntRoomId');
      const storedUsername = localStorage.getItem('objectHuntUsername');
      
      if (storedSessionId && storedRoomId && storedUsername && joinedRoom) {
        console.log("🔄 Connection lost, will attempt to reconnect...");
        setShowLoading(true);
        setLoadingFact("Connection lost. Reconnecting...");
      }
      
      if (reason === "io server disconnect") {
        // the disconnection was initiated by the server, you need to reconnect manually
        socket.connect();
      }
    });
    
    socket.on("reconnect", (attemptNumber) => {
      console.log("Reconnected after", attemptNumber, "attempts");
      // Hide loading screen after successful reconnection
      setTimeout(() => {
        setShowLoading(false);
        setLoadingFact("");
      }, 1000);
    });

    socket.on("reconnect_error", (error) => {
      console.error("Reconnection failed:", error);
      setLoadingFact("Reconnection failed. Please refresh the page.");
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.off("reconnect");
      socket.off("reconnect_error");
    };
  }, []);

  // AFK Detection and Activity Tracking
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(Date.now());
      if (isAFK) {
        setIsAFK(false);
        console.log("👤 User returned from AFK");
        // Notify server that user is back
        if (roomId && mySocketId) {
          socket.emit("user-activity", { roomId, socketId: mySocketId });
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("👁️ Page hidden - user may be AFK");
      } else {
        updateActivity();
      }
    };

    const handleUserActivity = () => {
      updateActivity();
    };

    // Set up activity listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousedown', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('touchstart', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);

    // AFK timeout (3 minutes to match server)
    const afkCheck = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivity;
      if (timeSinceActivity > 3 * 60 * 1000 && !isAFK) { // 3 minutes
        setIsAFK(true);
        console.log("😴 User marked as AFK");
        if (roomId && mySocketId) {
          socket.emit("user-afk", { roomId, socketId: mySocketId });
        }
      }
    }, 15000); // Check every 15 seconds for more responsiveness

    // WebSocket ping to keep connection alive
    const ping = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping");
      }
    }, 30000); // Ping every 30 seconds

    setAfkTimeout(afkCheck);
    setPingInterval(ping);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('touchstart', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
      clearInterval(afkCheck);
      clearInterval(ping);
    };
  }, [lastActivity, isAFK, roomId, mySocketId]);

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

    socket.on("session-restored", (data) => {
      console.log("✅ Session restored successfully:", data);
      setGameState(data.gameState || "lobby");
      setRound(data.round || 0);
      setScores(data.scores || {});
      setSubmissions(data.submissions || []);
      setMyVotes(new Set());
      setVotingProgress({});
      setShowRoundResults(false);
      setHasSubmittedPhoto(false);
      setPhotoSubmitted(false);
      setPlayerAvatars(data.avatars || {});
      setCustomWords(data.customWords || []);
      setJoinedRoom(true);
      
      // Update room ID if provided by server (in case it was different)
      if (data.roomId) {
        setRoomId(data.roomId);
        localStorage.setItem('objectHuntRoomId', data.roomId);
      }
      
      // Hide loading screen after successful session restoration
      setShowLoading(false);
      setLoadingFact("");
    });

    socket.on("session-invalid", () => {
      console.log("❌ Session invalid, clearing localStorage");
      localStorage.removeItem('objectHuntSession');
      localStorage.removeItem('objectHuntRoomId');
      localStorage.removeItem('objectHuntUsername');
      setSessionId(null);
    });

    socket.on("new-round", ({ round: newRound, word }) => {
      setRound(newRound);
      setCurrentWord(""); // Hide word during countdown
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
            setCurrentWord(word); // Show word after countdown
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
      console.log("🎉 Game ended event received!", finalScores);
      console.log("Current players:", players);
      setScores(finalScores);
      
      // Find the game winner
      const gameWinner = Object.entries(finalScores)
        .sort(([,a], [,b]) => b - a)[0];
      
      console.log("🏆 Game winner:", gameWinner);
      
      if (gameWinner) {
        const winnerPlayer = players.find(p => p.id === gameWinner[0]);
        console.log("👑 Winner player found:", winnerPlayer);
        if (winnerPlayer) {
          console.log("🎊 Setting celebration for winner:", winnerPlayer.name);
          setWinnerName(winnerPlayer.name);
          setShowCelebration(true);
          
          // Play celebration sound
          try {
            let audioContext = window.audioContext;
            if (!audioContext || audioContext.state === 'suspended') {
              audioContext = new (window.AudioContext || window.webkitAudioContext)();
              window.audioContext = audioContext;
            }
            
            if (audioContext.state === 'suspended') {
              audioContext.resume();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Celebration sound (ascending notes)
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E
            oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G
            oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.3); // C (high)
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
          } catch (error) {
            console.log("Could not play celebration sound:", error);
          }
          
          // Hide celebration after 5 seconds and show game end screen
          setTimeout(() => {
            console.log("⏰ 5 seconds passed, hiding celebration and showing game end");
            setShowCelebration(false);
            setGameState("ended");
            setGameJustEnded(true); // Mark that the game has just ended
            endSound.current.play();
          }, 5000);
        } else {
          console.log("❌ No winner player found, setting game state to ended");
          // Still show celebration even if winner player not found
          setShowCelebration(true);
          setTimeout(() => {
            setShowCelebration(false);
            setGameState("ended");
            setGameJustEnded(true); // Mark that the game has just ended
            endSound.current.play();
          }, 5000);
        }
      } else {
        console.log("❌ No game winner found, setting game state to ended");
        // Still show celebration even if no winner
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          setGameState("ended");
          endSound.current.play();
        }, 5000);
      }
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

    socket.on("game-reset", (updatedPlayers) => {
      setPlayers(updatedPlayers);
      setGameState("lobby");
      setCurrentScreen("lobby"); // Reset to lobby screen
      setGameJustEnded(false); // Clear the game just ended flag
      setRound(0);
      setScores({});
      setSubmissions([]);
      setMyVotes(new Set());
      setVotingProgress({});
      setShowRoundResults(false);
      setHasSubmittedPhoto(false);
      setPhotoSubmitted(false);
      setPlayerAvatars({});
      setCustomWords([]);
      setNewCustomWord("");
      setLoadingFact("");
    });

    return () => {
      socket.off("room-update");
      socket.off("new-round");
      socket.off("start-voting");
      socket.off("score-update");
      socket.off("game-ended");
      socket.off("chat-message");
      socket.off("avatar-updated");
      socket.off("game-reset");
      socket.off("session-restored");
      socket.off("session-invalid");
    };
  }, [joinedRoom, mySocketId, players]);

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
      
      // Play fast beep sound for last 10 seconds
      if (votingTimeLeft <= 10 && votingTimeLeft > 0) {
        try {
          let audioContext = window.audioContext;
          if (!audioContext || audioContext.state === 'suspended') {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            window.audioContext = audioContext;
          }
          
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
          
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.05);
          
          gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
          console.log("Could not play beep sound:", error);
        }
      }
    } else if (gameState === "voting" && votingTimeLeft === 0) {
      // Play timeout sound
      try {
        let audioContext = window.audioContext;
        if (!audioContext || audioContext.state === 'suspended') {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          window.audioContext = audioContext;
        }
        
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        
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
      
      // Notify server that voting time is up
      if (roomId) {
        console.log("Client voting timer expired, notifying server...");
        socket.emit("voting-timeout", { roomId });
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

  // Prevent accidental page reload/close during game
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (gameState !== "lobby" && gameState !== "ended") {
        e.preventDefault();
        e.returnValue = "Are you sure you want to leave? Your game progress will be lost.";
        return "Are you sure you want to leave? Your game progress will be lost.";
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createRoom = () => {
    if (!username.trim()) return;
    
    // Auto-generate room code if not provided
    const finalRoomId = roomId.trim() || generateRoomCode();
    setRoomId(finalRoomId);
    
    // Initialize audio context on user interaction
    if (window.audioContext && window.audioContext.state === 'suspended') {
      window.audioContext.resume();
    }
    
    // Generate session ID if not exists
    const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    // Save session to localStorage
    localStorage.setItem('objectHuntSession', newSessionId);
    localStorage.setItem('objectHuntRoomId', finalRoomId);
    localStorage.setItem('objectHuntUsername', username);
    
    console.log("Creating room:", { roomId: finalRoomId, username, socketId: mySocketId, roundTime, maxPlayers, numberOfRounds, sessionId: newSessionId });
    socket.emit("create-room", { roomId: finalRoomId, username, roundTime, maxPlayers, numberOfRounds, sessionId: newSessionId });
    setJoinedRoom(true);
    setCurrentScreen("lobby");
  };

  const joinRoom = () => {
    if (!username.trim() || !roomId.trim()) return;
    
    // Initialize audio context on user interaction
    if (window.audioContext && window.audioContext.state === 'suspended') {
      window.audioContext.resume();
    }
    
    // Generate session ID if not exists
    const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    // Save session to localStorage
    localStorage.setItem('objectHuntSession', newSessionId);
    localStorage.setItem('objectHuntRoomId', roomId);
    localStorage.setItem('objectHuntUsername', username);
    
    console.log("Joining room:", { roomId, username, socketId: mySocketId, sessionId: newSessionId });
    socket.emit("create-room", { roomId, username, sessionId: newSessionId });
    setJoinedRoom(true);
    setCurrentScreen("lobby");
  };

  const startGame = () => {
    // Initialize audio context on user interaction
    if (window.audioContext && window.audioContext.state === 'suspended') {
      window.audioContext.resume();
    }
    
    // Update current screen to indicate we're no longer in lobby
    setCurrentScreen("game");
    
    // Start the first round of the game with custom words
    socket.emit("next-round", { roomId, customWords });
  };

  const exitLobby = () => {
    socket.emit("leave-room", { roomId });
    setJoinedRoom(false);
    setCurrentScreen("main");
    setPlayers([]);
    setGameState("lobby");
    setRound(0);
    setScores({});
    setSubmissions([]);
    setMyVotes(new Set());
    setVotingProgress({});
    setShowRoundResults(false);
    setHasSubmittedPhoto(false);
    setPhotoSubmitted(false);
    setPlayerAvatars({});
    setShowCelebration(false);
    setWinnerName("");
    setCustomWords([]);
    setNewCustomWord("");
  };

  const startNewGame = () => {
    // Reset game state for new game
    setGameState("lobby");
    setCurrentScreen("lobby"); // Reset to lobby screen
    setGameJustEnded(false); // Clear the game just ended flag
    setRound(0);
    setScores({});
    setSubmissions([]);
    setMyVotes(new Set());
    setVotingProgress({});
    setShowRoundResults(false);
    setHasSubmittedPhoto(false);
    setPhotoSubmitted(false);
    setPlayerAvatars({});
    setShowCelebration(false);
    setWinnerName("");
    setCustomWords([]);
    setNewCustomWord("");
    
    // Reset all players to not ready
    socket.emit("reset-game", { roomId });
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
    
    // Play a nicer camera sound
    try {
      // Initialize audio context on user interaction
      let audioContext = window.audioContext;
      if (!audioContext || audioContext.state === 'suspended') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        window.audioContext = audioContext;
      }
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Pleasant camera shutter sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.05);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (error) {
      console.log("Could not play camera sound:", error);
    }
    
    // Show confirmation
    setPhotoSubmitted(true);
    setHasSubmittedPhoto(true);
    
    console.log(`Submitting photo for room ${roomId}`);
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
    
    console.log(`Voting ${vote} on photo ${photoIndex} in room ${roomId}`);
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
  const renderMainScreen = () => {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`min-h-screen flex flex-col items-center justify-center p-4`}
      >
        {renderHeader()}
        {/* Main Content Container with Side Ads */}
        <div className="flex items-center justify-center w-full max-w-6xl mx-auto">
          {/* Left Side Ad */}
          <div className="hidden lg:block w-64 mx-4">
            <div className="bg-white rounded-lg p-2 shadow-md sticky top-4">
              <ins className="adsbygoogle"
                   style={{display: 'block'}}
                   data-ad-client="ca-pub-1805547376392100"
                   data-ad-slot="6563354949"
                   data-ad-format="auto"
                   data-full-width-responsive="true"></ins>
              <div className="text-center text-gray-500 text-xs mt-2">
                Advertisement
              </div>
            </div>
          </div>
          {/* Main Content */}
          <div className={`${orangeOverlay} rounded-3xl p-10 max-w-md w-full`}>
            <h1 className="text-3xl font-bold text-center mb-8 text-primary-dark drop-shadow">Welcome to Object Hunt - Free Multiplayer Photo Scavenger Hunt Game</h1>
            {/* How to Play Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHowToPlay(true)}
              className="w-full mb-6 bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:shadow-xl"
            >
              🎮 How to Play Guide 🎮
            </motion.button>
            {/* Google AdSense Rectangle Ad */}
            <div className="w-full mb-6 flex justify-center">
              <div className="bg-white rounded-lg p-2 shadow-md">
                <ins className="adsbygoogle"
                     style={{display: 'block'}}
                     data-ad-client="ca-pub-1805547376392100"
                     data-ad-slot="4863260469"
                     data-ad-format="auto"
                     data-full-width-responsive="true"></ins>
                <div className="text-center text-gray-500 text-xs mt-2">
                  Advertisement
                </div>
              </div>
            </div>
            {/* Clear Session Button - Only show if there's a saved session */}
            {localStorage.getItem('objectHuntSession') && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // Clear all saved session data
                  localStorage.removeItem('objectHuntSession');
                  localStorage.removeItem('objectHuntRoomId');
                  localStorage.removeItem('objectHuntUsername');
                  // Reset all state
                  setSessionId(null);
                  setRoomId("");
                  setUsername("");
                  setJoinedRoom(false);
                  setCurrentScreen("main");
                  setGameState("lobby");
                  setPlayers([]);
                  setRound(0);
                  setScores({});
                  setSubmissions([]);
                  setMyVotes(new Set());
                  setVotingProgress({});
                  setShowRoundResults(false);
                  setHasSubmittedPhoto(false);
                  setPhotoSubmitted(false);
                  setPlayerAvatars({});
                  setShowCelebration(false);
                  setWinnerName("");
                  setCustomWords([]);
                  setNewCustomWord("");
                  // Force page reload to ensure clean state
                  window.location.reload();
                }}
                className="w-full mb-6 bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:shadow-xl"
              >
                🔄 Clear Saved Session & Start Fresh 🔄
              </motion.button>
            )}
            <div className="space-y-4">
              <label htmlFor="username" className="sr-only">Your username</label>
              <input
                id="username"
                type="text"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border-2 border-primary-light rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-accent/40 text-secondary"
                aria-label="Enter your username"
              />
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentScreen("create-room")}
                  className={`flex-1 ${orangeButton}`}
                >
                  🏠 Create Room
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentScreen("join-room")}
                  className={`flex-1 ${orangeButtonOutline}`}
                >
                  🚪 Join Room
                </motion.button>
              </div>
            </div>
          </div>
          {/* Right Side Ad */}
          <div className="hidden lg:block w-64 mx-4">
            <div className="bg-white rounded-lg p-2 shadow-md sticky top-4">
              <ins className="adsbygoogle"
                   style={{display: 'block'}}
                   data-ad-client="ca-pub-1805547376392100"
                   data-ad-slot="6563354949"
                   data-ad-format="auto"
                   data-full-width-responsive="true"></ins>
              <div className="text-center text-gray-500 text-xs mt-2">
                Advertisement
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderCreateRoomScreen = () => {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`min-h-screen flex flex-col items-center justify-center p-4`}
      >
        {renderHeader()}
        <div className={`${orangeOverlay} rounded-3xl p-10 max-w-md w-full`}>
          <h1 className="text-2xl font-bold text-center mb-6 text-primary-dark drop-shadow">Create New Room</h1>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="roomId" className="block text-primary-dark text-sm font-semibold">Room ID (Optional)</label>
              <input
                id="roomId"
                type="text"
                placeholder="Leave empty to auto-generate"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-3 border-2 border-primary-light rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-accent/40 text-secondary"
              />
              <p className="text-xs text-primary-dark">
                💡 Leave empty to auto-generate a unique room code
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
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
              <div>
                <label className="block text-primary-dark text-sm font-semibold mb-1">Number of rounds</label>
                <select
                  value={numberOfRounds}
                  onChange={e => setNumberOfRounds(Number(e.target.value))}
                  className="w-full p-2 border-2 border-primary-light rounded-lg bg-accent/40 text-secondary"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>
            </div>
            
            <div>
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
            
            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentScreen("main")}
                className={`flex-1 ${orangeButtonOutline}`}
              >
                ← Back
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createRoom}
                className={`flex-1 ${orangeButton}`}
              >
                🏠 Create Room
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderJoinRoomScreen = () => {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`min-h-screen flex flex-col items-center justify-center p-4`}
      >
        {renderHeader()}
        <div className={`${orangeOverlay} rounded-3xl p-10 max-w-md w-full`}>
          <h1 className="text-2xl font-bold text-center mb-6 text-primary-dark drop-shadow">Join Existing Room</h1>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="joinRoomId" className="block text-primary-dark text-sm font-semibold mb-1">Room ID</label>
              <input
                id="joinRoomId"
                type="text"
                placeholder="Enter room code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-3 border-2 border-primary-light rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-accent/40 text-secondary"
              />
            </div>
            
            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentScreen("main")}
                className={`flex-1 ${orangeButtonOutline}`}
              >
                ← Back
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={joinRoom}
                className={`flex-1 ${orangeButton}`}
              >
                🚪 Join Room
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderLobby = () => {
    // Determine if current user is admin (host)
    const isAdmin = players.length > 0 && players[0].id === mySocketId;
    const shareUrl = `${window.location.origin}?room=${roomId}`;
    
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
          <h1 className="text-2xl font-bold text-center mb-6 text-primary-dark drop-shadow">Room Lobby</h1>
          
          {/* Google AdSense Rectangle Ad */}
          <div className="w-full mb-4 flex justify-center">
            <div className="bg-white rounded-lg p-2 shadow-md">
              <ins className="adsbygoogle"
                   style={{display: 'block'}}
                   data-ad-client="ca-pub-1805547376392100"
                   data-ad-slot="4863260469"
                   data-ad-format="auto"
                   data-full-width-responsive="true"></ins>
              <div className="text-center text-gray-500 text-xs mt-2">
                Advertisement
              </div>
            </div>
          </div>
          
          <div className="mb-4 p-3 bg-accent rounded-lg border border-primary-light">
            <div className="text-center text-primary-dark text-sm mb-2">Room Code: <span className="font-bold text-lg">{roomId}</span></div>
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
          
          <div className="mb-4">
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
                    <span className="font-bold text-secondary">
                      {player.name}
                      {player.afk && <span className="text-yellow-600 ml-1">😴</span>}
                      {index === 0 && <span className="text-blue-600 ml-1">👑</span>}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-sm ${player.ready ? 'bg-primary text-white' : 'bg-gray-300 text-secondary'}`}>
                      {player.ready ? 'Ready' : 'Not Ready'}
                    </span>
                    {player.id === mySocketId && !player.ready && (
                      <button onClick={handleReady} className={`${orangeButtonOutline} px-3 py-1 text-sm`}>Ready</button>
                    )}
                    {isAdmin && player.id !== mySocketId && (
                      <button 
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to kick ${player.name}?`)) {
                            handleKick(player.id);
                          }
                        }} 
                        className="text-xs bg-red-500 hover:bg-red-600 text-white font-bold px-2 py-1 rounded transition-colors"
                      >
                        🚫 Kick
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Game Settings (Admin Only) */}
          {isAdmin && (
            <div className="mb-4 p-3 bg-accent rounded-lg border border-primary-light">
              <h4 className="text-sm font-semibold text-primary-dark mb-2">Game Settings:</h4>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-primary-dark text-xs font-semibold">Per-round time</label>
                  <select
                    value={roundTime}
                    onChange={e => setRoundTime(Number(e.target.value))}
                    className="w-full p-1 text-xs border border-primary-light rounded bg-white"
                  >
                    <option value={30}>30s</option>
                    <option value={45}>45s</option>
                    <option value={60}>60s</option>
                    <option value={90}>90s</option>
                  </select>
                </div>
                <div>
                  <label className="block text-primary-dark text-xs font-semibold">Number of rounds</label>
                  <select
                    value={numberOfRounds}
                    onChange={e => setNumberOfRounds(Number(e.target.value))}
                    className="w-full p-1 text-xs border border-primary-light rounded bg-white"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                  </select>
                </div>
              </div>
              <div className="text-xs text-primary-dark">
                Current: <b>{roundTime}s</b> per round, <b>{numberOfRounds}</b> rounds
              </div>
            </div>
          )}
          
          {/* Avatar button for current user */}
          {!playerAvatars[mySocketId] && (
            <button
              onClick={startAvatarCamera}
              className={`w-full mb-4 ${orangeButtonOutline}`}
            >
              📸 Take Avatar Photo
            </button>
          )}
          
          {/* Custom Words Section */}
          <div className="mb-4 p-3 bg-accent rounded-lg border border-primary-light">
            <h4 className="text-sm font-semibold text-primary-dark mb-2">Add Custom Words:</h4>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                placeholder="Enter a word..."
                value={newCustomWord}
                onChange={(e) => setNewCustomWord(e.target.value)}
                className="flex-1 p-2 text-sm border border-primary-light rounded bg-white"
              />
              <button
                onClick={() => {
                  if (newCustomWord.trim()) {
                    setCustomWords([...customWords, newCustomWord.trim()]);
                    setNewCustomWord("");
                  }
                }}
                className={`px-3 py-2 ${orangeButton} text-sm`}
              >
                Add
              </button>
            </div>
            {customWords.length > 0 && (
              <div className="text-xs text-primary-dark">
                Custom words: {customWords.join(", ")}
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exitLobby}
              className={`flex-1 ${orangeButtonOutline}`}
            >
              🚪 Leave Room
            </motion.button>
            {players.length >= 2 && players.every(p => p.ready) && isAdmin && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className={`flex-1 ${orangeButton}`}
              >
                🎮 Start Game
              </motion.button>
            )}
          </div>
          
          <div className="mt-2 text-xs text-primary-dark text-center">
            Per-round time: <b>{roundTime}s</b> | Max players: <b>{maxPlayers}</b> | Rounds: <b>{numberOfRounds}</b>
          </div>
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
      className={`fixed inset-0 p-4 flex flex-col items-center justify-center overflow-y-auto`}
      style={{ zIndex: 10 }}
    >
      <div className="max-w-4xl mx-auto w-full">
        <div className={`${orangeOverlay} rounded-lg p-6 mb-4`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-primary-dark">Round {round}/{numberOfRounds}</h2>
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
                        <span className="font-bold text-secondary">
                          {player.name}
                          {player.afk && <span className="text-yellow-600 ml-1">😴</span>}
                        </span>
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
      className={`fixed inset-0 p-4 flex flex-col items-center justify-center overflow-y-auto`}
      style={{ zIndex: 10 }}
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
        className={`fixed inset-0 flex items-center justify-center p-4 overflow-y-auto`}
        style={{ zIndex: 10 }}
      >
        <div className={`${orangeOverlay} rounded-lg p-8 max-w-2xl w-full`}>
          
          {/* Google AdSense Rectangle Ad */}
          <div className="w-full mb-6 flex justify-center">
            <div className="bg-white rounded-lg p-2 shadow-md">
              <ins className="adsbygoogle"
                   style={{display: 'block'}}
                   data-ad-client="ca-pub-1805547376392100"
                   data-ad-slot="4863260469"
                   data-ad-format="auto"
                   data-full-width-responsive="true"></ins>
              <div className="text-center text-gray-500 text-xs mt-2">
                Advertisement
              </div>
            </div>
          </div>
          
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
                onClick={startNewGame}
                className={`w-full ${orangeButton}`}
              >
                Start New Game
              </button>
            ) : (
              <div className="text-center">
                <p className="text-primary-dark mb-3">Waiting for host to start a new game...</p>
                {gameJustEnded && (
                  <button
                    onClick={exitLobby}
                    className={`w-full ${orangeButtonOutline}`}
                  >
                    Exit Lobby
                  </button>
                )}
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
        {loadingFact && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-6 max-w-md mx-auto"
          >
            <motion.p
              animate={{ opacity: [0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
              className="text-white text-sm italic"
            >
              💡 {loadingFact}
            </motion.p>
          </motion.div>
        )}
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

  // --- CELEBRATION SCREEN ---
  const renderCelebration = () => {
    console.log("🎈 Rendering celebration screen for winner:", winnerName);
    return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center z-50"
    >
      <div className="text-center">
        {/* Balloons */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: "100vh", x: Math.random() * window.innerWidth }}
              animate={{ 
                y: "-100px",
                x: Math.random() * window.innerWidth,
                rotate: [0, 360]
              }}
              transition={{ 
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
              className="absolute text-4xl"
              style={{ left: `${Math.random() * 100}%` }}
            >
              🎈
            </motion.div>
          ))}
        </div>
        
        {/* Winner announcement */}
        <motion.div
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="text-6xl mb-4"
          >
            🏆
          </motion.div>
          <motion.h1
            animate={{ 
              color: ["#FFD700", "#FFA500", "#FF6347", "#FFD700"]
            }}
            transition={{ 
              duration: 1,
              repeat: Infinity
            }}
            className="text-5xl font-bold text-white mb-4 drop-shadow-2xl"
          >
            {winnerName ? `${winnerName} Wins!` : "Game Complete!"}
          </motion.h1>
          <motion.p
            animate={{ opacity: [0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
            className="text-2xl text-white drop-shadow-lg"
          >
            🎉 Game Champion! 🎉
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
    );
  };

  // --- CAMERA MODAL ---
  const renderCamera = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${orangeOverlay} rounded-lg p-4 max-w-md w-full`}>
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg mb-4 camera-mirror"
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
            muted
            className="w-full rounded-lg mb-4 camera-mirror"
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
    <>
      {/* SEO-friendly page structure */}
      <header role="banner" className="sr-only">
        <h1>Object Hunt - Free Multiplayer Photo Scavenger Hunt Game</h1>
        <p>Play the ultimate free multiplayer photo scavenger hunt game online. Find objects, take photos, vote, and compete with friends!</p>
      </header>
      
      <main role="main" id="main-content">
        <a href="#main-content" className="skip-link">Skip to main content</a>
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
                {showCelebration && (() => {
                  console.log("🎉 Celebration should be showing, showCelebration:", showCelebration);
                  return renderCelebration();
                })()}
                {photoSubmitted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50"
                  >
                    ✅ Photo submitted successfully!
                  </motion.div>
                )}
                {currentScreen === "main" && renderMainScreen()}
                {currentScreen === "create-room" && renderCreateRoomScreen()}
                {currentScreen === "join-room" && renderJoinRoomScreen()}
                {currentScreen === "lobby" && gameState === "lobby" && renderLobby()}
                {gameState === "playing" && renderGame()}
                {gameState === "voting" && renderVoting()}
                {gameState === "ended" && renderGameEnd()}
                
                {/* AFK Status Indicator */}
                {isAFK && (
                  <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
                  >
                    😴 You are currently AFK
                  </motion.div>
                )}
                
                {/* How to Play Guide Modal */}
                <HowToPlayGuide 
                  isOpen={showHowToPlay} 
                  onClose={() => setShowHowToPlay(false)} 
                />
                
                {/* Terms of Service Modal */}
                <TermsOfService 
                  isOpen={showTermsOfService} 
                  onClose={() => setShowTermsOfService(false)} 
                />
                
                {/* Make in India Logo */}
                <MakeInIndiaLogo />
                
                {/* Footer with License Information */}
                <footer className="fixed bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 z-40">
                  <div className="flex justify-between items-center max-w-6xl mx-auto px-4">
                    <div className="flex items-center space-x-4">
                      <span>© 2024 Object Hunt Game. All rights reserved.</span>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowTermsOfService(true)}
                        className="text-orange-400 hover:text-orange-300 underline"
                      >
                        Terms of Service & License
                      </motion.button>
                    </div>
                    <div className="text-gray-400">
                      Protected by Copyright Law
                    </div>
                  </div>
                </footer>
              </>
            )}
          </div>
        </div>
      </main>
      
      <footer role="contentinfo" className="sr-only">
        <nav aria-label="Footer navigation">
          <ul>
            <li><a href="/about">About Object Hunt</a></li>
            <li><a href="/how-to-play">How to Play</a></li>
            <li><a href="/features">Features</a></li>
            <li><a href="/contact">Contact</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
          </ul>
        </nav>
        <p>&copy; 2024 Object Hunt. Free multiplayer photo scavenger hunt game.</p>
      </footer>
    </>
  );
};

export default App;
