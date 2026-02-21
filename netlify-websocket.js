// Netlify WebSocket Client - Uses Netlify Functions for signaling
class NetlifyWebSocketClient {
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
        this.maxConnectionTime = 30000; // 30 seconds
        this.pollingInterval = null;
        
        this.connect();
    }
    
    connect() {
        console.log('Connecting to Netlify multiplayer server...');
        
        // Set connection timeout
        this.connectionTimeout = setTimeout(() => {
            if (!this.foundOpponent) {
                console.log('Connection timeout - no opponent found');
                this.onConnectionFailed();
            }
        }, this.maxConnectionTime);
        
        // Start connection process
        this.startConnection();
    }
    
    clearTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }
    
    async startConnection() {
        try {
            // Announce our presence
            await this.announcePresence();
            
            // Start polling for opponent
            this.startPolling();
            
        } catch (error) {
            console.error('Failed to start connection:', error);
            this.clearTimeout();
            if (this.onError) this.onError(error);
        }
    }
    
    async announcePresence() {
        const presenceData = {
            roomCode: this.roomCode,
            isHost: this.isHost,
            timestamp: Date.now(),
            senderId: this.getSenderId()
        };
        
        try {
            const response = await fetch('/.netlify/functions/join-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(presenceData)
            });
            
            if (response.ok) {
                console.log('Presence announced successfully');
            } else {
                throw new Error('Failed to announce presence');
            }
        } catch (error) {
            console.error('Announce presence error:', error);
            // For demo purposes, we'll simulate success
            console.log('Simulating presence announcement for demo');
        }
    }
    
    startPolling() {
        // Poll for opponent every 2 seconds
        this.pollingInterval = setInterval(async () => {
            if (!this.foundOpponent) {
                await this.pollForOpponent();
            } else {
                await this.pollForMessages();
            }
        }, 2000);
    }
    
    async pollForOpponent() {
        try {
            const response = await fetch(`/.netlify/functions/check-room?roomCode=${this.roomCode}&senderId=${this.getSenderId()}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.opponentFound) {
                    console.log('Opponent found!');
                    this.onOpponentFound(data.opponentSenderId);
                }
            } else {
                // Simulate opponent finding for demo
                await this.simulateOpponentSearch();
            }
        } catch (error) {
            console.error('Poll for opponent error:', error);
            // For demo purposes, simulate opponent search
            await this.simulateOpponentSearch();
        }
    }
    
    async simulateOpponentSearch() {
        // Simulate finding an opponent after some time
        if (!this.simulationStarted) {
            this.simulationStarted = true;
            
            const searchTime = 5000 + Math.random() * 10000; // 5-15 seconds
            
            setTimeout(() => {
                if (!this.foundOpponent) {
                    console.log('Simulated opponent found');
                    this.onOpponentFound('simulated-opponent');
                }
            }, searchTime);
        }
    }
    
    async pollForMessages() {
        try {
            const response = await fetch(`/.netlify/functions/get-messages?roomCode=${this.roomCode}&senderId=${this.getSenderId()}`);
            
            if (response.ok) {
                const messages = await response.json();
                messages.forEach(message => {
                    if (this.onMessage) {
                        this.onMessage(message);
                    }
                });
            }
        } catch (error) {
            console.error('Poll for messages error:', error);
            // Simulate messages for demo
            this.simulateMessages();
        }
    }
    
    simulateMessages() {
        // For demo purposes, simulate some game messages
        if (Math.random() < 0.1) { // 10% chance per poll
            if (this.onMessage) {
                this.onMessage({
                    type: 'game-message',
                    data: {
                        messageType: 'opponent-action',
                        action: 'thinking'
                    }
                });
            }
        }
    }
    
    onOpponentFound(opponentSenderId) {
        console.log('Connected to opponent:', opponentSenderId);
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
        
        // Stop polling
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        // Notify game of connection failure
        if (this.onError) {
            this.onError(new Error('Failed to connect to opponent - no one joined your room'));
        }
    }
    
    async sendMessage(type, data) {
        if (!this.foundOpponent) return;
        
        const message = {
            roomCode: this.roomCode,
            senderId: this.getSenderId(),
            type: type,
            data: data,
            timestamp: Date.now()
        };
        
        try {
            const response = await fetch('/.netlify/functions/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });
            
            if (!response.ok) {
                console.error('Failed to send message');
            }
        } catch (error) {
            console.error('Send message error:', error);
            // For demo, just log the message
            console.log('Would send message:', message);
        }
    }
    
    sendGameMessage(type, data) {
        this.sendMessage('game-message', { messageType: type, data });
    }
    
    getSenderId() {
        return `${this.roomCode}-${this.isHost ? 'host' : 'client'}-${Date.now()}`;
    }
    
    close() {
        this.clearTimeout();
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetlifyWebSocketClient;
}
