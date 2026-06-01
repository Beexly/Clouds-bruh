import { defineMiddlewares, authenticate } from '@medusajs/framework/http';

/**
 * Lock the money + identity routes to an authenticated customer. Before this, `customer_id` was taken
 * from the request body/query with NO auth — anyone holding the public publishable key could grant
 * themselves a membership, mint Lumens, issue gift cards, or read any customer's wallet/entitlements.
 *
 * These routes now require a customer session (or bearer token); the handlers derive the customer id
 * from `req.auth_context.actor_id`, never from caller input. `/store/monetization/tiers` stays public
 * (it only lists the membership tiers).
 */
const customerAuth = authenticate('customer', ['session', 'bearer']);

export default defineMiddlewares({
  routes: [
    { matcher: '/store/monetization/subscribe', method: ['POST'], middlewares: [customerAuth] },
    { matcher: '/store/monetization/credits', method: ['POST'], middlewares: [customerAuth] },
    { matcher: '/store/monetization/gift-cards', method: ['POST'], middlewares: [customerAuth] },
    { matcher: '/store/monetization/wallet', method: ['GET'], middlewares: [customerAuth] },
    { matcher: '/store/monetization/entitlements', method: ['GET'], middlewares: [customerAuth] },
  ],
});
