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
        const { roomCode, senderId } = event.queryStringParameters;
        
        if (!rooms[roomCode]) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    opponentFound: false,
                    message: 'Room not found'
                })
            };
        }
        
        const room = rooms[roomCode];
        let opponentFound = false;
        let opponentSenderId = null;
        
        // Look for opponent
        for (const [playerId, playerData] of Object.entries(room.players)) {
            if (playerId !== senderId && playerData.connected) {
                opponentFound = true;
                opponentSenderId = playerId;
                break;
            }
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                opponentFound,
                opponentSenderId,
                playerCount: Object.keys(room.players).length
            })
        };
        
    } catch (error) {
        console.error('Check room error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to check room' })
        };
    }
};
