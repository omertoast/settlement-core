"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const quantity_1 = require("./quantity");
exports.createConnectorServices = (config) => ({
    async sendCreditRequest(accountId, idempotencyKey, amount) {
        if (amount.isZero()) {
            return Promise.reject(new Error('Cannot request connector to credit amount for 0'));
        }
        const scale = amount.decimalPlaces();
        const quantityToCredit = {
            scale,
            amount: amount.shiftedBy(scale).toFixed(0)
        };
        if (!quantity_1.isQuantity(quantityToCredit)) {
            return Promise.reject(new Error('Cannot request connector to credit an invalid amount'));
        }
        await axios_1.default({
            method: 'POST',
            url: `${config.creditSettlementUrl}/accounts/${accountId}/settlements`,
            data: quantityToCredit,
            timeout: 10000,
            headers: {
                'Idempotency-Key': idempotencyKey
            },
            validateStatus: status => status === 201
        });
    },
    async sendMessage(accountId, message) {
        return axios_1.default({
            method: 'POST',
            url: `${config.sendMessageUrl}/accounts/${accountId}/messages`,
            data: Buffer.from(JSON.stringify(message)),
            timeout: 10000,
            headers: {
                Accept: 'application/octet-stream',
                'Content-type': 'application/octet-stream'
            }
        }).then(response => response.data);
    }
});
//# sourceMappingURL=services.js.map