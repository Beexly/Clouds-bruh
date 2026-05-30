import { Visibility } from './enums.mjs';
import { collectionId, slugify } from './ids.mjs';
import { now } from '../lib/clock.mjs';

export function createCollection(input = {}) {
  const title = input.title || 'Collection';
  const slug = input.slug || slugify(title);
  return {
    id: input.id || collectionId([slug]),
    slug,
    title,
    description: input.description,
    productIds: input.productIds || [],
    dropCode: input.dropCode,
    opensAt: input.opensAt,
    closesAt: input.closesAt,
    // Collections are hidden until intentionally surfaced.
    visibility: input.visibility || Visibility.HIDDEN,
    createdAt: input.createdAt || now(),
  };
}
