import 'server-only';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Conecte o Neon ao projeto na Vercel (aba Storage).');
}

/** Driver HTTP do Neon: ideal para funções serverless (sem pool de conexões). */
export const sql = neon(process.env.DATABASE_URL);
