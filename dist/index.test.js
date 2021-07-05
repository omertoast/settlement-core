"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const _1 = require(".");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const get_port_1 = __importDefault(require("get-port"));
const testcontainers_1 = require("testcontainers");
const crypto_1 = require("crypto");
const utils_1 = require("./utils");
const wait_strategy_1 = require("testcontainers/dist/wait-strategy");
describe('Integration with Rust connector', () => {
    let redisContainer;
    let adminAuthToken;
    let rustNodeContainer;
    let shutdownEngine;
    jest.setTimeout(600000);
    beforeEach(async () => {
        redisContainer = await new testcontainers_1.GenericContainer('redis').withExposedPorts(6379).start();
        const redisPort = redisContainer.getMappedPort(6379);
        adminAuthToken = 'admin';
        rustNodeContainer = await new testcontainers_1.GenericContainer('interledgerrs/ilp-node')
            .withNetworkMode('host')
            .withCmd([
            '--secret_seed',
            crypto_1.randomBytes(32).toString('hex'),
            '--admin_auth_token',
            adminAuthToken,
            '--database_url',
            `redis://localhost:${redisPort}`,
            '--ilp_address',
            'g.corp',
            '--settlement_api_bind_address',
            '127.0.0.1:7771'
        ])
            .withWaitStrategy(new wait_strategy_1.LogWaitStrategy('Settlement API listening'))
            .start();
        const createEngine = async ({ sendMessage, prepareSettlement, creditSettlement }) => ({
            async settle(accountId) {
                const [amount, commitTx] = await prepareSettlement(accountId, 1000);
                await sendMessage(accountId, { amount });
                await commitTx.exec();
            },
            async handleMessage(accountId, message) {
                if (message.hasOwnProperty('amount')) {
                    await creditSettlement(accountId, new bignumber_js_1.default(message.amount));
                }
            }
        });
        const connectStore = _1.createRedisStore(createEngine, {
            port: redisPort,
            db: 1
        });
        const enginePort = await get_port_1.default();
        const engineUrl = `http://localhost:${enginePort}`;
        const engineServer = await _1.startServer(connectStore, {
            port: enginePort,
            connectorUrl: `http://localhost:7771`
        });
        shutdownEngine = engineServer.shutdown;
        await axios_1.default.post('http://localhost:7770/accounts', {
            username: 'alice',
            asset_code: 'USD',
            asset_scale: 2,
            settle_to: -451,
            settle_threshold: 0,
            settlement_engine_url: engineUrl,
            ilp_over_http_url: 'http://localhost:7770/accounts/bob/ilp',
            ilp_over_http_outgoing_token: 'bob',
            ilp_over_http_incoming_token: 'alice'
        }, {
            headers: {
                Authorization: `Bearer ${adminAuthToken}`
            }
        });
        await axios_1.default.post('http://localhost:7770/accounts', {
            username: 'bob',
            asset_code: 'USD',
            asset_scale: 2,
            settlement_engine_url: engineUrl,
            ilp_over_http_url: 'http://localhost:7770/accounts/alice/ilp',
            ilp_over_http_outgoing_token: 'alice',
            ilp_over_http_incoming_token: 'bob'
        }, {
            headers: {
                Authorization: `Bearer ${adminAuthToken}`
            }
        });
    });
    afterEach(async () => {
        await Promise.all([shutdownEngine(), rustNodeContainer.stop()]);
        await redisContainer.stop();
    });
    test('Settlement between two connector accounts adjusts Interledger balances', async () => {
        await axios_1.default.post('http://localhost:7770/accounts/bob/payments', {
            receiver: 'http://localhost:7770/accounts/alice/spsp',
            source_amount: 10
        }, {
            headers: {
                Authorization: `Bearer bob`
            }
        });
        await utils_1.sleep(500);
        const { data: aliceBalance } = await axios_1.default({
            method: 'GET',
            url: 'http://localhost:7770/accounts/alice/balance',
            headers: {
                Authorization: `Bearer alice`
            }
        });
        expect(aliceBalance.balance).toEqual(-4.51);
        const { data: bobBalance } = await axios_1.default({
            method: 'GET',
            url: 'http://localhost:7770/accounts/bob/balance',
            headers: {
                Authorization: `Bearer bob`
            }
        });
        expect(bobBalance.balance).toEqual(4.51);
    });
});
//# sourceMappingURL=index.test.js.map