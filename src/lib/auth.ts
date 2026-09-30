import NextAuth, { type DefaultSession } from 'next-auth';
import Google from 'next-auth/providers/google';
import { sql } from './db';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

/**
 * Sessão em JWT (cookie criptografado): não precisa de tabelas de sessão.
 * O id do usuário é o "sub" do Google, estável entre logins.
 * Variáveis: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    // Garante a linha em users (o cron itera essa tabela e usa o e-mail).
    async signIn({ user }) {
      if (!user.id || !user.email) return;
      await sql`
        insert into users (id, email, name)
        values (${user.id}, ${user.email}, ${user.name ?? null})
        on conflict (id) do update
          set email = excluded.email, name = excluded.name, last_login_at = now()`;
    },
  },
});
