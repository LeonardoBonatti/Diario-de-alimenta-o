import 'server-only';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { SCHEMA_STATEMENTS } from './schema';

let client: NeonQueryFunction<false, false> | null = null;
let schemaReady: Promise<void> | null = null;

/** Criado sob demanda: a ausência de DATABASE_URL não quebra o build. */
function getClient() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL não definida. Conecte o Neon ao projeto na Vercel (Storage) e faça Redeploy.');
    }
    client = neon(url);
  }
  return client;
}

/** Cria as tabelas se não existirem. Roda uma vez por instância; em caso de falha, tenta de novo na próxima chamada. */
function ensureSchema() {
  schemaReady ??= (async () => {
    const c = getClient();
    for (const statement of SCHEMA_STATEMENTS) await c.query(statement);
  })().catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}

/** Tagged template para queries parametrizadas (driver HTTP do Neon). */
export async function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  await ensureSchema();
  return getClient()(strings, ...values);
}
