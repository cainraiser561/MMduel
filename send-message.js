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
        const { roomCode, senderId, type, data, timestamp } = JSON.parse(event.body);
        
        if (!rooms[roomCode]) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Room not found' })
            };
        }
        
        // Add message to room
        const message = {
            senderId,
            type,
            data,
            timestamp,
            id: `${timestamp}-${Math.random()}`
        };
        
        rooms[roomCode].messages.push(message);
        
        // Keep only last 50 messages per room
        if (rooms[roomCode].messages.length > 50) {
            rooms[roomCode].messages = rooms[roomCode].messages.slice(-50);
        }
        
        console.log(`Message sent in room ${roomCode} by ${senderId}`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                messageId: message.id
            })
        };
        
    } catch (error) {
        console.error('Send message error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to send message' })
        };
    }
};
