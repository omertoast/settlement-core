import BigNumber from 'bignumber.js';
import { CreateStore } from '../store';
import { RedisStoreServices } from './services';
import { DecoratedPipeline, DecoratedRedis, RedisConfig } from './database';
import { Brand } from '../utils';
export { RedisStoreServices, DecoratedPipeline, DecoratedRedis, RedisConfig };
export declare type ConnectRedisSettlementEngine = (services: RedisStoreServices) => Promise<RedisSettlementEngine>;
export interface RedisSettlementEngine {
    setupAccount?(accountId: SafeRedisKey): Promise<void>;
    closeAccount?(accountId: SafeRedisKey): Promise<DecoratedPipeline | void>;
    handleMessage(accountId: SafeRedisKey, message: any): Promise<any>;
    settle(accountId: SafeRedisKey): Promise<void>;
    disconnect?(): Promise<void>;
}
export declare const createRedisStore: (createEngine: ConnectRedisSettlementEngine, redisConfig?: RedisConfig | undefined) => CreateStore;
export declare type SafeRedisKey = Brand<string, 'SafeRedisKey'>;
export declare const isSafeRedisKey: (o: any) => o is Brand<string, "SafeRedisKey">;
export declare type ValidAmount = Brand<BigNumber, 'ValidAmount'>;
export declare const isValidAmount: (o: any) => o is Brand<BigNumber, "ValidAmount">;
export declare type CreditSettlement = (accountId: SafeRedisKey, idempotencyKey: SafeRedisKey, amount: ValidAmount) => Promise<void>;
export declare const startCreditLoop: (redis: DecoratedRedis, sendCreditRequest: CreditSettlement) => () => Promise<void>;
