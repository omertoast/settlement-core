import { CreateStore } from '../store';
export interface SettlementServerConfig {
    connectorUrl?: string;
    sendMessageUrl?: string;
    creditSettlementUrl?: string;
    port?: string | number;
}
export interface SettlementServer {
    shutdown(): Promise<void>;
}
export declare const startServer: (createStore: CreateStore, config?: SettlementServerConfig) => Promise<SettlementServer>;
