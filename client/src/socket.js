import { io } from "socket.io-client";

// Connect to the deployed server on Render, or localhost for development
const socket = io(import.meta.env.PROD ? "https://objecthunt.onrender.com" : "http://localhost:3001", {
  transports: ['websocket', 'polling'],
  timeout: 20000,
  forceNew: true
});

export default socket;
