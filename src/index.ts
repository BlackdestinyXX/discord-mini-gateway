import GatewaySocket from './GatewaySocket';

export function connectToGateway(token: string, intents: number, shards?: any) {
	return new GatewaySocket(token, intents, shards); // creazione socket per connessione al gateway
}