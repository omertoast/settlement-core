import BigNumber from 'bignumber.js';
import { Brand } from '../utils';
export declare const fromQuantity: ({ amount, scale }: Brand<{
    amount: string;
    scale: number;
}, "Quantity">) => BigNumber;
export declare type Quantity = Brand<{
    amount: string;
    scale: number;
}, 'Quantity'>;
export declare const isQuantity: (o: any) => o is Brand<{
    amount: string;
    scale: number;
}, "Quantity">;
