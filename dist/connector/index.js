"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const controller_1 = require("./controller");
const services_1 = require("./services");
const log = debug_1.default('settlement-core');
exports.startServer = async (createStore, config = {}) => {
    const connectorUrl = config.connectorUrl || 'http://localhost:7771';
    const sendMessageUrl = config.sendMessageUrl || connectorUrl;
    const creditSettlementUrl = config.creditSettlementUrl || connectorUrl;
    const services = services_1.createConnectorServices({ sendMessageUrl, creditSettlementUrl });
    const store = await createStore(services);
    const app = controller_1.createController(store);
    const port = config.port ? +config.port : 3000;
    const server = app.listen(port);
    log('Started settlement engine server');
    return {
        async shutdown() {
            await new Promise(resolve => server.close(resolve));
            if (store.disconnect) {
                await store.disconnect();
            }
        }
    };
};
//# sourceMappingURL=index.js.map