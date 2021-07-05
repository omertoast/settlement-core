"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const ioredis_1 = __importDefault(require("ioredis"));
const _1 = require(".");
const fs_1 = require("fs");
const path_1 = require("path");
exports.createRedisClient = async (config = {}) => {
    const { client, uri, ...opts } = config;
    const redis = client || new ioredis_1.default(uri, opts);
    const [createAccountScript, deleteAccountScript, addCreditScript, retryCreditScript, finalizeCreditScript, queueSettlementScript, prepareSettlementScript] = await Promise.all([
        './scripts/account-create.lua',
        './scripts/account-delete.lua',
        './scripts/credit-add.lua',
        './scripts/credit-retry.lua',
        './scripts/credit-finalize.lua',
        './scripts/settlement-queue.lua',
        './scripts/settlement-prepare.lua'
    ].map(path => fs_1.promises.readFile(path_1.resolve(__dirname, path)))).then(buf => buf.toString());
    redis.defineCommand('createAccount', {
        numberOfKeys: 0,
        lua: createAccountScript
    });
    redis.defineCommand('deleteAccount', {
        numberOfKeys: 0,
        lua: deleteAccountScript
    });
    redis.defineCommand('queueSettlement', {
        numberOfKeys: 0,
        lua: queueSettlementScript
    });
    redis.defineCommand('prepareSettlement', {
        numberOfKeys: 0,
        lua: prepareSettlementScript
    });
    redis.defineCommand('addSettlementCredit', {
        numberOfKeys: 0,
        lua: addCreditScript
    });
    redis.defineCommand('retrySettlementCredit', {
        numberOfKeys: 0,
        lua: retryCreditScript
    });
    redis.defineCommand('finalizeSettlementCredit', {
        numberOfKeys: 0,
        lua: finalizeCreditScript
    });
    return redis;
};
exports.isSettlementAmounts = (o) => Array.isArray(o) &&
    o.length % 2 === 0 &&
    o.every(el => typeof el === 'string') &&
    o
        .filter((_, i) => i % 2 !== 0)
        .map(el => new bignumber_js_1.default(el))
        .every(_1.isValidAmount);
//# sourceMappingURL=database.js.map