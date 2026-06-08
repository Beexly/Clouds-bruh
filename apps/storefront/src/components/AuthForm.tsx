'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCustomer } from '../context/customer';
import { PageSignal } from './PageSignal';
import { MOTTO } from '../lib/brand';

type Mode = 'login' | 'register';

interface Field {
  key: 'first_name' | 'last_name' | 'email' | 'password';
  label: string;
  type: string;
  autoComplete: string;
}

const LOGIN_FIELDS: Field[] = [
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { key: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
];

const REGISTER_FIELDS: Field[] = [
  { key: 'first_name', label: 'First name', type: 'text', autoComplete: 'given-name' },
  { key: 'last_name', label: 'Last name', type: 'text', autoComplete: 'family-name' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { key: 'password', label: 'Password', type: 'password', autoComplete: 'new-password' },
];

/**
 * On-brand email/password form for login + register. Dark luminous editorial luxury, in the house
 * voice. Surfaces error + success states inline and redirects to /account (or ?redirect) on success.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const { login, register } = useCustomer();
  const fields = mode === 'register' ? REGISTER_FIELDS : LOGIN_FIELDS;

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const redirect = params.get('redirect') || '/account';

  const set = (key: Field['key']) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) {
      setError('Enter your email and password.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    try {
      if (mode === 'register') {
        await register({
          email: form.email.trim(),
          password: form.password,
          first_name: form.first_name.trim() || undefined,
          last_name: form.last_name.trim() || undefined,
        });
      } else {
        await login({ email: form.email.trim(), password: form.password });
      }
      setStatus('success');
      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        mode === 'register'
          ? msg.includes('exists') || msg.includes('409')
            ? 'An account with that email already exists. Try signing in.'
            : 'We could not create your account. Please try again.'
          : msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid')
            ? 'Email or password is incorrect.'
            : 'We could not sign you in. Please try again.',
      );
      setStatus('error');
    }
  };

  const heading = mode === 'register' ? 'Create your account' : 'Welcome back';
  const cta = mode === 'register' ? 'Create account' : 'Sign in';

  return (
    <main className="min-h-screen bg-void bg-sacred-grain px-6 py-20">
      <PageSignal type="page_view" context={{ surface: mode === 'register' ? 'auth_register' : 'auth_login' }} trackBehavior={false} />
      <div className="mx-auto max-w-md">
        <header className="mb-10 text-center">
          <p className="text-micro uppercase tracking-[0.32em] text-neutral-600">Your Lumera</p>
          <h1 className="mt-2 font-serif text-4xl font-light tracking-[0.06em] text-foil">{heading}</h1>
          <p className="mt-3 text-sm italic text-neutral-500">{MOTTO}</p>
        </header>

        <form onSubmit={submit} className="space-y-5 rounded-sm border border-white/[0.07] bg-white/[0.02] p-6">
          {fields.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="mb-1 block text-micro uppercase tracking-[0.28em] text-neutral-500">
                {f.label}
              </label>
              <input
                id={f.key}
                type={f.type}
                value={form[f.key]}
                onChange={set(f.key)}
                autoComplete={f.autoComplete}
                className="w-full border border-white/10 bg-void px-3 py-2.5 text-sm text-neutral-200 outline-none focus:border-altar-gold/40"
              />
            </div>
          ))}

          {error && <p className="text-sm text-chapter-relentless">{error}</p>}
          {status === 'success' && <p className="text-sm text-altar-goldlight">Signed in. Taking you to your account…</p>}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full border border-altar-gold/40 py-3.5 text-micro uppercase tracking-[0.28em] text-altar-goldlight transition hover:border-altar-gold disabled:opacity-50"
          >
            {status === 'submitting' ? 'One moment…' : cta}
          </button>

          <p className="text-center text-micro uppercase tracking-[0.2em] text-neutral-600">
            {mode === 'register' ? (
              <>
                Already have an account?{' '}
                <Link href="/login" className="text-neutral-400 underline underline-offset-4 hover:text-foil">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to Lumera?{' '}
                <Link href="/register" className="text-neutral-400 underline underline-offset-4 hover:text-foil">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </form>
      </div>
    </main>
  );
}
