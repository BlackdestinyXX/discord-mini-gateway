import { EventEmitter } from 'events';
import { request } from 'undici';
import WebSocket from 'ws';

interface ClientOptions {
    shards?: number
    intents?: number
}

interface SessionStartLimit {
    max_concurrency: number,
    remaining: number,
    reset_after: number,
    total: number
}

interface BotGatewayResponse {
    url: string,
    session_start_limit: SessionStartLimit,
    shards: number
}

interface Payload {
    op: number,
    d?: any,
    s?: number,
    t?: string,
}

export default class Client extends EventEmitter {

    token: any;
    shards: number = 1;
    intents: number = 0;
    url: string = '';
    heartbeat_interval: number | null = null;
    websocket: WebSocket | null = null;
    last_sequence: number | null = null;
    resume_gateway_url: string = '';
    session_id: string = '';

    constructor({ shards, intents }: ClientOptions = {}) {
        super()
        if (shards) this.shards = shards;
        if (intents) this.intents = intents;
    }

    private async getGatewayBot(): Promise<BotGatewayResponse> {

        const { statusCode, body } = await request('https://discord.com/api/v10/gateway/bot', {
            headers: {
                'Authorization': `Bot ${this.token}`
            }
        })

        if (statusCode !== 200) {
            throw new Error('Error while fetching gateway bot endpoint');
        }

        const data: BotGatewayResponse = (await body.json()) as BotGatewayResponse;

        if (statusCode == 200) {
            this.shards = data.shards;
            this.url = data.url;
        }

        return data;

    }

    private startHeartbeating() {
        setInterval(() => {
            this.beat()
        }, this.heartbeat_interval || 42000)
    }

    private emitWebsocketError(error: string, errorCode: string) {
        this.emit('debug', `${error}: connection closed with code ${errorCode}`)
    }

    private async openConnection(connectionUrl?: string) {
        this.websocket = new WebSocket(connectionUrl || this.url + "?v=10&encoding=json");

        this.websocket.on('error', (error) => {
            this.emit('debug', error)
        });

        this.websocket.on('close', (event) => {
            switch (event) {
                case 4000:
                    this.emitWebsocketError('Unknown error', "4000")
                    this.resume()
                    break;
                case 4001:
                    this.emitWebsocketError('Unknown opcode', "4001")
                    this.resume()
                    break;
                case 4002:
                    this.emitWebsocketError('Decode error', "4002")
                    this.resume()
                    break;
                case 4003:
                    this.emitWebsocketError('Not authenticated', "4003")
                    this.resume()
                    break;
                case 4004:
                    this.emitWebsocketError('Authentication failed', "4004")
                    break;
                case 4005:
                    this.emitWebsocketError('Already authenticated', "4005")
                    this.resume()
                    break;
                case 4007: 
                    this.emitWebsocketError('Invalid seq', "4007")
                    this.resume()
                    break;
                case 4008:
                    this.emitWebsocketError('Rate limited', "4008")
                    break;
                case 4009:
                    this.emitWebsocketError('Session timeout', "4009")
                    this.resume()
                    break;
                case 4010:
                    this.emitWebsocketError('Invalid shard', "4010")
                    break;
                case 4011:
                    this.emitWebsocketError('Sharding required', "4011")
                    break;
                case 4012:
                    this.emitWebsocketError('Invalid API version', "4012")
                    break;
                case 4013:
                    this.emitWebsocketError('Invalid intent(s)', "4013")
                    break;
                case 4014:
                    this.emitWebsocketError('Disallowed intent(s)', "4014")
                    break;
            }
        })

        this.websocket.on('open', () => {
            this.emit('debug', 'Websocket connection started')
        });

        this.websocket.on('message', (data: Payload) => {

            let parsedData = JSON.parse(data.toString())

            if (parsedData.s) this.last_sequence = parsedData.s;

            switch (parsedData.op) {
                case 1:
                    this.beat()
                    break;
                case 10:
                    this.hello(parsedData)
                    this.startHeartbeating()
                    break;
                case 11:
                    this.emit('debug', 'Heartbeat acknowledged')
                    break;
                case 0:
                    this.emit(parsedData.t, parsedData.d)
                    if (parsedData.t == "READY") {
                        this.resume_gateway_url = parsedData.resume_gateway_url
                        this.session_id = parsedData.session_id
                    }
                    break;
                case 9:
                    this.emit('debug', 'Invalid session, received opcode 9')
                    if(parsedData.d == true) {
                        this.resume()
                    }
                    break;
                case 7:
                    this.emit('debug', 'Reconnect required, received opcode 7')
                    this.resume()
                    break;
            }

        });
    }

    async connect(token: string) {

        this.token = token;

        this.getGatewayBot().then(() => {

            this.openConnection();

        })

    }

    resume() {
        this.emit('debug', 'Resuming')
        this.openConnection(this.resume_gateway_url).then(() => {
            this.websocket?.send(JSON.stringify({
                op: 6,
                d: {
                    token: this.token,
                    session_id: this.session_id,
                    seq: this.last_sequence
                }
            }))
        })
    }

    disconnect() {
        this.emit('debug', 'Disconnecting')
        this.websocket?.close(1000, "Disconnecting")
    }

    beat() {
        this.emit('debug', 'Sending heartbeat')
        this.websocket?.send(JSON.stringify({
            op: 1,
            d: this.last_sequence
        }))
    }

    identify() {
        this.emit('debug', 'Identifying started')
        this.websocket?.send(JSON.stringify({
            op: 2,
            d: {
                token: this.token,
                intents: this.intents,
                properties: {
                    os: "linux",
                    browser: "pulse",
                    device: "pulse"
                },
                shard: [0, this.shards]
            }
        }))
    }

    hello(payload: Payload) {
        if (payload.d.heartbeat_interval) {
            this.heartbeat_interval = payload.d.heartbeat_interval
            const jitter = Math.random()

            setTimeout(() => {
                this.beat()
                this.identify()
            }, this.heartbeat_interval || 1 * jitter)
        }
    }
}