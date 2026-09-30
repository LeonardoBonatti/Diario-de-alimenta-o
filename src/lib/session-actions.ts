'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, SESSION_MAX_AGE, sessionToken } from './session';

export async function loginAction(formData: FormData) {
  const password = process.env.APP_PASSWORD;
  if (!password) redirect('/');

  if (String(formData.get('password') ?? '') !== password) {
    // Atraso simples para dificultar tentativas em massa.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    redirect('/login?erro=1');
  }

  (await cookies()).set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  redirect('/');
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
