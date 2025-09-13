import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import { BOARD_SIZE } from '../constants';
import type { Player, OnlineGameData } from '../types';
import { StartPosition } from '../types';

// Using a public MQTT broker for demonstration purposes.
const MQTT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const TOPIC_PREFIX = 'gemini-maze-race/v3'; // A stable prefix for all sessions

type LobbyMessage = {
    type: 'JOIN_REQUEST';
    lobbyId: string;
    playerData: Omit<Player, 'id' | 'color' | 'position' | 'goalRow'>;
    startPos: StartPosition;
    duration: number;
};

type MatchMessage = {
    type: 'MATCH_FOUND';
    gameId: string;
    player1: Player;
    player2: Player;
    duration: number;
};

class OnlineGameService {
    private client: MqttClient | null = null;
    private connectionPromise: Promise<MqttClient> | null = null;
    private onGameStateUpdateCallback: ((data: OnlineGameData) => void) | null = null;
    private onMatchFoundCallback: ((gameId: string, playerId: 1 | 2, state: OnlineGameData) => void) | null = null;
    private subscribedGameId: string | null = null;
    private subscribedLobbyId: string | null = null;

    private connect(): Promise<MqttClient> {
        if (this.client?.connected) {
            return Promise.resolve(this.client);
        }
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve, reject) => {
            const client = mqtt.connect(MQTT_BROKER_URL);
            
            const onError = (err: Error) => {
                console.error('MQTT Connection Error:', err);
                client.end(true);
                this.connectionPromise = null;
                this.client = null;
                reject(err);
            };

            client.on('connect', () => {
                console.log('MQTT Client Connected');
                this.client = client;
                client.removeListener('error', onError);
                client.on('message', this.handleMessage.bind(this));
                resolve(client);
            });

            client.on('error', onError);
        });

        return this.connectionPromise;
    }
    
    private handleMessage(topic: string, message: Uint8Array) {
        try {
            const msgStr = message.toString();
            if (!msgStr) return;
            const data = JSON.parse(msgStr);

            if (topic === `${TOPIC_PREFIX}/game/${this.subscribedGameId}/state` && this.onGameStateUpdateCallback) {
                this.onGameStateUpdateCallback(data as OnlineGameData);
            }
            if (topic === `${TOPIC_PREFIX}/lobby/match/${this.subscribedLobbyId}` && this.onMatchFoundCallback) {
                if (data.type === 'MATCH_FOUND') this.handleMatchFound(data);
            }
            if (topic === `${TOPIC_PREFIX}/lobby/join` && data.type === 'JOIN_REQUEST') {
                if (this.onMatchFoundCallback && data.lobbyId !== this.subscribedLobbyId) {
                    this.createMatchFromLobby(data as LobbyMessage);
                }
            }
        } catch (error) {
            console.error('Error parsing MQTT message:', error);
        }
    }

    public async publishGameState(gameId: string, state: OnlineGameData) {
        const client = await this.connect();
        client.publish(`${TOPIC_PREFIX}/game/${gameId}/state`, JSON.stringify(state), { qos: 1, retain: true });
    }

    public onGameStateUpdate(gameId: string, callback: (data: OnlineGameData) => void): () => void {
        this.subscribedGameId = gameId;
        this.onGameStateUpdateCallback = callback;
        const topic = `${TOPIC_PREFIX}/game/${gameId}/state`;

        this.connect().then(client => client.subscribe(topic, { qos: 1 }));

        return () => {
            this.connect().then(client => {
                client.unsubscribe(topic);
                this.subscribedGameId = null;
                this.onGameStateUpdateCallback = null;
            });
        };
    }

    public async createGame(player1: Player, duration: number, startPos: StartPosition): Promise<string> {
        await this.connect();
        const gameId = Math.random().toString(36).substr(2, 6);
        const initialGameState: OnlineGameData = {
            players: { 1: player1 },
            walls: [],
            currentPlayerId: 1,
            winner: null,
            gameTime: 0,
            turnTime: duration,
            timestamp: Date.now(),
        };
        await this.publishGameState(gameId, initialGameState);
        return gameId;
    }

    public async joinGame(gameId: string, player2Name: string): Promise<OnlineGameData | null> {
        const gameState = await this.getInitialGameState(gameId);
        if (!gameState || Object.keys(gameState.players).length !== 1) {
            return null;
        }

        const p1Col = gameState.players[1].position.c;
        const p2Col = (BOARD_SIZE - 1) - p1Col;
        const initialWalls = gameState.players[1].wallsLeft;
        const player2: Player = { id: 2, name: player2Name, color: '#ec4899', position: { r: 0, c: p2Col }, wallsLeft: initialWalls, goalRow: BOARD_SIZE - 1, };
        gameState.players[2] = player2;
        gameState.timestamp = Date.now();
        
        await this.publishGameState(gameId, gameState);
        return gameState;
    }
    
    private getInitialGameState(gameId: string): Promise<OnlineGameData | null> {
        return new Promise(async (resolve) => {
            const client = await this.connect();
            const topic = `${TOPIC_PREFIX}/game/${gameId}/state`;

            const timeoutId = setTimeout(() => {
                client.removeListener('message', messageHandler);
                client.unsubscribe(topic);
                resolve(null);
            }, 8000); // 8-second timeout

            const messageHandler = (t: string, payload: Uint8Array) => {
                if (t === topic) {
                    clearTimeout(timeoutId);
                    client.removeListener('message', messageHandler);
                    client.unsubscribe(topic);
                    const msgStr = payload.toString();
                    if (msgStr) resolve(JSON.parse(msgStr));
                    else resolve(null);
                }
            };
            client.on('message', messageHandler);
            client.subscribe(topic, { qos: 1 });
        });
    }

    public fetchCurrentGameState(gameId: string): Promise<OnlineGameData | null> {
        return new Promise(async (resolve) => {
            const client = await this.connect();
            const topic = `${TOPIC_PREFIX}/game/${gameId}/state`;

            const timeoutId = setTimeout(() => {
                client.removeListener('message', messageHandler);
                client.unsubscribe(topic);
                resolve(null);
            }, 950); // Shorter timeout for polling to match 1s interval

            const messageHandler = (t: string, payload: Uint8Array) => {
                if (t === topic) {
                    clearTimeout(timeoutId);
                    client.removeListener('message', messageHandler);
                    client.unsubscribe(topic);
                    const msgStr = payload.toString();
                    if (msgStr) resolve(JSON.parse(msgStr));
                    else resolve(null);
                }
            };
            client.on('message', messageHandler);
            client.subscribe(topic, { qos: 1 });
        });
    }

    public async leaveGame(gameId: string, finalState?: OnlineGameData) {
        const client = await this.connect();
        if (finalState) {
            await this.publishGameState(gameId, finalState);
            // Small delay to increase chance of delivery before clearing the retained message.
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        // Clear the retained message for the topic to prevent new players from joining an old game.
        client.publish(`${TOPIC_PREFIX}/game/${gameId}/state`, '', { qos: 1, retain: true });
    }
    
    public findMatch(playerData: Omit<Player, 'id'|'color'|'position'|'goalRow'>, duration: number, startPos: StartPosition, callback: (gameId: string, playerId: 1 | 2, state: OnlineGameData) => void) {
        this.connect().then(client => {
            this.onMatchFoundCallback = callback;
            this.subscribedLobbyId = Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('matchmaking_player', JSON.stringify(playerData));

            client.subscribe(`${TOPIC_PREFIX}/lobby/join`, { qos: 1 });
            client.subscribe(`${TOPIC_PREFIX}/lobby/match/${this.subscribedLobbyId}`, { qos: 1 });

            const joinRequest: LobbyMessage = { type: 'JOIN_REQUEST', lobbyId: this.subscribedLobbyId, playerData, startPos, duration };
            client.publish(`${TOPIC_PREFIX}/lobby/join`, JSON.stringify(joinRequest), { qos: 1 });
        });
    }

    public cancelFindMatch() {
        if (!this.subscribedLobbyId) return;
        this.connect().then(client => {
            client.unsubscribe(`${TOPIC_PREFIX}/lobby/join`);
            client.unsubscribe(`${TOPIC_PREFIX}/lobby/match/${this.subscribedLobbyId}`);
            this.subscribedLobbyId = null;
            this.onMatchFoundCallback = null;
            sessionStorage.removeItem('matchmaking_player');
        });
    }
    
    private handleMatchFound(matchData: MatchMessage) {
        if (!this.onMatchFoundCallback) return;
        const initialState: OnlineGameData = {
            players: { 1: matchData.player1, 2: matchData.player2 },
            walls: [],
            currentPlayerId: 1,
            winner: null,
            gameTime: 0,
            turnTime: matchData.duration,
            timestamp: Date.now(),
        };
        // The player receiving MATCH_FOUND is the Joiner, who is always Player 2
        this.onMatchFoundCallback(matchData.gameId, 2, initialState);
        this.cancelFindMatch();
    }
    
    private createMatchFromLobby(request: LobbyMessage) {
        if (!this.onMatchFoundCallback) return;

        // The player who was waiting (us) is Player 1
        const p1Data = JSON.parse(sessionStorage.getItem('matchmaking_player') || '{}');
        // The player who sent the request is Player 2
        const p2Data = request.playerData;
        p2Data.wallsLeft = p1Data.wallsLeft; // Enforce fairness: both players get same wall count

        const p1Col = request.startPos === StartPosition.CENTER ? Math.floor(BOARD_SIZE / 2) : Math.floor(Math.random() * BOARD_SIZE);
        const p2Col = (BOARD_SIZE - 1) - p1Col;
        
        const p1: Player = { ...p1Data, id: 1, color: '#22d3ee', position: { r: BOARD_SIZE - 1, c: p1Col }, goalRow: 0 };
        const p2: Player = { ...p2Data, id: 2, color: '#ec4899', position: { r: 0, c: p2Col }, goalRow: BOARD_SIZE - 1 };
        
        const gameId = Math.random().toString(36).substr(2, 6);
        const matchMessage: MatchMessage = { type: 'MATCH_FOUND', gameId, player1: p1, player2: p2, duration: request.duration };

        this.connect().then(client => {
            // Send the match data to Player 2
            client.publish(`${TOPIC_PREFIX}/lobby/match/${request.lobbyId}`, JSON.stringify(matchMessage), { qos: 1 });
        });
        
        const initialState: OnlineGameData = {
            players: { 1: p1, 2: p2 },
            walls: [],
            currentPlayerId: 1,
            winner: null,
            gameTime: 0,
            turnTime: request.duration,
            timestamp: Date.now(),
        };
        this.publishGameState(gameId, initialState);
        // We are Player 1, so we call our callback with playerId: 1
        this.onMatchFoundCallback(gameId, 1, initialState);
        this.cancelFindMatch();
    }
}

export const onlineService = new OnlineGameService();