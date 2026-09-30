import { auth, missingAuthEnv, signIn, signOut } from '@/lib/auth';

/** Server Component: renderiza o conteúdo só com sessão válida. */
export default async function AuthGate({ children }: { children: (userId: string) => React.ReactNode }) {
  const missing = missingAuthEnv();
  if (missing.length > 0) {
    return (
      <div className="space-y-3 rounded-2xl bg-amber-50 p-6 text-amber-900 ring-1 ring-amber-200">
        <h2 className="font-semibold">Login ainda não configurado</h2>
        <p className="text-sm">Cadastre as variáveis abaixo na Vercel e faça um novo deploy (Deployments → ⋯ → Redeploy):</p>
        <ul className="list-inside list-disc text-sm">
          {missing.map((name) => (
            <li key={name}>
              <code className="font-mono">{name}</code>
            </li>
          ))}
        </ul>
        <p className="text-xs text-amber-700">Settings → Environment Variables. O passo a passo está no README (seção 4.2).</p>
      </div>
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="mb-4 text-slate-600">Entre para acessar seu diário.</p>
        <form
          action={async () => {
            'use server';
            await signIn('google');
          }}
        >
          <button className="rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700">
            Entrar com Google
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-end gap-3 text-sm text-slate-500">
        {session.user.email}
        <form
          action={async () => {
            'use server';
            await signOut();
          }}
        >
          <button className="underline hover:text-slate-800">Sair</button>
        </form>
      </div>
      {children(session.user.id)}
    </>
  );
}
