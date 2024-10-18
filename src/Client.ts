import { request } from 'undici';
import WebSocket from 'ws';

interface ClientOptions {
    shards?: number
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
    url: string = '';
    heartbeat_interval: number | null = null;

    constructor({ shards }: ClientOptions = {}) {
        if (shards) this.shards = shards;
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

    async connect(token: string) {

        this.token = token;

        this.getGatewayBot().then(data => {

            const ws = new WebSocket(data.url + "?v=10&encoding=json");

            ws.on('error', console.error);

            ws.on('open', () => {
                console.log("Connection started")
            });

            ws.on('message', (data: Payload) => {

                let parsedData = JSON.parse(data.toString())

                switch(parsedData.op) {
                    case 10:
                        this.hello(parsedData)
                    break;
                }

            });

        })

    }

    hello(payload: Payload) {
        if(payload.d.heartbeat_interval) 
            this.heartbeat_interval = payload.d.heartbeat_interval
    }
}