const io = require('socket.io-client');

// Test connection to the server
const socket = io('https://objecthunt.onrender.com', {
  transports: ['websocket', 'polling'],
  timeout: 10000
});

console.log('Testing connection to objecthunt.onrender.com...');

socket.on('connect', () => {
  console.log('✅ Connected successfully! Socket ID:', socket.id);
  
  // Test creating a room
  socket.emit('create-room', {
    roomId: 'TEST123',
    username: 'TestUser',
    roundTime: 60,
    maxPlayers: 6,
    numberOfRounds: 3,
    sessionId: 'test-session'
  });
});

socket.on('room-update', (players) => {
  console.log('✅ Room update received:', players);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection failed:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

// Test health endpoint
fetch('https://objecthunt.onrender.com/health')
  .then(response => response.json())
  .then(data => {
    console.log('✅ Health check response:', data);
  })
  .catch(error => {
    console.log('❌ Health check failed:', error.message);
  });

// Disconnect after 10 seconds
setTimeout(() => {
  socket.disconnect();
  process.exit(0);
}, 10000); 