import NextAuth, { type DefaultSession } from 'next-auth';
import Google from 'next-auth/providers/google';
import { sql } from './db';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

const REQUIRED_AUTH_ENV = ['AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'] as const;

/** Variáveis de login ausentes; usado para exibir um aviso claro em vez do erro genérico. */
export function missingAuthEnv(): string[] {
  return REQUIRED_AUTH_ENV.filter((name) => !process.env[name]);
}

/**
 * Sessão em JWT (cookie criptografado): não precisa de tabelas de sessão.
 * O id do usuário é o "sub" do Google, estável entre logins.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  // Na Vercel o host é confiável; evita o erro UntrustedHost em domínios de preview.
  trustHost: true,
  pages: { error: '/auth-error' },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    // Garante a linha em users (o cron itera essa tabela e usa o e-mail).
    // Uma falha aqui é registrada, mas não impede o login.
    async signIn({ user }) {
      if (!user.id || !user.email) return;
      try {
        await sql`
          insert into users (id, email, name)
          values (${user.id}, ${user.email}, ${user.name ?? null})
          on conflict (id) do update
            set email = excluded.email, name = excluded.name, last_login_at = now()`;
      } catch (err) {
        console.error('[auth] falha ao registrar usuário no banco', err);
      }
    },
  },
});
