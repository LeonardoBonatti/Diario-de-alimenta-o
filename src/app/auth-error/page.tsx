import Link from 'next/link';

const MESSAGES: Record<string, { title: string; hint: string }> = {
  Configuration: {
    title: 'Problema na configuração do login',
    hint:
      'Verifique na Vercel se AUTH_SECRET, AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET estão corretas e faça Redeploy. ' +
      'No Google Cloud, a URI de redirecionamento precisa ser https://SEU-DOMINIO/api/auth/callback/google. ' +
      'Detalhes aparecem em Logs, nas linhas "[auth][error]".',
  },
  AccessDenied: {
    title: 'Acesso negado',
    hint: 'Se o app do Google está em modo de teste, adicione seu e-mail em "Usuários de teste" na tela de consentimento OAuth.',
  },
  Verification: {
    title: 'Link expirado',
    hint: 'Tente entrar novamente.',
  },
};

const FALLBACK = { title: 'Não foi possível entrar', hint: 'Tente novamente em instantes.' };

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { title, hint } = (error && MESSAGES[error]) || FALLBACK;

  return (
    <div className="space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-600">{hint}</p>
      {error && <p className="text-xs text-slate-400">Código: {error}</p>}
      <Link href="/" className="inline-block rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700">
        Voltar
      </Link>
    </div>
  );
}
