import BigNumber from 'bignumber.js';
import { ConnectorServices } from './connector/services';
export declare type CreateStore = (services: ConnectorServices) => Promise<SettlementStore>;
export interface SettlementStore {
    createAccount(accountId: string): Promise<boolean>;
    deleteAccount(accountId: string): Promise<void>;
    handleSettlementRequest(accountId: string, idempotencyKey: string, amount: BigNumber): Promise<BigNumber>;
    handleMessage(accountId: string, message: object): Promise<object | void>;
    disconnect?(): Promise<void>;
}
