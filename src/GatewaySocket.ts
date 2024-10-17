import Connection from "./Connection";
import WebSocket from "ws";
import EventEmitter from "events";
import { request } from 'undici'

export default class GatewaySocket extends EventEmitter {
	token: any;
	shards: any;
	sockets: any;
	lastReady: any;
	url: any;

	constructor(token: string, shards: string | number = 'auto') {
		super();
		this.token = token;
		this.shards = shards;
		this.sockets = new Map();
		this.lastReady = 0;
	}

	// funzione utilizzata per ottenere i parametri shards e url, che sono rispettivamente
	// le shards consigliate per la connessione al gateway e l'url per la connessione
	// https://discord.com/developers/docs/topics/gateway#get-gateway-bot
	getGatewayInfo(): Promise<any> {
		return new Promise(async (resolve, reject) => {
	    	try {
	      		const { body } = await request('https://discordapp.com/api/v9/gateway/bot', {
	        		headers: {
	          			Authorization: "Bot " + this.token
	        		}
	      		});

	      		const data = await body.json()

		     	resolve(data);
	    	} catch (error) {
	      		reject(error);
	    	}
	  	});
	}

	async connect(start: number = 0, end: number) {
		const { url, shards } = await this.getGatewayInfo();
		this.url = url;
		if (isNaN(this.shards)) this.shards = shards;
		end = end || this.shards;
		for (let socket_id = start; socket_id < end; socket_id++) {
			if (this.sockets.get(socket_id)) {
				await this.sockets.get(socket_id).close(); // se esistono socket aperti, vengono chiusi
			}
			this.sockets.set(socket_id, new Connection(this, socket_id)); // creazione connessione socket con id univoco
			this.lastReady = (await this.sockets.get(socket_id).connect()).timeReady;
		}
	}

	send(data: any, shard: number = 0) {
		this.sockets.get(shard).send(data);
	}
}
