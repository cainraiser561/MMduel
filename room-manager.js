// Simple in-memory room management for Netlify Functions
// In production, you'd use a database like Redis or MongoDB

const rooms = {};

// Clean up old rooms every 5 minutes
setInterval(() => {
    const now = Date.now();
    const roomTimeout = 30 * 60 * 1000; // 30 minutes
    
    Object.keys(rooms).forEach(roomCode => {
        if (now - rooms[roomCode].createdAt > roomTimeout) {
            delete rooms[roomCode];
            console.log(`Cleaned up old room: ${roomCode}`);
        }
    });
}, 5 * 60 * 1000); // 5 minutes

module.exports = { rooms };
