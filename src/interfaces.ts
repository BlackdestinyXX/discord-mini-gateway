export interface ClientOptions {
    shards?: number
    intents?: number
}

export interface SessionStartLimit {
    max_concurrency: number,
    remaining: number,
    reset_after: number,
    total: number
}

export interface BotGatewayResponse {
    url: string,
    session_start_limit: SessionStartLimit,
    shards: number
}

export interface Payload {
    op: number,
    d?: any,
    s?: number,
    t?: string,
}