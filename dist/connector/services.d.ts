import BigNumber from 'bignumber.js';
export interface ConnectorServices {
    sendCreditRequest(accountId: string, idempotencyKey: string, amount: BigNumber): Promise<void>;
    sendMessage(accountId: string, message: any): Promise<any>;
}
interface ConnectorConfig {
    sendMessageUrl: string;
    creditSettlementUrl: string;
}
export declare const createConnectorServices: (config: ConnectorConfig) => ConnectorServices;
export {};
