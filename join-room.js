const { rooms } = require('./room-manager');

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { roomCode, isHost, timestamp, senderId } = JSON.parse(event.body);
        
        // Initialize room if it doesn't exist
        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                players: {},
                messages: [],
                createdAt: Date.now()
            };
        }
        
        // Add player to room
        rooms[roomCode].players[senderId] = {
            isHost,
            timestamp,
            connected: true
        };
        
        console.log(`Player ${senderId} joined room ${roomCode}`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Joined room successfully'
            })
        };
        
    } catch (error) {
        console.error('Join room error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to join room' })
        };
    }
};
