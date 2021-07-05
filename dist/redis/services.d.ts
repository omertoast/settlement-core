import BigNumber from 'bignumber.js';
import { ValidAmount } from './';
import { Redis, Pipeline } from 'ioredis';
interface RedisSettlementServices {
    prepareSettlement(accountId: string, leaseDuration: number): Promise<[ValidAmount, Pipeline]>;
    refundSettlement(accountId: string, amount: BigNumber, tx?: Pipeline): Pipeline;
    creditSettlement(accountId: string, amount: BigNumber, tx?: Pipeline): Pipeline;
}
export interface RedisStoreServices extends RedisSettlementServices {
    redis: Redis;
    sendMessage(accountId: string, message: any): Promise<any>;
}
export declare const setupSettlementServices: (redis: Redis) => RedisSettlementServices;
export {};
