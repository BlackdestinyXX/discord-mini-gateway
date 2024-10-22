import { EventEmitter } from 'events';
import { request } from 'undici';
import { ClientOptions, BotGatewayResponse } from './interfaces';
import GatewayConnection from './GatewayConnection';

export default class Client extends EventEmitter {

    token: string;
    shards: number = 1;
    intents: number = 0;
    url: string;
    gatewayConnection: GatewayConnection;

    constructor({ shards, intents }: ClientOptions = {}) {
        super();
        this.token = '';
        this.url = '';
        this.gatewayConnection = new GatewayConnection(this);
        if (shards) this.shards = shards;
        if (intents) this.intents = intents;
    }

    private async getGatewayBot(): Promise<BotGatewayResponse> {

        const { statusCode, body } = await request('https://discord.com/api/v10/gateway/bot', {
            headers: {
                'Authorization': `Bot ${this.token}`
            }
        });

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

        this.getGatewayBot().then(() => {
            this.gatewayConnection.openConnection();
        });
    }

    disconnect() {
        this.gatewayConnection.disconnect();
    }
}
