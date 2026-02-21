// Internet WebSocket Client for Cross-Network Multiplayer
class InternetWebSocketClient {
    constructor(roomCode, isHost, onConnect, onMessage, onDisconnect, onError) {
        this.roomCode = roomCode;
        this.isHost = isHost;
        this.onConnect = onConnect;
        this.onMessage = onMessage;
        this.onDisconnect = onDisconnect;
        this.onError = onError;
        this.connected = false;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.connect();
    }
    
    connect() {
        try {
            // Use a reliable public WebSocket service
            const wsUrl = 'wss://ws.postman-echo.com/raw';
            console.log('Connecting to internet WebSocket:', wsUrl);
            
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                console.log('Connected to internet WebSocket service');
                this.connected = true;
                this.reconnectAttempts = 0;
                
                // Announce ourselves to the room
                this.send({
                    type: 'announce',
                    roomCode: this.roomCode,
                    isHost: this.isHost,
                    timestamp: Date.now()
                });
                
                // Start room discovery
                this.startRoomDiscovery();
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
            
            this.socket.onclose = () => {
                console.log('Internet WebSocket connection closed');
                this.connected = false;
                
                // Attempt reconnection
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                    setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
                } else {
                    if (this.onDisconnect) this.onDisconnect();
                }
            };
            
            this.socket.onerror = (error) => {
                console.error('Internet WebSocket error:', error);
                if (this.onError) this.onError(error);
            };
            
        } catch (error) {
            console.error('Failed to create internet WebSocket:', error);
            if (this.onError) this.onError(error);
        }
    }
    
    startRoomDiscovery() {
        // Send discovery message to find other players in the same room
        this.send({
            type: 'discover',
            roomCode: this.roomCode,
            isHost: this.isHost,
            timestamp: Date.now()
        });
        
        // Send discovery every 5 seconds
        this.discoveryInterval = setInterval(() => {
            if (this.connected) {
                this.send({
                    type: 'discover',
                    roomCode: this.roomCode,
                    isHost: this.isHost,
                    timestamp: Date.now()
                });
            }
        }, 5000);
    }
    
    handleMessage(data) {
        console.log('Received internet message:', data);
        
        // Handle echo service responses and room coordination
        if (data.type === 'echo' || !data.type) {
            // This is an echo service, so we need to handle room coordination differently
            this.handleEchoCoordination(data);
            return;
        }
        
        switch (data.type) {
            case 'discover':
                this.handleDiscovery(data);
                break;
            case 'announce':
                this.handleAnnounce(data);
                break;
            case 'game-message':
                this.handleGameMessage(data);
                break;
            case 'player-left':
                this.handlePlayerLeft(data);
                break;
        }
    }
    
    handleEchoCoordination(data) {
        // Since we're using an echo service, we need to coordinate rooms differently
        // The echo service just bounces back our messages, so we'll use a different approach
        
        if (data.roomCode === this.roomCode && data.senderId !== this.getSenderId()) {
            // This is a message from another player in our room
            if (data.messageType === 'discover' && data.isHost !== this.isHost) {
                // Found the other player!
                this.onPlayerFound(data);
            } else if (data.messageType === 'game-message') {
                // Game message from opponent
                if (this.onMessage) this.onMessage(data);
            }
        }
    }
    
    handleDiscovery(data) {
        if (data.roomCode === this.roomCode && data.isHost !== this.isHost) {
            // Found another player in our room
            this.onPlayerFound(data);
        }
    }
    
    handleAnnounce(data) {
        if (data.roomCode === this.roomCode && data.isHost !== this.isHost) {
            // Another player announced themselves
            this.onPlayerFound(data);
        }
    }
    
    onPlayerFound(data) {
        console.log('Found opponent in room!');
        
        // Clear discovery interval
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
            this.discoveryInterval = null;
        }
        
        // Notify game that we're connected
        if (this.onConnect) {
            this.onConnect();
        }
        
        // Send acknowledgment
        this.send({
            type: 'player-found',
            roomCode: this.roomCode,
            isHost: this.isHost,
            timestamp: Date.now()
        });
    }
    
    handleGameMessage(data) {
        if (this.onMessage) {
            this.onMessage(data);
        }
    }
    
    handlePlayerLeft(data) {
        console.log('Player left the room');
        if (this.onDisconnect) {
            this.onDisconnect();
        }
    }
    
    getSenderId() {
        // Generate a unique sender ID based on room code and host status
        return `${this.roomCode}-${this.isHost ? 'host' : 'client'}`;
    }
    
    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            // Add sender info to message
            const messageWithSender = {
                ...message,
                senderId: this.getSenderId(),
                timestamp: Date.now()
            };
            
            this.socket.send(JSON.stringify(messageWithSender));
        } else {
            console.error('Internet WebSocket not connected');
        }
    }
    
    sendGameMessage(type, data) {
        this.send({
            type: 'game-message',
            roomCode: this.roomCode,
            messageType: type,
            data: data
        });
    }
    
    close() {
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
        }
        
        if (this.socket) {
            this.socket.close();
        }
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InternetWebSocketClient;
}
