"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = (ms) => new Promise(r => setTimeout(r, ms));
function throttle(func, period) {
    let ready = true;
    return ((...args) => {
        if (!ready) {
            return;
        }
        setTimeout(() => {
            ready = true;
        }, period);
        func(...args);
    });
}
exports.throttle = throttle;
//# sourceMappingURL=utils.js.map