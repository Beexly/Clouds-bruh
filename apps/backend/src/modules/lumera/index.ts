import { Module } from '@medusajs/framework/utils';
import LumeraService from './service';

export const LUMERA_MODULE = 'lumera';
export default Module(LUMERA_MODULE, { service: LumeraService });
