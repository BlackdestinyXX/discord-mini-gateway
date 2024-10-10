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
		console.log("Socket connection started")
		const { url, shards } = await this.getGatewayInfo();

		console.log(url)
		this.url = url;
		if (isNaN(this.shards)) {
			this.shards = shards;
		}
		end = end || this.shards;
		for (let i = start; i < end; i++) {
			if (this.sockets.get(i)) {
				await this.sockets.get(i).close();
			}
			this.sockets.set(i, new Connection(this, i));
			this.lastReady = (await this.sockets.get(i).connect()).timeReady;
		}
	}

	send(data: any, shard: number = 0) {
		this.sockets.get(shard).send(data);
	}
}
