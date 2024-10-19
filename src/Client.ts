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

export default class Client {

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

    private async openConnection(connectionUrl?: string) {
        this.websocket = new WebSocket(connectionUrl || this.url + "?v=10&encoding=json");

        this.websocket.on('error', console.error);

        this.websocket.on('close', (event) => {
            switch (event) {
                case 4000:
                    console.log("Unknown error")
                    this.resume()
                    break;
                case 4001:
                    console.log("Unknown opcode")
                    this.resume()
                    break;
                case 4002:
                    console.log("Decode error")
                    this.resume()
                    break;
                case 4003:
                    console.log("Not authenticated")
                    this.resume()
                    break;
                case 4004:
                    console.log("Authentication failed")
                    break;
                case 4005:
                    console.log("Already authenticated")
                    this.resume()
                    break;
                case 4007: 
                    console.log("Invalid seq")
                    this.resume()
                    break;
                case 4008:
                    console.log("Rate limited")
                    break;
                case 4009:
                    console.log("Session timeout")
                    this.resume()
                    break;
                case 4010:
                    console.log("Invalid shard")
                    break;
                case 4011:
                    console.log("Sharding required")
                    break;
                case 4012:
                    console.log("Invalid API version")
                    break;
                case 4013:
                    console.log("Invalid intent(s)")
                    break;
                case 4014:
                    console.log("Disallowed intent(s)")
                    break;
            }
        })

        this.websocket.on('open', () => {
            console.log("Connection started")
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
                    console.log("Heartbeat acknowledged")
                    break;
                case 0:
                    if (parsedData.t == "READY") {
                        console.log("Received dispatch event: client ready")
                        this.resume_gateway_url = parsedData.resume_gateway_url
                        this.session_id = parsedData.session_id
                    }
                    break;
                case 9:
                    console.log("Invalid session")
                    if(parsedData.d == true) {
                        this.resume()
                    }
                    break;
                case 7:
                    console.log("Received reconnect event")
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
        this.websocket?.close(1000, "Disconnecting")
    }

    beat() {
        this.websocket?.send(JSON.stringify({
            op: 1,
            d: this.last_sequence
        }))
    }

    identify() {
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