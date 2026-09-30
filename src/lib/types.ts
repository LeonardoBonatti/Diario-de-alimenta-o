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

export const COMMON_SYMPTOMS = [
  'dor de estômago',
  'azia',
  'inchaço',
  'gases',
  'náusea',
  'diarreia',
  'constipação',
  'refluxo',
  'dor de cabeça',
  'cansaço',
];

export type Intensity = 1 | 2 | 3 | 4 | 5;

export interface Symptom {
  name: string;
  intensity: Intensity;
}

/** Registro lido do banco. */
export interface Entry {
  id: string;
  mealType: MealType | null;
  foods: string[];
  symptoms: Symptom[];
  occurredAt: Date;
  notes: string | null;
}

/** Dados vindos do formulário (não confiáveis até passar por normalizeEntryInput). */
export interface EntryInput {
  mealType: MealType | null;
  foods: string[];
  symptoms: Symptom[];
  occurredAt: Date;
  notes?: string | null;
}

/** Erro cuja mensagem pode ser exibida ao usuário. */
export class AppError extends Error {}
