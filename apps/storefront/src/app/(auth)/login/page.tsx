import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '../../../components/AuthForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  // useSearchParams (inside AuthForm) requires a Suspense boundary.
  return (
    <Suspense fallback={<main className="min-h-screen bg-void" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
