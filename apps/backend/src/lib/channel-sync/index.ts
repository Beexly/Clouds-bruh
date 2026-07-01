import type { ChannelAdapter, ChannelConnection, ChannelId } from '@lumera/shared';
import {
  AmazonChannelAdapter,
  EtsyChannelAdapter,
  ShopifyChannelAdapter,
  WooCommerceChannelAdapter,
} from './clients';

export * from './clients';
export * from './sync';

/** Resolve a channel adapter by id. */
export function channelAdapter(id: ChannelId): ChannelAdapter {
  switch (id) {
    case 'shopify':
      return new ShopifyChannelAdapter();
    case 'woocommerce':
      return new WooCommerceChannelAdapter();
    case 'etsy':
      return new EtsyChannelAdapter();
    case 'amazon':
      return new AmazonChannelAdapter();
    default:
      return new ShopifyChannelAdapter();
  }
}

/** Every supported outbound channel adapter, in display order. */
export function allChannelAdapters(): ChannelAdapter[] {
  return [
    channelAdapter('shopify'),
    channelAdapter('woocommerce'),
    channelAdapter('etsy'),
    channelAdapter('amazon'),
  ];
}

/** Env-based health snapshot for every channel (like vendorConnections()). */
export async function channelConnections(): Promise<ChannelConnection[]> {
  return Promise.all(allChannelAdapters().map((adapter) => adapter.healthCheck()));
}
