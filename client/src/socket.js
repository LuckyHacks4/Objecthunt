import { io } from "socket.io-client";

// Connect to the deployed server on Render, or localhost for development
const socket = io(import.meta.env.PROD ? "https://objecthunt.onrender.com" : "http://localhost:3001", {
  transports: ['websocket', 'polling'],
  timeout: 20000,
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  maxReconnectionAttempts: 10
});

// Add connection event listeners for better debugging
socket.on("connect", () => {
  console.log("Socket connected, new ID:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.log("Socket connection error:", error);
});

export default socket;
