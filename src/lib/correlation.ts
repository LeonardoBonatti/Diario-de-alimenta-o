/**
 * Motor de correlação alimento -> sintoma. Função pura, sem acesso a banco:
 * usada tanto pelo relatório do dashboard quanto pelo cron semanal.
 *
 * Modelo: um sintoma registrado no instante T é associado a toda refeição
 * ocorrida em [T - janela, T]. Um registro que contém alimentos E sintomas
 * conta como "sintoma logo após a refeição" (defasagem 0).
 */
import type { Entry } from './types';
import { HOUR_MS } from './dates';

export interface CorrelationOptions {
  periodStart: Date;
  periodEnd: Date;
  /** Quantas horas após a refeição um sintoma ainda é atribuído a ela. */
  windowHours?: number;
}

export interface SymptomLink {
  symptom: string;
  count: number;
  avgIntensity: number;
}

export interface FoodStat {
  food: string;
  timesEaten: number;
  timesFollowedBySymptom: number;
  /** timesFollowedBySymptom / timesEaten */
  symptomRate: number;
  /** Média da intensidade máxima dos sintomas nas vezes em que houve sintoma. */
  avgIntensity: number;
  /** symptomRate / taxa-base de todas as refeições. > 1 = acima do normal. */
  lift: number | null;
  /** Índice de gatilho (0–5): taxa × intensidade × confiança amostral. */
  score: number;
  lowConfidence: boolean;
  symptoms: SymptomLink[];
}

export interface SymptomTotal {
  symptom: string;
  count: number;
  avgIntensity: number;
  /** Ocorrências sem nenhuma refeição registrada dentro da janela. */
  unattributed: number;
}

export interface CorrelationReport {
  periodStart: string;
  periodEnd: string;
  windowHours: number;
  totalMeals: number;
  mealsFollowedBySymptom: number;
  baselineRate: number;
  foods: FoodStat[];
  symptoms: SymptomTotal[];
}

interface SymptomEvent {
  key: string;
  label: string;
  intensity: number;
  at: number;
}

interface FoodAcc {
  label: string;
  eaten: number;
  followed: number;
  intensitySum: number;
  symptoms: Map<string, { label: string; count: number; intensitySum: number }>;
}

export const DEFAULT_WINDOW_HOURS = 6;
const MIN_CONFIDENT_SAMPLES = 3;
/** Suavização: um alimento comido 1x com sintoma não deve liderar o ranking. */
const CONFIDENCE_PRIOR = 2;

/** Chave de agrupamento: ignora caixa, acentos e espaços extras ("Café" == "cafe"). */
export const normalizeKey = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

const round2 = (n: number) => Math.round(n * 100) / 100;

