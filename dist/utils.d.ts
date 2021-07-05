export declare const sleep: (ms: number) => Promise<unknown>;
export declare type Brand<K, T> = K & {
    readonly __brand: T;
};
export declare function throttle<F extends Function>(func: F, period: number): F;
