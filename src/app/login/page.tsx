import { redirect } from 'next/navigation';
import { loginAction } from '@/lib/session-actions';
import { passwordEnabled } from '@/lib/session';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (!passwordEnabled()) redirect('/');
  const { erro } = await searchParams;

  return (
    <form action={loginAction} className="mx-auto max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-lg font-semibold text-slate-900">Entrar</h1>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Senha</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
      </label>
      {erro && <p className="text-sm text-red-600">Senha incorreta.</p>}
      <button className="w-full rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700">Entrar</button>
    </form>
  );
}