export function correlate(entries: Entry[], opts: CorrelationOptions): CorrelationReport {
  const windowHours = opts.windowHours ?? DEFAULT_WINDOW_HOURS;
  const windowMs = windowHours * HOUR_MS;
  const pStart = opts.periodStart.getTime();
  const pEnd = opts.periodEnd.getTime();
  const inPeriod = (t: number) => t >= pStart && t < pEnd;

  const sorted = [...entries].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  // Só sintomas dentro do período entram no relatório. Refeições anteriores ao
  // período (lookback) podem explicá-los, mas não são contabilizadas.
  const events: SymptomEvent[] = sorted.flatMap((e) => {
    const at = e.occurredAt.getTime();
    if (!inPeriod(at)) return [];
    return e.symptoms.map((s) => ({ key: normalizeKey(s.name), label: s.name.trim(), intensity: s.intensity, at }));
  });

  const foodAcc = new Map<string, FoodAcc>();
  const attributed = new Set<SymptomEvent>();
  let totalMeals = 0;
  let mealsFollowed = 0;

  for (const meal of sorted) {
    if (meal.foods.length === 0) continue;
    const t = meal.occurredAt.getTime();
    const after = events.filter((ev) => ev.at >= t && ev.at - t <= windowMs);
    after.forEach((ev) => attributed.add(ev));

    if (!inPeriod(t)) continue;
    totalMeals++;
    const followed = after.length > 0;
    if (followed) mealsFollowed++;
    const peak = after.reduce((max, ev) => Math.max(max, ev.intensity), 0);

    // Mesmo sintoma várias vezes após uma refeição conta uma vez (maior intensidade).
    const perSymptom = new Map<string, SymptomEvent>();
    for (const ev of after) {
      const prev = perSymptom.get(ev.key);
      if (!prev || ev.intensity > prev.intensity) perSymptom.set(ev.key, ev);
    }

    const foods = new Map(meal.foods.map((f) => [normalizeKey(f), f.trim()]));
    for (const [key, label] of foods) {
      let acc = foodAcc.get(key);
      if (!acc) {
        acc = { label, eaten: 0, followed: 0, intensitySum: 0, symptoms: new Map() };
        foodAcc.set(key, acc);
      }
      acc.eaten++;
      if (!followed) continue;
      acc.followed++;
      acc.intensitySum += peak;
      for (const ev of perSymptom.values()) {
        const s = acc.symptoms.get(ev.key) ?? { label: ev.label, count: 0, intensitySum: 0 };
        s.count++;
        s.intensitySum += ev.intensity;
        acc.symptoms.set(ev.key, s);
      }
    }
  }

  const baselineRate = totalMeals ? mealsFollowed / totalMeals : 0;

  const foods: FoodStat[] = [...foodAcc.values()]
    .map((a) => {
      const symptomRate = a.followed / a.eaten;
      const avgIntensity = a.followed ? a.intensitySum / a.followed : 0;
      const confidence = a.eaten / (a.eaten + CONFIDENCE_PRIOR);
      return {
        food: a.label,
        timesEaten: a.eaten,
        timesFollowedBySymptom: a.followed,
        symptomRate: round2(symptomRate),
        avgIntensity: round2(avgIntensity),
        lift: baselineRate > 0 ? round2(symptomRate / baselineRate) : null,
        score: round2(symptomRate * avgIntensity * confidence),
        lowConfidence: a.eaten < MIN_CONFIDENT_SAMPLES,
        symptoms: [...a.symptoms.values()]
          .map((s) => ({ symptom: s.label, count: s.count, avgIntensity: round2(s.intensitySum / s.count) }))
          .sort((x, y) => y.count - x.count),
      };
    })
    .sort((x, y) => y.score - x.score || y.timesFollowedBySymptom - x.timesFollowedBySymptom);

  const symptomAcc = new Map<string, { label: string; count: number; intensitySum: number; unattributed: number }>();
  for (const ev of events) {
    const s = symptomAcc.get(ev.key) ?? { label: ev.label, count: 0, intensitySum: 0, unattributed: 0 };
    s.count++;
    s.intensitySum += ev.intensity;
    if (!attributed.has(ev)) s.unattributed++;
    symptomAcc.set(ev.key, s);
  }

  return {
    periodStart: opts.periodStart.toISOString(),
    periodEnd: opts.periodEnd.toISOString(),
    windowHours,
    totalMeals,
    mealsFollowedBySymptom: mealsFollowed,
    baselineRate: round2(baselineRate),
    foods,
    symptoms: [...symptomAcc.values()]
      .map((s) => ({
        symptom: s.label,
        count: s.count,
        avgIntensity: round2(s.intensitySum / s.count),
        unattributed: s.unattributed,
      }))
      .sort((x, y) => y.count - x.count),
  };
}

/** Principais gatilhos: alimentos com sintoma associado e amostra mínima. */
export function topTriggers(report: CorrelationReport, limit = 5, minEaten = 2): FoodStat[] {
  return report.foods
    .filter((f) => f.timesFollowedBySymptom > 0 && f.timesEaten >= minEaten)
    .slice(0, limit);
}
