/**
 * Reflux Symptom Index (RSI) — Belafsky, Postma & Koufman, 2002.
 * Questionário de 9 itens, cada um de 0 (sem problema) a 5 (problema intenso),
 * referente ao último mês. Total acima de 13 sugere refluxo laringofaríngeo.
 * Serve para acompanhar a evolução; não substitui avaliação médica.
 */
export const RSI_ITEMS = [
  'Rouquidão ou algum problema na voz',
  'Pigarro (necessidade de limpar a garganta)',
  'Excesso de muco na garganta ou secreção descendo do nariz',
  'Dificuldade para engolir alimentos, líquidos ou comprimidos',
  'Tosse depois de comer ou ao deitar',
  'Dificuldade para respirar ou crises de engasgo',
  'Tosse incômoda ou irritante',
  'Sensação de algo parado na garganta ("bolo")',
  'Azia, dor no peito, indigestão ou ácido subindo',
] as const;

export const RSI_MAX = RSI_ITEMS.length * 5;
export const RSI_THRESHOLD = 13;

export function rsiInterpretation(total: number): { label: string; elevated: boolean } {
  return total > RSI_THRESHOLD
    ? { label: `Acima de ${RSI_THRESHOLD}: compatível com refluxo laringofaríngeo`, elevated: true }
    : { label: `Até ${RSI_THRESHOLD}: dentro da faixa considerada normal`, elevated: false };
}
