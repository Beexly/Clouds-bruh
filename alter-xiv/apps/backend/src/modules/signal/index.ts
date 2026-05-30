import { Module } from '@medusajs/framework/utils';
import SignalService from './service';
export const SIGNAL_MODULE = 'signal';
export default Module(SIGNAL_MODULE, { service: SignalService });
