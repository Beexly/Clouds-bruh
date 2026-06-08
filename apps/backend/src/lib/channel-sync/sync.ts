import {
  candidateToChannelListing,
  type ChannelId,
  type ChannelListingResult,
  type ProductCandidate,
} from '@alterxiv/shared';
import { allChannelAdapters, channelAdapter } from './index';

export interface ChannelSyncResult {
  channel: ChannelId;
  /** Outcome: created | updated | gated | skipped | <honest error/status>. */
  status: string;
  listing_id: string | null;
  source: ChannelListingResult['source'];
  message?: string;
}

export interface SyncCandidateOptions {
  /** When supplied, listing_id to update instead of create. */
  existing?: Partial<Record<ChannelId, string>>;
}

/**
 * Push a candidate OUT to one or more sales channels.
 *
 * Safety: gated by CHANNEL_LIVE_MODE. With the gate off (or missing per-channel credentials) every
 * result is an honest `gated`/`skipped` status — we NEVER create a live listing. With the gate on
 * and credentials present, a candidate is created (or updated when an existing listing id is given).
 */
export async function syncCandidateToChannels(
  candidate: ProductCandidate,
  channels?: ChannelId[],
  opts: SyncCandidateOptions = {}
): Promise<ChannelSyncResult[]> {
  const liveMode = process.env.CHANNEL_LIVE_MODE === 'true';
  const listing = candidateToChannelListing(candidate);
  const adapters = channels ? channels.map((id) => channelAdapter(id)) : allChannelAdapters();

  return Promise.all(
    adapters.map(async (adapter): Promise<ChannelSyncResult> => {
      const health = await adapter.healthCheck();

      // Hard gate: never list live unless the explicit flag is on.
      if (!liveMode) {
        return {
          channel: adapter.id,
          status: 'gated',
          listing_id: null,
          source: health.connected ? 'sandbox' : 'fixture',
          message: `${adapter.label} skipped: set CHANNEL_LIVE_MODE=true to sync live listings.`,
        };
      }

      // Live mode on but the channel is not connected → honest skip, never a fabricated success.
      if (!health.can_list) {
        return {
          channel: adapter.id,
          status: 'skipped',
          listing_id: null,
          source: health.mode,
          message: health.message,
        };
      }

      const existingId = opts.existing?.[adapter.id];
      const result = existingId
        ? await adapter.updateListing(existingId, listing)
        : await adapter.createListing(listing);
      return {
        channel: result.channel,
        status: result.status,
        listing_id: result.listing_id,
        source: result.source,
        message: result.message,
      };
    })
  );
}
