"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const NUMERIC_REGEX = new RegExp(/^\d+$/);
exports.fromQuantity = ({ amount, scale }) => new bignumber_js_1.default(amount).shiftedBy(-scale);
exports.isQuantity = (o) => !!o &&
    typeof o === 'object' &&
    typeof o.scale === 'number' &&
    Number.isInteger(o.scale) &&
    o.scale >= 0 &&
    o.scale <= 255 &&
    typeof o.amount === 'string' &&
    NUMERIC_REGEX.test(o.amount) &&
    new bignumber_js_1.default(o.amount).isInteger() &&
    +o.amount >= 0;
//# sourceMappingURL=quantity.js.map