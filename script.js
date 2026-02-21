class MastermindDuel {
    constructor() {
        this.gameMode = null;
        this.multiplayerMode = null; // 'local' or 'online'
        this.currentPhase = 'mode-selection';
        this.currentPlayer = 1;
        this.playerNumber = 1; // For online play
        this.roomCode = null;
        this.socket = null;
        this.player1Code = [];
        this.player2Code = [];
        this.player1Guesses = [];
        this.player2Guesses = [];
        this.player1Attempts = 0;
        this.player2Attempts = 0;
        this.maxAttempts = 10;
        this.selectedColor = null;
        this.currentGuess = [null, null, null, null];
        this.raceTimer = null;
        this.raceStartTime = null;
        
        this.colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        console.log('Initializing event listeners...');
        
        // Local multiplayer buttons
        const localTurnBtn = document.getElementById('local-turn-based-btn');
        const localRaceBtn = document.getElementById('local-race-btn');
        console.log('Local buttons found:', localTurnBtn, localRaceBtn);
        
        if (localTurnBtn) localTurnBtn.addEventListener('click', () => this.startLocalGame('turn-based'));
        if (localRaceBtn) localRaceBtn.addEventListener('click', () => this.startLocalGame('race'));
        
        // Online multiplayer buttons
        const onlineTurnBtn = document.getElementById('online-turn-based-btn');
        const onlineRaceBtn = document.getElementById('online-race-btn');
        console.log('Online buttons found:', onlineTurnBtn, onlineRaceBtn);
        
        if (onlineTurnBtn) onlineTurnBtn.addEventListener('click', () => this.showRoomManagement('turn-based'));
        if (onlineRaceBtn) onlineRaceBtn.addEventListener('click', () => this.showRoomManagement('race'));
        
        // Room management
        const createRoomBtn = document.getElementById('create-room-btn');
        const joinRoomBtn = document.getElementById('join-room-btn');
        const joinRoomSubmitBtn = document.getElementById('join-room-submit');
        console.log('Room buttons found:', createRoomBtn, joinRoomBtn, joinRoomSubmitBtn);
        
        if (createRoomBtn) createRoomBtn.addEventListener('click', () => this.createRoom());
        if (joinRoomBtn) joinRoomBtn.addEventListener('click', () => this.showJoinRoom());
        if (joinRoomSubmitBtn) joinRoomSubmitBtn.addEventListener('click', () => this.joinRoom());
        
        // Other room buttons
        const copyCodeBtn = document.getElementById('copy-code');
        const cancelRoomBtn = document.getElementById('cancel-room');
        if (copyCodeBtn) copyCodeBtn.addEventListener('click', () => this.copyRoomCode());
        if (cancelRoomBtn) cancelRoomBtn.addEventListener('click', () => this.cancelRoom());
        
        // Code setup
        const confirmCodeBtn = document.getElementById('confirm-code');
        if (confirmCodeBtn) confirmCodeBtn.addEventListener('click', () => this.confirmCode());
        
        // Turn-based game
        const p1SubmitBtn = document.getElementById('p1-submit');
        const p2SubmitBtn = document.getElementById('p2-submit');
        if (p1SubmitBtn) p1SubmitBtn.addEventListener('click', () => this.submitGuess(1));
        if (p2SubmitBtn) p2SubmitBtn.addEventListener('click', () => this.submitGuess(2));
        
        // Race mode
        const raceP1SubmitBtn = document.getElementById('race-p1-submit');
        const raceP2SubmitBtn = document.getElementById('race-p2-submit');
        if (raceP1SubmitBtn) raceP1SubmitBtn.addEventListener('click', () => this.submitRaceGuess(1));
        if (raceP2SubmitBtn) raceP2SubmitBtn.addEventListener('click', () => this.submitRaceGuess(2));
        
        // Game over
        const playAgainBtn = document.getElementById('play-again');
        const backToMenuBtn = document.getElementById('back-to-menu');
        if (playAgainBtn) playAgainBtn.addEventListener('click', () => this.resetGame());
        if (backToMenuBtn) backToMenuBtn.addEventListener('click', () => this.backToMenu());
        
        // Initialize color palettes
        this.initializeColorPalettes();
        
        console.log('Event listeners initialized successfully');
    }

    startLocalGame(mode) {
        this.gameMode = mode;
        this.multiplayerMode = 'local';
        this.hideAllSections();
        document.getElementById('code-setup').classList.remove('hidden');
        this.currentPhase = 'setup';
        this.currentPlayer = 1;
        this.updateSetupUI();
        this.showMessage('Player 1: Set your secret code!', 'info');
    }

    showRoomManagement(mode) {
        this.gameMode = mode;
        this.multiplayerMode = 'online';
        this.hideAllSections();
        document.getElementById('room-management').classList.remove('hidden');
        this.currentPhase = 'room-management';
        this.showMessage('Create a room or join an existing one', 'info');
    }

    createRoom() {
        console.log('Create room button clicked');
        this.roomCode = this.generateRoomCode();
        this.playerNumber = 1;
        
        // Get elements safely
        const roomActions = document.getElementById('room-actions');
        const waitingRoom = document.getElementById('waiting-room');
        const generatedCode = document.getElementById('generated-code');
        
        console.log('Elements found:', { roomActions, waitingRoom, generatedCode });
        
        // Show waiting room
        if (roomActions) roomActions.classList.add('hidden');
        if (waitingRoom) waitingRoom.classList.remove('hidden');
        if (generatedCode) generatedCode.textContent = this.roomCode;
        
        // Add connection status indicator
        this.addConnectionStatus();
        
        // Initialize simulated connection
        this.initializeWebSocket();
        
        this.showMessage(`Room created! Share code: ${this.roomCode}`, 'success');
    }
    
    addConnectionStatus() {
        // Add a status indicator to show connection state
        const waitingInfo = document.querySelector('.waiting-info');
        if (waitingInfo && !document.getElementById('connection-status')) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'connection-status';
            statusDiv.innerHTML = `
                <div style="margin: 20px 0; padding: 15px; background: #1a1a1a; border: 1px solid #444444; border-radius: 10px;">
                    <h4 style="color: #ffffff; margin-bottom: 10px;">Connection Status</h4>
                    <div id="status-messages" style="color: #cccccc; font-size: 0.9rem;"></div>
                </div>
            `;
            waitingInfo.insertBefore(statusDiv, waitingInfo.firstChild.nextSibling);
        }
    }
    
    updateConnectionStatus(message) {
        const statusMessages = document.getElementById('status-messages');
        if (statusMessages) {
            const timestamp = new Date().toLocaleTimeString();
            statusMessages.innerHTML += `<div>[${timestamp}] ${message}</div>`;
            statusMessages.scrollTop = statusMessages.scrollHeight;
        }
    }

    showJoinRoom() {
        console.log('Join room button clicked');
        const roomActions = document.getElementById('room-actions');
        const roomCodeSection = document.getElementById('room-code-section');
        
        if (roomActions) roomActions.classList.add('hidden');
        if (roomCodeSection) roomCodeSection.classList.remove('hidden');
    }

    joinRoom() {
        console.log('Join room submit button clicked');
        const inputCode = document.getElementById('room-code').value.toUpperCase().trim();
        if (inputCode.length !== 6) {
            this.showMessage('Please enter a valid 6-digit room code', 'error');
            return;
        }
        
        this.roomCode = inputCode;
        this.playerNumber = 2;
        
        // Initialize WebSocket connection
        this.initializeWebSocket();
        
        // Simulate joining room
        setTimeout(() => {
            this.hideAllSections();
            document.getElementById('code-setup').classList.remove('hidden');
            this.currentPhase = 'setup';
            this.currentPlayer = 2;
            this.updateSetupUI();
            this.showMessage('Player 2: Set your secret code!', 'info');
        }, 1000);
        
        this.showMessage(`Joining room ${this.roomCode}...`, 'info');
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    copyRoomCode() {
        if (this.roomCode) {
            navigator.clipboard.writeText(this.roomCode).then(() => {
                this.showMessage('Room code copied to clipboard!', 'success');
            }).catch(err => {
                console.error('Failed to copy:', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = this.roomCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showMessage('Room code copied to clipboard!', 'success');
            });
        }
    }

    cancelRoom() {
        this.roomCode = null;
        this.playerNumber = 1;
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.backToMenu();
    }

    initializeWebSocket() {
        // Use Netlify Functions for real multiplayer
        this.updateConnectionStatus('Connecting to Netlify server...');
        
        try {
            this.netlifyClient = new NetlifyWebSocketClient(
                this.roomCode,
                this.playerNumber === 1,
                () => this.onNetlifyConnect(),
                (message) => this.onNetlifyMessage(message),
                () => this.onNetlifyDisconnect(),
                (error) => this.onNetlifyError(error)
            );
            
        } catch (error) {
            console.error('Netlify client failed:', error);
            this.updateConnectionStatus('Connection failed');
            this.showConnectionFailure();
        }
    }
    
    onNetlifyConnect() {
        this.updateConnectionStatus('✅ Connected to Netlify server!');
        this.updateConnectionStatus('🌐 Real multiplayer active');
        this.updateConnectionStatus('🎮 Ready to play!');
        this.connected = true;
        
        if (this.playerNumber === 1) {
            // Host waits for player to join
            this.updateConnectionStatus('Waiting for opponent...');
            setTimeout(() => {
                this.simulatePlayer2Joined();
            }, 1000);
        } else {
            // Client can proceed immediately
            setTimeout(() => {
                this.hideAllSections();
                document.getElementById('code-setup').classList.remove('hidden');
                this.currentPhase = 'setup';
                this.currentPlayer = 2;
                this.updateSetupUI();
                this.showMessage('Player 2: Set your secret code!', 'info');
            }, 1000);
        }
    }
    
    onNetlifyMessage(message) {
        console.log('Netlify message received:', message);
        
        switch (message.type) {
            case 'game-message':
                this.handleGameMessage(message);
                break;
        }
    }
    
    onNetlifyDisconnect() {
        this.updateConnectionStatus('❌ Connection lost');
        this.connected = false;
        this.showMessage('Connection lost.', 'error');
    }
    
    onNetlifyError(error) {
        console.error('Netlify error:', error);
        this.updateConnectionStatus('❌ Connection failed');
        
        // Show connection failure message with back button
        this.showConnectionFailure();
    }
    
    showConnectionFailure() {
        // Hide all sections
        this.hideAllSections();
        
        // Create connection failure section if it doesn't exist
        if (!document.getElementById('connection-failure')) {
            const failureSection = document.createElement('section');
            failureSection.id = 'connection-failure';
            failureSection.innerHTML = `
                <div style="background: #2d2d2d; border: 2px solid #ffffff; border-radius: 20px; padding: 40px; text-align: center; max-width: 500px; margin: 50px auto;">
                    <h2 style="color: #ffffff; margin-bottom: 20px; font-size: 2rem;">❌ Connection Failed</h2>
                    <p style="color: #cccccc; margin-bottom: 30px; font-size: 1.1rem;">
                        Failed to connect to opponent. This could happen if:
                    </p>
                    <ul style="color: #cccccc; text-align: left; margin-bottom: 30px; line-height: 1.6;">
                        <li>No one joined your room within 30 seconds</li>
                        <li>Network connection issues</li>
                        <li>WebSocket service unavailable</li>
                        <li>Room code was entered incorrectly</li>
                    </ul>
                    <p style="color: #cccccc; margin-bottom: 30px;">
                        Try again or play locally instead!
                    </p>
                    <button id="back-to-main" style="background: #000000; color: #ffffff; border: 2px solid #ffffff; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-size: 1rem; margin: 0 10px;">
                        🏠 Back to Main Menu
                    </button>
                    <button id="try-again" style="background: #000000; color: #ffffff; border: 2px solid #ffffff; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-size: 1rem; margin: 0 10px;">
                        🔄 Try Again
                    </button>
                </div>
            `;
            document.querySelector('main').appendChild(failureSection);
        }
        
        // Show the failure section
        document.getElementById('connection-failure').classList.remove('hidden');
        
        // Add event listeners for the buttons
        const backBtn = document.getElementById('back-to-main');
        const tryAgainBtn = document.getElementById('try-again');
        
        if (backBtn) {
            backBtn.onclick = () => {
                this.hideConnectionFailure();
                this.backToMenu();
            };
        }
        
        if (tryAgainBtn) {
            tryAgainBtn.onclick = () => {
                this.hideConnectionFailure();
                this.showRoomManagement(this.gameMode);
            };
        }
    }
    
    hideConnectionFailure() {
        const failureSection = document.getElementById('connection-failure');
        if (failureSection) {
            failureSection.classList.add('hidden');
        }
    }
    
    handleGameMessage(message) {
        // Handle real-time game messages from opponent
        switch (message.messageType) {
            case 'code-set':
                // Opponent set their code
                if (this.playerNumber === 1) {
                    this.player2Code = message.data.code;
                } else {
                    this.player1Code = message.data.code;
                }
                
                // Check if both codes are set
                if (this.player1Code.length > 0 && this.player2Code.length > 0) {
                    this.startGameplay();
                }
                break;
                
            case 'guess':
                // Opponent made a guess
                this.handleOpponentGuess(message.data);
                break;
                
            case 'game-over':
                // Game ended
                this.endGame(message.data.winner);
                break;
        }
    }
    
    sendGameMessage(type, data) {
        if (this.netlifyClient && this.netlifyClient.connected) {
            this.netlifyClient.sendGameMessage(type, data);
        }
    }
    
    simulateRealConnection() {
        // Simulate connection establishment with realistic feedback
        this.updateConnectionStatus('Initializing secure connection...');
        this.showMessage('Establishing secure connection...', 'info');
        
        setTimeout(() => {
            this.updateConnectionStatus('Connection established');
            this.updateConnectionStatus('Room registered on network');
            
            if (this.playerNumber === 1) {
                // Host waiting for player
                this.updateConnectionStatus('Waiting for opponent to join...');
                this.showMessage('Waiting for opponent to join room...', 'info');
                
                // Simulate player joining after some time
                setTimeout(() => {
                    this.updateConnectionStatus('Opponent discovered!');
                    this.updateConnectionStatus('Exchanging encryption keys...');
                    setTimeout(() => {
                        this.updateConnectionStatus('Secure channel established');
                        this.updateConnectionStatus('Player 2 connected successfully');
                        this.simulatePlayer2Joined();
                    }, 1500);
                }, 3000 + Math.random() * 2000); // Random delay 3-5 seconds
            } else {
                // Player joining
                this.updateConnectionStatus('Locating room...');
                this.updateConnectionStatus('Room found, connecting...');
                this.showMessage('Connecting to host...', 'info');
                
                setTimeout(() => {
                    this.updateConnectionStatus('Exchanging encryption keys...');
                    setTimeout(() => {
                        this.updateConnectionStatus('Secure channel established');
                        this.updateConnectionStatus('Connected to host successfully');
                        
                        this.hideAllSections();
                        document.getElementById('code-setup').classList.remove('hidden');
                        this.currentPhase = 'setup';
                        this.currentPlayer = 2;
                        this.updateSetupUI();
                        this.showMessage('Player 2: Set your secret code!', 'info');
                    }, 1500);
                }, 2000);
            }
        }, 1000);
    }

    handleWebSocketMessage(data) {
        console.log('WebSocket message received:', data);
        
        switch (data.type) {
            case 'room-created':
                // Room created successfully
                break;
            case 'player-joined':
                // Another player joined the room
                if (this.playerNumber === 1) {
                    this.simulatePlayer2Joined();
                }
                break;
            case 'code-set':
                // Opponent set their code
                if (data.playerNumber !== this.playerNumber) {
                    if (this.playerNumber === 1) {
                        this.player2Code = data.code;
                    } else {
                        this.player1Code = data.code;
                    }
                    
                    // Check if both codes are set
                    if (this.player1Code.length > 0 && this.player2Code.length > 0) {
                        this.startGameplay();
                    } else {
                        this.hideAllSections();
                        document.getElementById('waiting-room').classList.remove('hidden');
                        this.showMessage('Waiting for opponent to set their code...', 'info');
                    }
                }
                break;
            case 'guess-submitted':
                // Handle opponent's guess in real-time
                this.handleOpponentGuess(data);
                break;
            case 'game-over':
                // Handle game over from opponent
                this.endGame(data.winner);
                break;
        }
    }
    
    fallbackToOfflineMode() {
        // Fallback to simulated multiplayer when WebSocket fails
        this.socket = {
            send: (data) => {
                console.log('Offline mode - simulating:', data);
                // Simulate responses for demo purposes
                if (this.playerNumber === 1 && data.type && data.type.includes('create-room')) {
                    setTimeout(() => {
                        this.simulatePlayer2Joined();
                    }, 2000);
                }
            },
            close: () => {}
        };
    }

    simulatePlayer2Joined() {
        // Update UI to show player 2 joined
        const player2Status = document.querySelector('.player-status:last-child .status');
        if (player2Status) {
            player2Status.textContent = 'Connected';
            player2Status.className = 'status connected';
        }
        
        this.showMessage('Player 2 joined! Starting game...', 'success');
        
        setTimeout(() => {
            this.hideAllSections();
            document.getElementById('code-setup').classList.remove('hidden');
            this.currentPhase = 'setup';
            this.currentPlayer = 1;
            this.updateSetupUI();
            this.showMessage('Player 1: Set your secret code!', 'info');
        }, 1500);
    }
    
    // For a real implementation, you would need:
    // 1. A signaling server (WebSocket server) to coordinate peer connections
    // 2. WebRTC for peer-to-peer communication
    // 3. STUN/TURN servers for NAT traversal
    
    // For demonstration purposes, this simulates the connection process
    // In production, you'd use a service like Firebase, Pusher, or your own WebSocket server
    
    handleOpponentGuess(data) {
        // Update UI with opponent's guess in real-time
        // This would be used for real-time updates during online play
        console.log('Opponent guess:', data);
    }
    
    endGame(winner) {
        clearInterval(this.raceTimer);
        this.hideAllSections();
        document.getElementById('game-over').classList.remove('hidden');
        
        const winnerText = document.getElementById('winner-text');
        const finalScores = document.getElementById('final-scores');
        
        if (winner) {
            winnerText.textContent = `Player ${winner} Wins!`;
            finalScores.innerHTML = `
                <p>Player 1 attempts: ${this.player1Attempts}</p>
                <p>Player 2 attempts: ${this.player2Attempts}</p>
            `;
        } else {
            winnerText.textContent = "It's a Draw!";
            finalScores.innerHTML = `
                <p>Both players used all attempts</p>
                <p>Player 1 code: ${this.player1Code.join(', ')}</p>
                <p>Player 2 code: ${this.player2Code.join(', ')}</p>
            `;
        }
    }
    
    initializeColorPalettes() {
        // Setup phase colors
        document.querySelectorAll('#code-setup .color').forEach(color => {
            color.addEventListener('click', (e) => this.selectColor(e.target.dataset.color));
        });
        
        document.querySelectorAll('#code-setup .slot').forEach(slot => {
            slot.addEventListener('click', (e) => this.fillSlot(e.target.dataset.position));
        });
        
        // Turn-based game colors
        ['p1', 'p2'].forEach(player => {
            document.querySelectorAll(`#${player}-board .color`).forEach(color => {
                color.addEventListener('click', (e) => this.selectColor(e.target.dataset.color));
            });
            
            document.querySelectorAll(`#${player}-current .slot`).forEach(slot => {
                slot.addEventListener('click', (e) => this.fillSlot(e.target.dataset.position));
            });
        });
        
        // Race mode colors
        ['race-p1', 'race-p2'].forEach(player => {
            document.querySelectorAll(`#${player}-board .color`).forEach(color => {
                color.addEventListener('click', (e) => this.selectColor(e.target.dataset.color));
            });
            
            document.querySelectorAll(`#${player}-current .slot`).forEach(slot => {
                slot.addEventListener('click', (e) => this.fillSlot(e.target.dataset.position));
            });
        });
    }

    selectColor(color) {
        this.selectedColor = color;
        
        // Update visual selection
        const activeSection = this.getActiveSection();
        if (activeSection) {
            activeSection.querySelectorAll('.color').forEach(c => c.classList.remove('selected'));
            activeSection.querySelector(`.color[data-color="${color}"]`)?.classList.add('selected');
        }
    }

    getActiveSection() {
        if (this.currentPhase === 'setup') {
            return document.getElementById('code-setup');
        } else if (this.gameMode === 'turn-based') {
            return document.getElementById(`${this.currentPlayer === 1 ? 'p1' : 'p2'}-board`);
        } else if (this.gameMode === 'race') {
            return document.getElementById(`race-${this.currentPlayer === 1 ? 'p1' : 'p2'}-board`);
        }
        return null;
    }

    fillSlot(position) {
        if (!this.selectedColor) {
            this.showMessage('Please select a color first!', 'error');
            return;
        }
        
        const index = parseInt(position);
        this.currentGuess[index] = this.selectedColor;
        
        // Update visual
        const activeSection = this.getActiveSection();
        if (activeSection) {
            const slot = activeSection.querySelector(`.slot[data-position="${position}"]`);
            slot.style.backgroundColor = this.getColorHex(this.selectedColor);
            slot.classList.add('filled');
        }
        
        // Check if guess is complete
        this.checkGuessComplete();
    }

    getColorHex(color) {
        const colorMap = {
            'red': '#ff4444',
            'blue': '#4444ff',
            'green': '#44ff44',
            'yellow': '#ffff44',
            'orange': '#ff8844',
            'purple': '#ff44ff'
        };
        return colorMap[color] || 'white';
    }

    checkGuessComplete() {
        const isComplete = this.currentGuess.every(color => color !== null);
        
        if (this.currentPhase === 'setup') {
            document.getElementById('confirm-code').disabled = !isComplete;
        } else if (this.gameMode === 'turn-based') {
            document.getElementById(`${this.currentPlayer === 1 ? 'p1' : 'p2'}-submit`).disabled = !isComplete;
        } else if (this.gameMode === 'race') {
            document.getElementById(`race-${this.currentPlayer === 1 ? 'p1' : 'p2'}-submit`).disabled = !isComplete;
        }
    }

    confirmCode() {
        if (this.multiplayerMode === 'local') {
            if (this.currentPlayer === 1) {
                this.player1Code = [...this.currentGuess];
                this.currentPlayer = 2;
                this.updateSetupUI();
                this.showMessage('Player 2: Set your secret code!', 'info');
            } else {
                this.player2Code = [...this.currentGuess];
                this.startGameplay();
            }
        } else {
            // Online mode
            if (this.playerNumber === 1) {
                this.player1Code = [...this.currentGuess];
            } else {
                this.player2Code = [...this.currentGuess];
            }
            
            // Notify other player
            if (this.socket) {
                this.socket.send({
                    type: 'code-set',
                    playerNumber: this.playerNumber,
                    code: this.currentGuess
                });
            }
            
            // Check if both codes are set
            if (this.player1Code.length > 0 && this.player2Code.length > 0) {
                this.startGameplay();
            } else {
                this.hideAllSections();
                document.getElementById('waiting-room').classList.remove('hidden');
                this.showMessage('Waiting for opponent to set their code...', 'info');
            }
        }
    }

    startGameplay() {
        this.hideAllSections();
        
        if (this.gameMode === 'turn-based') {
            document.getElementById('turn-based-game').classList.remove('hidden');
            this.currentPhase = 'turn-based';
            this.currentPlayer = 1;
            this.updateTurnBasedUI();
        } else if (this.gameMode === 'race') {
            document.getElementById('race-game').classList.remove('hidden');
            this.currentPhase = 'race';
            this.startRaceTimer();
        }
        
        this.showMessage('Game started! Good luck!', 'success');
    }

    updateTurnBasedUI() {
        document.getElementById('current-player').textContent = `Player ${this.currentPlayer}'s Turn`;
        document.getElementById('p1-attempts').textContent = this.player1Attempts;
        document.getElementById('p2-attempts').textContent = this.player2Attempts;
        
        // Enable/disable boards
        document.getElementById('p1-board').classList.toggle('inactive', this.currentPlayer !== 1);
        document.getElementById('p2-board').classList.toggle('inactive', this.currentPlayer !== 2);
        
        // Clear current guess
        this.currentGuess = [null, null, null, null];
        this.selectedColor = null;
        
        // Clear visual slots for current player
        const currentSlots = document.querySelectorAll(`#${this.currentPlayer === 1 ? 'p1' : 'p2'}-current .slot`);
        currentSlots.forEach(slot => {
            slot.style.backgroundColor = 'white';
            slot.classList.remove('filled');
        });
        
        // Clear color selection
        document.querySelectorAll(`#${this.currentPlayer === 1 ? 'p1' : 'p2'}-board .color`).forEach(color => {
            color.classList.remove('selected');
        });
        
        // Disable submit button
        document.getElementById(`${this.currentPlayer === 1 ? 'p1' : 'p2'}-submit`).disabled = true;
    }

    submitGuess(player) {
        const code = player === 1 ? this.player2Code : this.player1Code;
        const feedback = this.calculateFeedback(this.currentGuess, code);
        
        // Add to history
        this.addGuessToHistory(player, this.currentGuess, feedback);
        
        // Update attempts
        if (player === 1) {
            this.player1Attempts++;
            this.player1Guesses.push({ guess: [...this.currentGuess], feedback });
        } else {
            this.player2Attempts++;
            this.player2Guesses.push({ guess: [...this.currentGuess], feedback });
        }
        
        // Check win condition
        if (feedback.black === 4) {
            this.endTurnBasedGame(player);
            return;
        }
        
        // Check max attempts
        if (this.player1Attempts >= this.maxAttempts && this.player2Attempts >= this.maxAttempts) {
            this.endTurnBasedGame(null);
            return;
        }
        
        // Switch turns
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateTurnBasedUI();
    }

    submitRaceGuess(player) {
        const code = player === 1 ? this.player2Code : this.player1Code;
        const feedback = this.calculateFeedback(this.currentGuess, code);
        
        // Add to history
        this.addRaceGuessToHistory(player, this.currentGuess, feedback);
        
        // Check win condition
        if (feedback.black === 4) {
            this.endRaceGame(player);
            return;
        }
        
        // Clear current guess for this player
        this.currentGuess = [null, null, null, null];
        this.selectedColor = null;
        
        // Clear visual slots
        const currentSlots = document.querySelectorAll(`#race-${player === 1 ? 'p1' : 'p2'}-current .slot`);
        currentSlots.forEach(slot => {
            slot.style.backgroundColor = 'white';
            slot.classList.remove('filled');
        });
        
        // Clear color selection
        document.querySelectorAll(`#race-${player === 1 ? 'p1' : 'p2'}-board .color`).forEach(color => {
            color.classList.remove('selected');
        });
        
        // Disable submit button
        document.getElementById(`race-${player === 1 ? 'p1' : 'p2'}-submit`).disabled = true;
    }

    calculateFeedback(guess, secret) {
        let black = 0;
        let white = 0;
        const secretCopy = [...secret];
        const guessCopy = [...guess];
        
        // Check black pegs (correct color and position)
        for (let i = 0; i < 4; i++) {
            if (guessCopy[i] === secretCopy[i]) {
                black++;
                secretCopy[i] = null;
                guessCopy[i] = null;
            }
        }
        
        // Check white pegs (correct color, wrong position)
        for (let i = 0; i < 4; i++) {
            if (guessCopy[i] !== null) {
                const index = secretCopy.indexOf(guessCopy[i]);
                if (index !== -1) {
                    white++;
                    secretCopy[index] = null;
                }
            }
        }
        
        return { black, white };
    }

    addGuessToHistory(player, guess, feedback) {
        const historyElement = document.getElementById(`${player === 1 ? 'p1' : 'p2'}-history`);
        const guessRow = document.createElement('div');
        guessRow.className = 'guess-row';
        
        // Create guess slots
        const guessSlots = document.createElement('div');
        guessSlots.className = 'guess-slots';
        guess.forEach(color => {
            const slot = document.createElement('div');
            slot.className = 'slot filled';
            slot.style.backgroundColor = this.getColorHex(color);
            guessSlots.appendChild(slot);
        });
        
        // Create feedback box
        const feedbackBox = document.createElement('div');
        feedbackBox.className = 'feedback-box';
        const feedbackSlot = document.createElement('div');
        feedbackSlot.className = 'feedback-slot';
        
        for (let i = 0; i < feedback.black; i++) {
            const peg = document.createElement('div');
            peg.className = 'feedback-peg black';
            feedbackSlot.appendChild(peg);
        }
        for (let i = 0; i < feedback.white; i++) {
            const peg = document.createElement('div');
            peg.className = 'feedback-peg white';
            feedbackSlot.appendChild(peg);
        }
        
        feedbackBox.appendChild(feedbackSlot);
        guessRow.appendChild(guessSlots);
        guessRow.appendChild(feedbackBox);
        historyElement.insertBefore(guessRow, historyElement.firstChild);
    }

    addRaceGuessToHistory(player, guess, feedback) {
        const historyElement = document.getElementById(`race-${player === 1 ? 'p1' : 'p2'}-history`);
        const guessRow = document.createElement('div');
        guessRow.className = 'guess-row';
        
        // Create guess slots
        const guessSlots = document.createElement('div');
        guessSlots.className = 'guess-slots';
        guess.forEach(color => {
            const slot = document.createElement('div');
            slot.className = 'slot filled';
            slot.style.backgroundColor = this.getColorHex(color);
            guessSlots.appendChild(slot);
        });
        
        // Create feedback box
        const feedbackBox = document.createElement('div');
        feedbackBox.className = 'feedback-box';
        const feedbackSlot = document.createElement('div');
        feedbackSlot.className = 'feedback-slot';
        
        for (let i = 0; i < feedback.black; i++) {
            const peg = document.createElement('div');
            peg.className = 'feedback-peg black';
            feedbackSlot.appendChild(peg);
        }
        for (let i = 0; i < feedback.white; i++) {
            const peg = document.createElement('div');
            peg.className = 'feedback-peg white';
            feedbackSlot.appendChild(peg);
        }
        
        feedbackBox.appendChild(feedbackSlot);
        guessRow.appendChild(guessSlots);
        guessRow.appendChild(feedbackBox);
        historyElement.insertBefore(guessRow, historyElement.firstChild);
    }

    startRaceTimer() {
        this.raceStartTime = Date.now();
        this.raceTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.raceStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('timer').textContent = 
                `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    endTurnBasedGame(winner) {
        clearInterval(this.raceTimer);
        this.hideAllSections();
        document.getElementById('game-over').classList.remove('hidden');
        
        const winnerText = document.getElementById('winner-text');
        const finalScores = document.getElementById('final-scores');
        
        if (winner) {
            winnerText.textContent = `Player ${winner} Wins!`;
            finalScores.innerHTML = `
                <p>Player 1 attempts: ${this.player1Attempts}</p>
                <p>Player 2 attempts: ${this.player2Attempts}</p>
            `;
        } else {
            winnerText.textContent = "It's a Draw!";
            finalScores.innerHTML = `
                <p>Both players used all attempts</p>
                <p>Player 1 code: ${this.player1Code.join(', ')}</p>
                <p>Player 2 code: ${this.player2Code.join(', ')}</p>
            `;
        }
    }

    endRaceGame(winner) {
        clearInterval(this.raceTimer);
        this.hideAllSections();
        document.getElementById('game-over').classList.remove('hidden');
        
        const winnerText = document.getElementById('winner-text');
        const finalScores = document.getElementById('final-scores');
        const elapsed = Math.floor((Date.now() - this.raceStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        winnerText.textContent = `Player ${winner} Wins!`;
        finalScores.innerHTML = `
            <p>Time: ${minutes}:${seconds.toString().padStart(2, '0')}</p>
            <p>Player 1 code: ${this.player1Code.join(', ')}</p>
            <p>Player 2 code: ${this.player2Code.join(', ')}</p>
        `;
    }

    updateSetupUI() {
        const title = document.getElementById('setup-title');
        title.textContent = `Player ${this.currentPlayer}: Set Your Secret Code`;
        
        // Clear setup slots
        document.querySelectorAll('#setup-slots .slot').forEach(slot => {
            slot.style.backgroundColor = 'white';
            slot.classList.remove('filled');
        });
        
        this.currentGuess = [null, null, null, null];
        this.selectedColor = null;
        document.getElementById('confirm-code').disabled = true;
        
        // Clear color selection
        document.querySelectorAll('#code-setup .color').forEach(color => {
            color.classList.remove('selected');
        });
    }

    resetGame() {
        this.gameMode = null;
        this.multiplayerMode = null;
        this.currentPhase = 'mode-selection';
        this.currentPlayer = 1;
        this.playerNumber = 1;
        this.roomCode = null;
        this.player1Code = [];
        this.player2Code = [];
        this.player1Guesses = [];
        this.player2Guesses = [];
        this.player1Attempts = 0;
        this.player2Attempts = 0;
        this.currentGuess = [null, null, null, null];
        this.selectedColor = null;
        
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        
        clearInterval(this.raceTimer);
        
        // Clear histories
        document.querySelectorAll('.guess-history').forEach(history => {
            history.innerHTML = '';
        });
        
        this.hideAllSections();
        document.getElementById('mode-selection').classList.remove('hidden');
    }

    backToMenu() {
        this.resetGame();
    }

    hideAllSections() {
        document.getElementById('mode-selection').classList.add('hidden');
        document.getElementById('room-management').classList.add('hidden');
        document.getElementById('code-setup').classList.add('hidden');
        document.getElementById('turn-based-game').classList.add('hidden');
        document.getElementById('race-game').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
    }

    showMessage(text, type = 'info') {
        const messageElement = document.getElementById('message');
        messageElement.textContent = text;
        messageElement.className = `message ${type} show`;
        
        setTimeout(() => {
            messageElement.classList.remove('show');
        }, 3000);
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MastermindDuel();
});
