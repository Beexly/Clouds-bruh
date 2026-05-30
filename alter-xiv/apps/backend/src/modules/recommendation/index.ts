import { Module } from '@medusajs/framework/utils';
import RecommendationService from './service';
export const RECOMMENDATION_MODULE = 'recommendation';
export default Module(RECOMMENDATION_MODULE, { service: RecommendationService });
