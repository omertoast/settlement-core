import express from 'express';
import { SettlementStore } from '../store';
export declare const createController: (store: SettlementStore) => express.Express;
