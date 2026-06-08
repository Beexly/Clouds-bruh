import type { Metadata } from 'next';
import { GiftCards } from '../../components/GiftCards';

export const metadata: Metadata = {
  title: 'Gift Cards',
  description: 'Give Lumera — a sealed offering that redeems into Lumens. Purchase or redeem a gift card.',
};

export default function GiftCardsPage() {
  return <GiftCards />;
}
