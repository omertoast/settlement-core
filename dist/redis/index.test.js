"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const ioredis_1 = __importDefault(require("ioredis"));
const testcontainers_1 = require("testcontainers");
const v4_1 = __importDefault(require("uuid/v4"));
const _1 = require("./");
const debug_1 = __importDefault(require("debug"));
const log = debug_1.default('settlement-core');
let redisContainer;
let client;
let mockEngine;
let store;
let prepareSettlement;
describe('Redis settlement store', () => {
    jest.setTimeout(60000);
    beforeEach(async () => {
        redisContainer = await new testcontainers_1.GenericContainer('redis').withExposedPorts(6379).start();
        client = new ioredis_1.default(redisContainer.getMappedPort(6379), redisContainer.getContainerIpAddress());
        log('Redis port', redisContainer.getMappedPort(6379));
        mockEngine = {
            settle: jest.fn(async () => Promise.resolve()),
            handleMessage: jest.fn()
        };
        const connectMockEngine = async (services) => {
            prepareSettlement = services.prepareSettlement;
            return mockEngine;
        };
        const mockServices = {
            sendCreditRequest: jest.fn(),
            sendMessage: jest.fn()
        };
        const connectStore = _1.createRedisStore(connectMockEngine, { client });
        store = await connectStore(mockServices);
    });
    afterEach(async () => {
        if (store.disconnect) {
            await store.disconnect();
        }
        await redisContainer.stop();
    });
    describe('Queues new settlements', () => {
        test('Requests with same idempotency key return amount in original request', async () => {
            const accountId = v4_1.default();
            const idempotencyKey = v4_1.default();
            const requestAmount = new bignumber_js_1.default(40001348);
            const amountQueued1 = await store.handleSettlementRequest(accountId, idempotencyKey, requestAmount);
            expect(amountQueued1).toStrictEqual(requestAmount);
            const amountQueued2 = await store.handleSettlementRequest(accountId, idempotencyKey, new bignumber_js_1.default(40001348.1));
            expect(amountQueued2).toStrictEqual(requestAmount);
        });
        test('Requests with same idempotency key queue a settlement exactly once', async () => {
            const accountId = 'alice';
            const idempotencyKey = v4_1.default();
            const requestAmount = new bignumber_js_1.default(3.21);
            const [initialQueuedAmount] = await prepareSettlement(accountId, 1000);
            expect(initialQueuedAmount).toStrictEqual(new bignumber_js_1.default(0));
            const amountQueued1 = await store.handleSettlementRequest(accountId, idempotencyKey, requestAmount);
            expect(amountQueued1).toStrictEqual(requestAmount);
            expect(mockEngine.settle).toHaveBeenCalledWith(accountId);
            expect(mockEngine.settle).toBeCalledTimes(1);
            const [amountToSettle1, commitSettlement] = await prepareSettlement(accountId, 1000);
            expect(amountToSettle1).toStrictEqual(requestAmount);
            const amountQueued2 = await store.handleSettlementRequest(accountId, idempotencyKey, requestAmount);
            expect(amountQueued2).toStrictEqual(requestAmount);
            const [amountToSettle2] = await prepareSettlement(accountId, 1000);
            expect(amountToSettle2).toStrictEqual(new bignumber_js_1.default(0));
            await commitSettlement.exec();
            const amountQueued3 = await store.handleSettlementRequest(accountId, idempotencyKey, requestAmount);
            expect(amountQueued3).toStrictEqual(requestAmount);
            const [amountToSettle3] = await prepareSettlement(accountId, 1000);
            expect(amountToSettle3).toStrictEqual(new bignumber_js_1.default(0));
            expect(mockEngine.settle).toBeCalledTimes(1);
        });
    });
    test.todo('retry returns no settlements if there are no credits');
    test.todo('retry returns no settlements if none are ready to retry');
});
describe('#isValidAmount', () => {
    test('True for very large positive numbers', () => {
        expect(_1.isValidAmount(new bignumber_js_1.default('134839842444364732'))).toBe(true);
    });
    test('True for very small positive numbers', () => {
        expect(_1.isValidAmount(new bignumber_js_1.default('32.23843824832838489999999e-150'))).toBe(true);
    });
    test('True for positive 0', () => {
        expect(_1.isValidAmount(new bignumber_js_1.default(0))).toBe(true);
    });
    test('True for negative 0', () => {
        expect(_1.isValidAmount(new bignumber_js_1.default('-0'))).toBe(true);
    });
    test('False for Infinity', () => {
        expect(_1.isValidAmount(new bignumber_js_1.default(Infinity))).toBe(false);
    });
    test('False for NaN', () => {
        expect(_1.isValidAmount(new bignumber_js_1.default(NaN))).toBe(false);
    });
    test('False for negative numbers', () => {
        expect(_1.isValidAmount(new bignumber_js_1.default('-3248'))).toBe(false);
    });
});
//# sourceMappingURL=index.test.js.map