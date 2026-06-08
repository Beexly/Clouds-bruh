import type { Metadata } from 'next';
import { OrderDetail } from '../../../../components/OrderDetail';

export const metadata: Metadata = { title: 'Order' };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
