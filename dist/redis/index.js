"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const services_1 = require("./services");
const database_1 = require("./database");
const utils_1 = require("../utils");
const debug_1 = __importDefault(require("debug"));
const log = debug_1.default('settlement-core');
exports.createRedisStore = (createEngine, redisConfig) => async (connectorServices) => {
    const redis = await database_1.createRedisClient(redisConfig);
    const { sendMessage, sendCreditRequest } = connectorServices;
    const accountServices = {
        redis,
        sendMessage,
        ...services_1.setupSettlementServices(redis)
    };
    const stopCreditLoop = exports.startCreditLoop(redis, sendCreditRequest);
    const engine = await createEngine(accountServices);
    return {
        handleMessage(accountId, message) {
            if (!exports.isSafeRedisKey(accountId)) {
                return Promise.reject(new Error('Account ID contains unsafe characters'));
            }
            if (engine.handleMessage) {
                return engine.handleMessage(accountId, message);
            }
            else {
                return Promise.reject(new Error('Settlement engine cannot handle incoming messages'));
            }
        },
        async createAccount(accountId) {
            if (!exports.isSafeRedisKey(accountId)) {
                return Promise.reject(new Error('Account ID contains unsafe characters'));
            }
            if (engine.setupAccount) {
                await engine.setupAccount(accountId);
            }
            const didCreateAccount = (await redis.createAccount(accountId)) === 1;
            return didCreateAccount;
        },
        async deleteAccount(accountId) {
            if (!exports.isSafeRedisKey(accountId)) {
                return Promise.reject(new Error('Account ID contains unsafe characters'));
            }
            const tx = (engine.closeAccount && (await engine.closeAccount(accountId))) || redis.multi();
            await tx.deleteAccount(accountId).exec();
        },
        async handleSettlementRequest(accountId, idempotencyKey, amount) {
            if (!exports.isSafeRedisKey(accountId)) {
                return Promise.reject(new Error('Account ID contains unsafe characters'));
            }
            if (!exports.isSafeRedisKey(idempotencyKey)) {
                return Promise.reject(new Error('Idempotency key contains unsafe characters'));
            }
            if (!exports.isValidAmount(amount) || !amount.isGreaterThan(0)) {
                return Promise.reject(new Error('Invalid amount'));
            }
            const response = await redis.queueSettlement(accountId, idempotencyKey, amount.toFixed());
            const amountQueued = new bignumber_js_1.default(response[0]);
            const isOriginalRequest = response[1] === 1;
            const details = `account=${accountId} amount=${amount} idempotencyKey=${idempotencyKey}`;
            if (isOriginalRequest) {
                log(`Handling new request to settle, triggering settlement: ${details}`);
                engine.settle(accountId).catch(err => log(`Failed to settle: ${details}`, err));
            }
            else {
                log(`Handling retry request to settle, no settlement triggered: ${details}`);
            }
            return amountQueued;
        },
        async disconnect() {
            await stopCreditLoop();
            redis.disconnect();
        }
    };
};
const REDIS_NAMESPACE_DELIMITER = ':';
exports.isSafeRedisKey = (o) => typeof o === 'string' && o.length > 0 && !o.includes(REDIS_NAMESPACE_DELIMITER);
exports.isValidAmount = (o) => bignumber_js_1.default.isBigNumber(o) && o.isGreaterThanOrEqualTo(0) && o.isFinite();
exports.startCreditLoop = (redis, sendCreditRequest) => {
    let terminate = false;
    const throttledLog = utils_1.throttle(log, 30000);
    const creditLoop = (async () => {
        while (true) {
            if (terminate) {
                return;
            }
            const credit = await redis
                .retrySettlementCredit()
                .catch(err => throttledLog('Failed to check for queued incoming settlements', err));
            if (!credit) {
                await utils_1.sleep(50);
                continue;
            }
            const [accountId, idempotencyKey] = credit;
            const amount = new bignumber_js_1.default(credit[2]);
            if (!exports.isSafeRedisKey(accountId) || !exports.isSafeRedisKey(idempotencyKey) || !exports.isValidAmount(amount)) {
                throttledLog('Failed to notify connector of incoming settlements, database may be corrupted');
                await utils_1.sleep(50);
                continue;
            }
            const details = `account=${accountId} amount=${amount} idempotencyKey=${idempotencyKey}`;
            sendCreditRequest(accountId, idempotencyKey, amount)
                .then(async () => {
                await redis.finalizeSettlementCredit(accountId, idempotencyKey);
                log(`Connector credited incoming settlement: ${details}`);
            })
                .catch(err => log(`Connector failed to credit settlement, will retry: ${details}`, err));
        }
    })();
    return () => {
        terminate = true;
        return creditLoop;
    };
};
//# sourceMappingURL=index.js.map