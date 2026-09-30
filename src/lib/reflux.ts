/**
 * Vocabulário de refluxo (DRGE e refluxo laringofaríngeo — RLF).
 * No RLF o ácido chega à laringe e os sintomas costumam ser de garganta e voz,
 * muitas vezes sem azia; por isso eles têm um grupo próprio.
 */
import { normalizeKey } from './correlation';

export interface SymptomGroup {
  id: string;
  label: string;
  description: string;
  /** Se os sintomas do grupo contam como "refluxo" nos relatórios. */
  reflux: boolean;
  symptoms: string[];
}

export const SYMPTOM_GROUPS: SymptomGroup[] = [
  {
    id: 'garganta',
    label: 'Garganta e voz',
    description: 'Típicos do refluxo laringofaríngeo. Costumam aparecer sem azia.',
    reflux: true,
    symptoms: [
      'pigarro',
      'rouquidão',
      'tosse',
      'bolo na garganta',
      'muco na garganta',
      'dor de garganta',
      'dificuldade para engolir',
      'engasgo',
    ],
  },
  {
    id: 'digestivo',
    label: 'Estômago e esôfago',
    description: 'Sintomas clássicos da DRGE.',
    reflux: true,
    symptoms: ['azia', 'regurgitação', 'gosto ácido na boca', 'queimação no peito', 'arroto'],
  },
  {
    id: 'outros',
    label: 'Outros',
    description: '',
    reflux: false,
    symptoms: ['inchaço', 'gases', 'náusea', 'dor de estômago', 'dor de cabeça', 'cansaço'],
  },
];

export const ALL_SYMPTOMS = SYMPTOM_GROUPS.flatMap((g) => g.symptoms);

// Palavras-chave extras cobrem variações digitadas ("tosse seca", "voz fraca", "refluxo").
const REFLUX_KEYS = [
  ...new Set(
    [...SYMPTOM_GROUPS.filter((g) => g.reflux).flatMap((g) => g.symptoms), 'refluxo', 'garganta', 'voz', 'queimacao'].map(
      normalizeKey,
    ),
  ),
];

export function isRefluxSymptom(name: string): boolean {
  const key = normalizeKey(name);
  return REFLUX_KEYS.some((k) => key.includes(k));
}

/** Sugestões rápidas no formulário. */
export const COMMON_TRIGGERS = [
  'café',
  'chocolate',
  'refrigerante',
  'álcool',
  'tomate',
  'cítricos',
  'fritura',
  'pimenta',
  'hortelã',
  'cebola',
  'alho',
  'chá preto',
];

// Gatilhos frequentemente associados ao refluxo (literatura e orientação clínica usual).
const TRIGGER_KEYS = [
  'cafe', 'cha preto', 'cha mate', 'energetico', 'chocolate', 'refrigerante', 'agua com gas', 'gaseificad',
  'cerveja', 'vinho', 'alcool', 'cachaca', 'whisky', 'vodka', 'tomate', 'ketchup', 'citric', 'laranja',
  'limao', 'abacaxi', 'maracuja', 'tangerina', 'fritura', 'frito', 'frita', 'bacon', 'gordura',
  'pimenta', 'picante', 'hortela', 'cebola', 'alho', 'mostarda',
];

export function isCommonTrigger(food: string): boolean {
  const key = normalizeKey(food);
  return TRIGGER_KEYS.some((k) => key.includes(k));
}
