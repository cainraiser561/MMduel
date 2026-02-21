const { rooms } = require('./room-manager');

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { roomCode, senderId, since } = event.queryStringParameters;
        
        if (!rooms[roomCode]) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    messages: [],
                    message: 'Room not found'
                })
            };
        }
        
        const room = rooms[roomCode];
        let messages = room.messages || [];
        
        // Filter messages from other players
        messages = messages.filter(msg => msg.senderId !== senderId);
        
        // Filter messages since a certain time if provided
        if (since) {
            messages = messages.filter(msg => msg.timestamp > parseInt(since));
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                messages,
                count: messages.length
            })
        };
        
    } catch (error) {
        console.error('Get messages error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to get messages' })
        };
    }
};
