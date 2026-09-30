/**
 * Acesso por senha única (APP_PASSWORD). Sem a variável, o app fica aberto.
 * Compatível com o runtime do middleware (usa só Web Crypto).
 */
export const SESSION_COOKIE = 'diario_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 dias

/** Token do cookie: derivado da senha, então trocar a senha invalida sessões antigas. */
export async function sessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`diario-alimentacao:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function passwordEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  if (!password) return true;
  if (!cookieValue) return false;
  return cookieValue === (await sessionToken(password));
}
