import { Module } from '@medusajs/framework/utils';
import DropsService from './service';
export const DROPS_MODULE = 'drops';
export default Module(DROPS_MODULE, { service: DropsService });
