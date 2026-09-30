# Diário de Alimentação e Sintomas

Next.js (App Router) + TailwindCSS · **Vercel** (hospedagem + Cron) · **Neon Postgres** (via Vercel Marketplace).
App de **uso pessoal (um único usuário)**, protegido por uma senha opcional.

```
Navegador ──▶ middleware (senha) ──▶ Server Actions (validação) ──▶ Neon Postgres
                                                                    ▲
Vercel Cron (sáb 20h) ──▶ /api/cron/weekly-report ──────────────────┘ ──▶ Resend (e-mail, opcional)
```

O navegador **nunca** acessa o banco diretamente. Toda leitura e escrita passa por uma
Server Action ([`src/lib/actions.ts`](src/lib/actions.ts)), que confere a sessão e valida os dados.

---

## 1. Modelo de dados

Schema completo: [`src/lib/schema.ts`](src/lib/schema.ts), aplicado automaticamente pelo app.

| Tabela | Conteúdo |
|---|---|
| `users` | Uma única linha (`id = 'owner'`). Mantida para permitir multiusuário no futuro sem migração |
| `entries` | `user_id`, `meal_type` (null = só sintomas), `foods text[]`, `symptoms jsonb` (`[{name, intensity}]`), `notes`, **`occurred_at timestamptz`** |
| `weekly_reports` | PK `(user_id, week_start)`, `top_triggers jsonb`, `report jsonb`, `emailed_at` |

**Por que assim:**
- **Índice `(user_id, occurred_at)`**: toda consulta é "registros do usuário X entre A e B".
  É um *index range scan*, rápido mesmo com anos de dados.
- **`timestamptz`** guarda o instante absoluto. A conversão para "dia" usa o fuso
  America/Sao_Paulo ([`src/lib/dates.ts`](src/lib/dates.ts)).
- **`foods text[]` + `symptoms jsonb`** no próprio registro: uma linha = um evento, sem joins.
  A correlação é feita em TypeScript. Tabelas normalizadas (`entry_foods`, `entry_symptoms`)
  só compensariam se a correlação migrasse para SQL.
- **CHECKs** no banco (tipo de refeição válido, registro não vazio, limites) como
  segunda barreira além da validação em [`src/lib/entries.ts`](src/lib/entries.ts).
- **`weekly_reports` com PK composta**: o cron faz `upsert`, o que o torna idempotente.

## 2. Formulário

[`src/components/EntryForm.tsx`](src/components/EntryForm.tsx) cobre criação e edição (prop `initial`),
tags de alimentos, sintomas com escala 1–5 e data/hora automática ou manual. A validação no
cliente é só UX. O servidor revalida tudo em `normalizeEntryInput()`.

## 3. Filtro por datas e correlação

- [`src/lib/report.ts`](src/lib/report.ts), `getReportForRange()`: valida o intervalo, converte
  as datas para o fuso do app, **recua a busca em `windowHours`** (o jantar da véspera
  pode explicar um sintoma da madrugada) e faz uma única query de range.
- [`src/lib/correlation.ts`](src/lib/correlation.ts), `correlate()`: função pura, compartilhada
  pelo dashboard e pelo cron. Calcula, por alimento, a taxa de sintoma, a intensidade média,
  o `lift` (taxa do alimento comparada à taxa-base de todas as refeições) e um índice de
  gatilho com correção para amostras pequenas.

## 4. Configuração e relatório de sábado às 20h

### 4.1 Banco (Neon pela Vercel)
1. No projeto da Vercel: **Storage → Create Database → Neon (Serverless Postgres)**.
   Escolha uma região próxima (ex.: `aws-sa-east-1`, São Paulo) e conecte ao projeto.
   A integração injeta `DATABASE_URL` em todos os ambientes.
2. As tabelas são criadas automaticamente na primeira consulta (`create table if not exists`,
   ver [`src/lib/schema.ts`](src/lib/schema.ts)). Não é preciso rodar SQL manualmente.
3. Em **Settings → Functions → Function Region** da Vercel, use a mesma região do banco
   (ex.: `gru1`, São Paulo), para reduzir a latência de cada query.

### 4.2 Senha de acesso (recomendado)
Cadastre `APP_PASSWORD` nas variáveis da Vercel e faça Redeploy. A partir daí, o app pede
essa senha ([`src/middleware.ts`](src/middleware.ts)) e lembra o navegador por 90 dias.
Trocar a senha desconecta todos os navegadores.

Sem `APP_PASSWORD`, o app fica **aberto**: qualquer pessoa com o link vê e edita os dados.

### 4.3 Cron semanal
1. Cadastre `CRON_SECRET` (string aleatória longa). A Vercel a envia como
   `Authorization: Bearer <CRON_SECRET>`.
2. O [`vercel.json`](vercel.json) já declara o agendamento:
   ```json
   { "crons": [{ "path": "/api/cron/weekly-report", "schedule": "0 23 * * 6" }] }
   ```
   **O cron roda em UTC**: `0 23 * * 6` = sábado 23:00 UTC = **sábado 20:00 em Brasília**.
3. (Opcional) Para receber por e-mail, configure `REPORT_EMAIL_TO`, `RESEND_API_KEY`, `REPORT_EMAIL_FROM` e `APP_URL`.
4. Faça o deploy e confira em **Settings → Cron Jobs**. O botão **Run** dispara a rota na hora.

O que a rota [`route.ts`](src/app/api/cron/weekly-report/route.ts) faz:
calcula a semana (domingo a sábado), roda `correlate()`, faz `upsert` em `weekly_reports`
e, se configurado, envia o e-mail. Antes do envio, ela "reserva" a linha
(`emailed_at is null`), o que impede e-mails duplicados em execuções concorrentes.

**Observações:**
- Crons só rodam em deploys de **produção**.
- No plano **Hobby**, a execução pode acontecer em qualquer minuto entre 20:00 e 20:59.
- Para testar localmente:
  ```bash
  curl -H "Authorization: Bearer SEU_CRON_SECRET" http://localhost:3000/api/cron/weekly-report
  ```

## Rodando localmente

```bash
npm install
```
```bash

npm run dev
```

Crie o `.env.local` a partir de [`.env.example`](.env.example). Para o `DATABASE_URL`, use o
valor da aba Storage da Vercel. Uma opção é criar uma *branch* do Neon para desenvolvimento,
separando os dados de teste dos de produção.
