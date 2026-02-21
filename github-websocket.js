// GitHub Pages WebSocket Client - Uses Firebase for signaling
class GitHubWebSocketClient {
    constructor(roomCode, isHost, onConnect, onMessage, onDisconnect, onError) {
        this.roomCode = roomCode;
        this.isHost = isHost;
        this.onConnect = onConnect;
        this.onMessage = onMessage;
        this.onDisconnect = onDisconnect;
        this.onError = onError;
        this.connected = false;
        this.foundOpponent = false;
        this.connectionTimeout = null;
        this.maxConnectionTime = 45000; // 45 seconds timeout
        
        // Use Firebase Realtime Database for signaling
        this.firebaseUrl = 'https://mastermind-multiplayer-default-rtdb.firebaseio.com';
        this.dbRef = null;
        
        this.connect();
    }
    
    async connect() {
        try {
            console.log('Connecting to Firebase signaling...');
            
            // Create room reference in Firebase
            this.dbRef = `${this.firebaseUrl}/rooms/${this.roomCode}`;
            
            // Set connection timeout
            this.connectionTimeout = setTimeout(() => {
                if (!this.foundOpponent) {
                    console.log('Connection timeout - no opponent found');
                    this.onConnectionFailed();
                }
            }, this.maxConnectionTime);
            
            // Start listening for room changes
            this.startRoomListener();
            
            // Announce our presence
            await this.announcePresence();
            
            // Start searching for opponent
            this.startOpponentSearch();
            
        } catch (error) {
            console.error('Failed to connect to Firebase:', error);
            this.clearTimeout();
            if (this.onError) this.onError(error);
        }
    }
    
    clearTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }
    
    async announcePresence() {
        const playerData = {
            type: 'player',
            isHost: this.isHost,
            timestamp: Date.now(),
            senderId: this.getSenderId(),
            connected: true
        };
        
        try {
            await this.putFirebaseData(`${this.dbRef}/players/${this.getSenderId()}`, playerData);
            console.log('Announced presence in room');
        } catch (error) {
            console.error('Failed to announce presence:', error);
        }
    }
    
    startRoomListener() {
        // Poll for room changes every 2 seconds
        this.listenerInterval = setInterval(async () => {
            if (!this.foundOpponent) {
                await this.checkForOpponent();
            } else {
                await this.checkForMessages();
            }
        }, 2000);
    }
    
    async checkForOpponent() {
        try {
            const roomData = await this.getFirebaseData(`${this.dbRef}/players`);
            if (!roomData) return;
            
            // Look for opponent
            for (const [senderId, playerData] of Object.entries(roomData)) {
                if (senderId !== this.getSenderId() && playerData.isHost !== this.isHost && playerData.connected) {
                    // Found opponent!
                    console.log('Found opponent:', senderId);
                    this.onOpponentFound(senderId);
                    return;
                }
            }
        } catch (error) {
            console.error('Error checking for opponent:', error);
        }
    }
    
    async checkForMessages() {
        try {
            const messagesData = await this.getFirebaseData(`${this.dbRef}/messages`);
            if (!messagesData) return;
            
            // Process new messages
            for (const [messageId, messageData] of Object.entries(messagesData)) {
                if (messageData.senderId !== this.getSenderId() && !messageData.processed) {
                    // Handle message
                    this.handleMessage(messageData);
                    
                    // Mark as processed
                    await this.putFirebaseData(`${this.dbRef}/messages/${messageId}/processed`, true);
                }
            }
            
            // Clean up old messages
            await this.cleanupOldMessages();
        } catch (error) {
            console.error('Error checking for messages:', error);
        }
    }
    
    async cleanupOldMessages() {
        try {
            const messagesData = await this.getFirebaseData(`${this.dbRef}/messages`);
            if (!messagesData) return;
            
            const cutoffTime = Date.now() - 60000; // 1 minute ago
            for (const [messageId, messageData] of Object.entries(messagesData)) {
                if (messageData.timestamp < cutoffTime) {
                    await this.deleteFirebaseData(`${this.dbRef}/messages/${messageId}`);
                }
            }
        } catch (error) {
            console.error('Error cleaning up messages:', error);
        }
    }
    
    startOpponentSearch() {
        // Search is handled by the room listener
        console.log('Started opponent search');
    }
    
    onOpponentFound(opponentSenderId) {
        console.log('Found opponent in room!');
        this.foundOpponent = true;
        this.clearTimeout();
        
        this.opponentSenderId = opponentSenderId;
        
        // Notify game that we're connected
        if (this.onConnect) {
            this.onConnect();
        }
    }
    
    onConnectionFailed() {
        console.log('Failed to find opponent within timeout');
        this.clearTimeout();
        
        // Stop searching
        if (this.listenerInterval) {
            clearInterval(this.listenerInterval);
            this.listenerInterval = null;
        }
        
        // Clean up our presence
        this.cleanup();
        
        // Notify game of connection failure
        if (this.onError) {
            this.onError(new Error('Failed to connect to opponent - no one joined your room'));
        }
    }
    
    handleMessage(data) {
        console.log('Received message:', data);
        
        if (this.onMessage) {
            this.onMessage(data);
        }
    }
    
    async sendMessage(type, data) {
        if (!this.foundOpponent) return;
        
        const message = {
            type: type,
            data: data,
            senderId: this.getSenderId(),
            timestamp: Date.now(),
            processed: false
        };
        
        try {
            await this.putFirebaseData(`${this.dbRef}/messages/${Date.now()}-${Math.random()}`, message);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }
    
    sendGameMessage(type, data) {
        this.sendMessage('game-message', { messageType: type, data });
    }
    
    getSenderId() {
        return `${this.roomCode}-${this.isHost ? 'host' : 'client'}`;
    }
    
    // Firebase REST API methods
    async getFirebaseData(path) {
        try {
            const response = await fetch(`${path}.json`);
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Firebase GET error:', error);
            return null;
        }
    }
    
    async putFirebaseData(path, data) {
        try {
            const response = await fetch(`${path}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (error) {
            console.error('Firebase PUT error:', error);
            return false;
        }
    }
    
    async deleteFirebaseData(path) {
        try {
            const response = await fetch(`${path}.json`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (error) {
            console.error('Firebase DELETE error:', error);
            return false;
        }
    }
    
    cleanup() {
        // Remove our presence from the room
        if (this.dbRef) {
            this.deleteFirebaseData(`${this.dbRef}/players/${this.getSenderId()}`);
        }
    }
    
    close() {
        this.clearTimeout();
        
        if (this.listenerInterval) {
            clearInterval(this.listenerInterval);
            this.listenerInterval = null;
        }
        
        this.cleanup();
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubWebSocketClient;
}
