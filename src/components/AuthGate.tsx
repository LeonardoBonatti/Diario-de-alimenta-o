import { auth, signIn, signOut } from '@/lib/auth';

/** Server Component: renderiza o conteúdo só com sessão válida. */
export default async function AuthGate({ children }: { children: (userId: string) => React.ReactNode }) {
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
