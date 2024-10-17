import GatewaySocket from './GatewaySocket';

export function connectToGateway(token: string, shards?: any) {
	return new GatewaySocket(token, shards); // creazione socket per connessione al gateway
}