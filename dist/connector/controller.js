"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("body-parser"));
const debug_1 = __importDefault(require("debug"));
const express_1 = __importDefault(require("express"));
const v4_1 = __importDefault(require("uuid/v4"));
const quantity_1 = require("./quantity");
const log = debug_1.default('settlement-core');
exports.createController = (store) => {
    const app = express_1.default();
    app.post('/accounts', body_parser_1.default.json(), async (req, res) => {
        const accountId = req.body.id || v4_1.default();
        try {
            await store.createAccount(accountId);
        }
        catch (err) {
            log(`Failed to setup account: account=${accountId}`, err);
            return res.sendStatus(500);
        }
        res.sendStatus(201);
    });
    app.delete('/accounts/:id', async (req, res) => {
        const accountId = req.params.id;
        try {
            await store.deleteAccount(accountId);
            res.sendStatus(204);
        }
        catch (err) {
            log(`Failed to delete account: account=${accountId}`, err);
            res.sendStatus(500);
        }
    });
    app.post('/accounts/:id/settlements', body_parser_1.default.json(), async (req, res) => {
        const accountId = req.params.id;
        let details = `account=${accountId}`;
        const idempotencyKey = req.get('Idempotency-Key');
        if (!idempotencyKey) {
            log(`Request to settle failed: idempotency key missing: ${details}`);
            return res.status(400).send('Idempotency key missing');
        }
        details += ` idempotencyKey=${idempotencyKey}`;
        const requestQuantity = req.body;
        if (!quantity_1.isQuantity(requestQuantity)) {
            log(`Request to settle failed: invalid quantity: ${details}`);
            return res.status(400).send('Quantity to settle is invalid');
        }
        const amountToQueue = quantity_1.fromQuantity(requestQuantity);
        details += ` amount=${amountToQueue}`;
        if (amountToQueue.isZero()) {
            log(`Request to settle failed: amount is 0: ${details}`);
            return res.status(400).send('Amount to settle is 0');
        }
        let amountQueued;
        try {
            amountQueued = await store.handleSettlementRequest(accountId, idempotencyKey, amountToQueue);
        }
        catch (err) {
            log(`Error: Failed to queue settlement: ${details}`, err);
            return res.sendStatus(500);
        }
        if (!amountToQueue.isEqualTo(amountQueued)) {
            log(`Request to settle failed: reused idempotency key: ${details} oldAmount=${amountQueued}`);
            return res.status(400).send('Idempotency key was reused with a different amount');
        }
        res.sendStatus(201);
    });
    app.post('/accounts/:id/messages', body_parser_1.default.raw(), async (req, res) => {
        const accountId = req.params.id;
        res.type('buffer');
        try {
            const parsedData = JSON.parse(req.body);
            if (!parsedData || typeof parsedData !== 'object') {
                return res.status(400).send('Engine only supports JSON messages');
            }
            const response = await store.handleMessage(accountId, parsedData);
            if (!response) {
                return res.sendStatus(201);
            }
            const rawResponse = Buffer.from(JSON.stringify(response));
            res.status(201).send(rawResponse);
        }
        catch (err) {
            log(`Error while handling message: account=${accountId}`, err);
            res.sendStatus(500);
        }
    });
    return app;
};
//# sourceMappingURL=controller.js.map