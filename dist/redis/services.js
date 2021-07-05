"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const debug_1 = __importDefault(require("debug"));
const v4_1 = __importDefault(require("uuid/v4"));
const _1 = require("./");
const database_1 = require("./database");
const log = debug_1.default('settlement-core');
exports.setupSettlementServices = (redis) => ({
    async prepareSettlement(accountId, leaseDuration) {
        if (!_1.isSafeRedisKey(accountId)) {
            return Promise.reject(new Error('Failed to prepare settlement, invalid account'));
        }
        const response = await redis.prepareSettlement(accountId, leaseDuration);
        if (!database_1.isSettlementAmounts(response)) {
            return Promise.reject(new Error('Failed to prepare settlement, database is corrupted'));
        }
        log(`Preparing lease for settlement amounts: account=${accountId} duration=${leaseDuration}`);
        const amount = response
            .filter((_, i) => i % 2 === 1)
            .reduce((a, b) => a.plus(b), new bignumber_js_1.default(0));
        if (!_1.isValidAmount(amount)) {
            return Promise.reject(new Error('Failed to prepare settlement, database is corrupted'));
        }
        if (amount.isZero()) {
            return Promise.reject(new Error(`No settlement amounts are available to lease: account=${accountId}`));
        }
        const amountIds = response.filter((_, i) => i % 2 === 0);
        const redisCopy = redis.duplicate();
        setTimeout(() => redisCopy.disconnect(), leaseDuration * 2);
        await amountIds
            .reduce((pipeline, amountId) => pipeline.watch(`accounts:${accountId}:pending-settlements:${amountId}`), redisCopy.pipeline())
            .exec();
        const details = `account=${accountId} amount=${amount} ids=${amountIds}`;
        log(`Preparing settlement, funds on hold: ${details}`);
        const pendingSettlementsKey = `accounts:${accountId}:pending-settlements`;
        const commitTransaction = amountIds.reduce((transaction, amountId) => transaction
            .del(`accounts:${accountId}:pending-settlements:${amountId}`)
            .zrem(pendingSettlementsKey, amountId), redisCopy.multi());
        return [amount, commitTransaction];
    },
    creditSettlement(accountId, amount, tx = redis.multi()) {
        const idempotencyKey = v4_1.default();
        const details = `amountToCredit=${amount} account=${accountId} idempotencyKey=${idempotencyKey}`;
        if (!_1.isSafeRedisKey(accountId)) {
            log('Failed to credit settlement, invalid account');
            return tx;
        }
        if (!_1.isValidAmount(amount)) {
            log('Failed to credit settlement, invalid amount');
            return tx;
        }
        if (amount.isZero()) {
            log(`Ignoring credit for 0 amount, still executing provided Redis transaction: ${details}`);
            return tx;
        }
        return tx.addSettlementCredit(accountId, idempotencyKey, amount.toFixed());
    },
    refundSettlement(accountId, amount, tx = redis.multi()) {
        const amountId = v4_1.default();
        let details = `amountToRefund=${amount} account=${accountId} amountId=${amountId}`;
        if (!_1.isSafeRedisKey(accountId)) {
            log('Failed to refund settlement, invalid account');
            return tx;
        }
        if (!_1.isValidAmount(amount)) {
            log('Failed to refund settlement, invalid amount');
            return tx;
        }
        if (amount.isZero()) {
            log(`Ignoring refund for 0 amount: ${details}`);
            return tx;
        }
        const pendingSettlementsKey = `accounts:${accountId}:pending-settlements`;
        const settlementKey = `accounts:${accountId}:pending-settlements:${amountId}`;
        return redis
            .multi()
            .zadd(pendingSettlementsKey, '0', amountId)
            .hset(settlementKey, 'amount', amount.toFixed());
    }
});
//# sourceMappingURL=services.js.map