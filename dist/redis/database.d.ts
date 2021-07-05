import Redis, { Redis as IoRedis, Pipeline, RedisOptions } from 'ioredis';
import { Brand } from '../utils';
declare module 'ioredis' {
    interface Pipeline {
        foo(): boolean;
    }
}
export { Pipeline as DecoratedPipeline };
export { IoRedis as DecoratedRedis };
export interface RedisConfig extends RedisOptions {
    client?: IoRedis;
    uri?: string;
}
export declare const createRedisClient: (config?: RedisConfig) => Promise<Redis.Redis>;
export declare const isSettlementAmounts: (o: any) => o is Brand<string[], "SettlementAmounts">;
