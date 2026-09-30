import type { Metadata } from 'next';
import Link from 'next/link';
import { passwordEnabled } from '@/lib/session';
import { logoutAction } from '@/lib/session-actions';
import './globals.css';

export const metadata: Metadata = {
  title: 'Diário de Alimentação',
  description: 'Registre refeições e sintomas e descubra seus gatilhos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
            <span className="font-semibold text-teal-700">Diário Alimentar</span>
            <Link href="/" className="text-sm text-slate-600 hover:text-teal-700">
              Registro
            </Link>
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-teal-700">
              Dashboard
            </Link>
            {passwordEnabled() && (
              <form action={logoutAction} className="ml-auto">
                <button className="text-sm text-slate-400 hover:text-slate-700">Sair</button>
              </form>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
