import type { Metadata } from 'next';
import { AccountHub } from '../../components/AccountHub';

export const metadata: Metadata = { title: 'Account' };

/**
 * Account hub — signed-in profile, Luminance standing, and the surfaces a customer reaches for
 * (orders, returns, wishlist). Signed-out visitors get a prompt to sign in. The interactive shell
 * lives in <AccountHub> (a client component) so this page can still export metadata.
 */
export default function AccountPage() {
  return <AccountHub />;
}
