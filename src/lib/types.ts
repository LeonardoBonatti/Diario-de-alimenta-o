export const MEAL_TYPES = [
  'cafe_da_manha',
  'lanche_manha',
  'almoco',
  'lanche_tarde',
  'jantar',
  'ceia',
  'outro',
] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  cafe_da_manha: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
  ceia: 'Ceia',
  outro: 'Outro',
};

export type Intensity = 1 | 2 | 3 | 4 | 5;

export interface Symptom {
  name: string;
  intensity: Intensity;
}

/** Registro lido do banco. */
export interface Entry {
  id: string;
  mealType: MealType | null;
  /** Nome livre quando mealType = 'outro'. */
  mealLabel: string | null;
  foods: string[];
  symptoms: Symptom[];
  /** Deitou/dormiu até 3h depois de comer (null = não informado). */
  layDownSoon: boolean | null;
  /** Refeição volumosa (null = não informado). */
  largeMeal: boolean | null;
  occurredAt: Date;
  notes: string | null;
}

/** Dados vindos do formulário (não confiáveis até passar por normalizeEntryInput). */
export interface EntryInput {
  mealType: MealType | null;
  mealLabel?: string | null;
  foods: string[];
  symptoms: Symptom[];
  layDownSoon?: boolean | null;
  largeMeal?: boolean | null;
  occurredAt: Date;
  notes?: string | null;
}

export function mealDisplayName(entry: Pick<Entry, 'mealType' | 'mealLabel'>): string | null {
  if (!entry.mealType) return null;
  if (entry.mealType === 'outro' && entry.mealLabel) return entry.mealLabel;
  return MEAL_LABELS[entry.mealType];
}

/** Erro cuja mensagem pode ser exibida ao usuário. */
export class AppError extends Error {}
