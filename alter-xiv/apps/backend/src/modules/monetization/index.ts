import { Module } from '@medusajs/framework/utils';
import MonetizationService from './service';
export const MONETIZATION_MODULE = 'monetization';
export default Module(MONETIZATION_MODULE, { service: MonetizationService });
