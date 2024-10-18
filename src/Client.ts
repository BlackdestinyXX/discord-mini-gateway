import { request } from 'undici';


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

export default class Client {

    token: any;
    shards: number = 1;
    url: string = '';

    constructor({ shards }: ClientOptions = {}) {
        if(shards) this.shards = shards;
    }

    private async getGatewayBot(): Promise<BotGatewayResponse> {

        const { statusCode, body } = await request('https://discord.com/api/v10/gateway/bot', {
            headers: {
                'Authorization': `Bot ${this.token}`
            }
        })

        if(statusCode !== 200) {
            throw new Error('Error while fetching gateway bot endpoint');
        }

        const data: BotGatewayResponse = (await body.json()) as BotGatewayResponse;

        if(statusCode == 200) {
            this.shards = data.shards;
            this.url = data.url;
        }

        return data;

    }

    async connect(token: string) {

        this.token = token;

        this.getGatewayBot()
        
    }
}