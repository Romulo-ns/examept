# ExamPT — Arquitectura Técnica Completa

> App de estudos gamificado para o Exame Nacional em Portugal  
> Stack: React + TailwindCSS · Node.js + NestJS · PostgreSQL · Vercel + Supabase

---

## 1. Visão Geral do Produto

### Conceito
Plataforma gamificada de preparação para exames nacionais portugueses. Exercícios adaptativos por dificuldade real, ranking nacional, histórico detalhado de acertos, gráficos por matéria e sistema de monetização desde o dia 1.

### Planos

| Feature | Free | Premium (€7,99/mês) |
|---|---|---|
| Exercícios / dia | 10 | Ilimitado |
| Exames passados | Parcial | Todos (2006–2024) |
| Ranking | Básico (top 100) | Completo + histórico |
| Estatísticas | Simples | Avançada por matéria |
| Explicações | Não | Sim (detalhadas) |
| Dica sem penalização no rank | Não | Sim |
| Relatório semanal | Não | Sim |

---

## 2. Stack Técnica

### Frontend
- **React 18** (Vite ou Next.js App Router)
- **TailwindCSS v4** — mobile-first, design system consistente
- **React Query (TanStack)** — cache de dados + sincronização
- **Recharts** — gráficos de desempenho
- **Zustand** — estado global (sessão, quiz activo)
- **React Hook Form + Zod** — validação de formulários
- **Framer Motion** — animações gamificadas (XP, streak)

### Backend
- **Node.js 20 LTS**
- **NestJS 10** — módulos, guards, decorators
- **Prisma ORM** — type-safe queries + migrations
- **PostgreSQL 15** (Supabase hosted)
- **Redis** (Upstash) — rate limiting, cache de ranking, sessões
- **Stripe** — pagamentos e subscriptions
- **Resend / Nodemailer** — emails transaccionais

### Deploy
- **Frontend** → Vercel (Edge Network, preview deployments)
- **Backend** → Vercel Serverless Functions ou Railway.app
- **Base de dados** → Supabase PostgreSQL
- **Cache** → Upstash Redis
- **Storage** (imagens, PDFs) → Supabase Storage ou Cloudflare R2
- **CI/CD** → GitHub Actions → Vercel

---

## 3. Modelo de Base de Dados

### Tabelas principais

```sql
-- Utilizadores
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  nick        TEXT UNIQUE NOT NULL,  -- constraint único obrigatório
  nick_changed_at TIMESTAMPTZ,       -- controlo de quando mudou (1x/mês)
  password_hash TEXT,
  plan        TEXT DEFAULT 'free' CHECK (plan IN ('free','premium')),
  plan_expires_at TIMESTAMPTZ,
  xp          INTEGER DEFAULT 0,
  level       INTEGER DEFAULT 1,
  streak      INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Matérias/Disciplinas
CREATE TABLE subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,          -- 'Biologia e Geologia'
  slug        TEXT UNIQUE NOT NULL,   -- 'biologia-geologia'
  exam_code   TEXT,                   -- código oficial IAVE
  is_active   BOOLEAN DEFAULT TRUE
);

-- Questões
CREATE TABLE questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  UUID REFERENCES subjects(id),
  year        INTEGER,                -- ano do exame (2006..2024 ou NULL se criada)
  exam_phase  TEXT,                   -- '1ª fase', '2ª fase', 'época especial'
  text        TEXT NOT NULL,
  difficulty  INTEGER DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  difficulty_computed NUMERIC(4,2),  -- calculado com base em acertos reais
  type        TEXT DEFAULT 'mcq' CHECK (type IN ('mcq','true_false','open')),
  explanation TEXT,                  -- explicação completa (premium)
  hint        TEXT,                  -- dica opcional
  tags        TEXT[],
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Opções de resposta (MCQ)
CREATE TABLE options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  label       CHAR(1) NOT NULL,      -- A, B, C, D
  text        TEXT NOT NULL,
  is_correct  BOOLEAN DEFAULT FALSE,
  position    INTEGER NOT NULL
);

-- Tentativas de resposta
CREATE TABLE attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id   UUID REFERENCES questions(id),
  option_id     UUID REFERENCES options(id),
  is_correct    BOOLEAN NOT NULL,
  hint_used     BOOLEAN DEFAULT FALSE,
  time_spent_ms INTEGER,
  xp_earned     INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de estudo
CREATE TABLE study_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id      UUID REFERENCES subjects(id),
  questions_total INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  xp_earned       INTEGER DEFAULT 0,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);

-- Ranking (materialised view ou tabela actualizada via trigger)
CREATE TABLE ranking_cache (
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  period      TEXT CHECK (period IN ('week','month','all')),
  score       INTEGER DEFAULT 0,
  rank        INTEGER,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, period)
);

-- Pagamentos / Subscriptions
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id  TEXT,
  status              TEXT, -- 'active','canceled','past_due'
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### Índices críticos para performance

```sql
-- Pesquisa de questões por matéria e dificuldade
CREATE INDEX idx_questions_subject_difficulty ON questions(subject_id, difficulty_computed);
CREATE INDEX idx_questions_year ON questions(year);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);

-- Histórico de tentativas por utilizador
CREATE INDEX idx_attempts_user_created ON attempts(user_id, created_at DESC);
CREATE INDEX idx_attempts_user_question ON attempts(user_id, question_id);

-- Sessões de estudo
CREATE INDEX idx_sessions_user_date ON study_sessions(user_id, started_at DESC);

-- Ranking lookup
CREATE INDEX idx_ranking_period_score ON ranking_cache(period, score DESC);

-- Nick único (já garantido pelo UNIQUE constraint, mas explícito)
CREATE UNIQUE INDEX idx_users_nick_lower ON users(LOWER(nick));
```

---

## 4. Arquitectura NestJS — Módulos

```
src/
├── app.module.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts        # POST /auth/register, /login, /refresh
│   ├── auth.service.ts
│   ├── strategies/               # JWT, Google OAuth
│   └── guards/                   # JwtAuthGuard, PremiumGuard
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts       # GET /me, PATCH /me/nick, PATCH /me/avatar
│   ├── users.service.ts
│   └── dto/
├── questions/
│   ├── questions.module.ts
│   ├── questions.controller.ts   # GET /questions, GET /questions/:id
│   ├── questions.service.ts      # lógica de dificuldade adaptativa
│   └── dto/
├── attempts/
│   ├── attempts.module.ts
│   ├── attempts.controller.ts    # POST /attempts
│   ├── attempts.service.ts       # XP, streak, ranking update
│   └── dto/
├── subjects/
│   ├── subjects.module.ts
│   └── subjects.controller.ts    # GET /subjects + estatísticas por matéria
├── ranking/
│   ├── ranking.module.ts
│   └── ranking.controller.ts     # GET /ranking?period=week|month|all
├── stats/
│   ├── stats.module.ts
│   └── stats.controller.ts       # GET /stats/me (gráficos, taxa acerto, etc.)
├── subscriptions/
│   ├── subscriptions.module.ts
│   ├── subscriptions.controller.ts  # POST /subscriptions/checkout
│   ├── stripe.service.ts
│   └── webhooks.controller.ts    # POST /webhooks/stripe
└── seeds/
    ├── seed.ts                   # popular questions, subjects
    └── questions.seed.ts
```

---

## 5. Sistema de Dificuldade Adaptativa

A dificuldade de cada questão é calculada com base nos acertos reais dos utilizadores.

```typescript
// Após cada tentativa, recalcular difficulty_computed da questão
async function updateQuestionDifficulty(questionId: string) {
  const result = await prisma.attempts.aggregate({
    where: { question_id: questionId },
    _count: { id: true },
    _sum: { is_correct: true }  // cast boolean para int no Postgres
  });

  const total = result._count.id;
  if (total < 10) return; // mínimo de amostras

  const successRate = result._sum.is_correct / total;
  
  // Mapear taxa de acerto para escala 1-5
  // 90%+ acerto → dificuldade 1 (fácil)
  // <30% acerto → dificuldade 5 (muito difícil)
  const computed = Math.max(1, Math.min(5, 
    Math.round((1 - successRate) * 5) + 1
  ));

  await prisma.questions.update({
    where: { id: questionId },
    data: { difficulty_computed: computed }
  });
}
```

### Selecção adaptativa de questões

```typescript
async function getNextQuestion(userId: string, subjectId?: string) {
  // 1. Buscar taxa de acerto do utilizador por dificuldade
  const userPerf = await getUserPerformanceByDifficulty(userId);
  
  // 2. Dar mais questões no nível onde tem 50-70% acerto
  // (zona de desenvolvimento proximal)
  const targetDifficulty = computeTargetDifficulty(userPerf);
  
  // 3. Evitar repetir questões recentes
  const recentIds = await getRecentAttemptIds(userId, 50);
  
  return prisma.questions.findFirst({
    where: {
      subject_id: subjectId || undefined,
      difficulty_computed: { gte: targetDifficulty - 0.5, lte: targetDifficulty + 0.5 },
      id: { notIn: recentIds },
      is_active: true
    },
    orderBy: { created_at: 'desc' }
  });
}
```

---

## 6. Sistema de XP, Streak e Gamificação

```typescript
function calculateXP(attempt: Attempt): number {
  if (!attempt.is_correct) return 0;
  
  let xp = 10; // base
  
  // Bónus por dificuldade
  xp += attempt.question.difficulty_computed * 4;
  
  // Penalização por usar dica
  if (attempt.hint_used) xp *= 0.5;
  
  // Bónus por velocidade (< 30s)
  if (attempt.time_spent_ms < 30000) xp += 5;
  
  return Math.round(xp);
}

async function updateStreak(userId: string) {
  const user = await prisma.users.findUnique({ where: { id: userId } });
  const now = new Date();
  const lastActivity = user.last_activity_at;
  
  if (!lastActivity) {
    // Primeira actividade
    return prisma.users.update({ where: { id: userId }, data: { streak: 1, last_activity_at: now } });
  }
  
  const diffDays = differenceInDays(now, lastActivity);
  
  if (diffDays === 0) return; // mesmo dia, não actualiza
  if (diffDays === 1) {
    // Dia seguinte, incrementa streak
    return prisma.users.update({ where: { id: userId }, data: { streak: { increment: 1 }, last_activity_at: now } });
  }
  // Quebrou streak
  return prisma.users.update({ where: { id: userId }, data: { streak: 1, last_activity_at: now } });
}
```

---

## 7. Lógica de Ranking (sem penalização com dica — Premium)

```typescript
async function updateRanking(userId: string, xpEarned: number) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());
  
  // Actualiza ranking semanal, mensal e geral
  for (const period of ['week', 'month', 'all']) {
    await prisma.ranking_cache.upsert({
      where: { user_id_period: { user_id: userId, period } },
      update: { score: { increment: xpEarned } },
      create: { user_id: userId, period, score: xpEarned }
    });
  }
  
  // Recalcular ranks (pode ser feito via Postgres window function)
  await recalculateRanks();
}

-- SQL para recalcular ranks eficientemente
UPDATE ranking_cache rc
SET rank = sub.new_rank
FROM (
  SELECT user_id, period,
         RANK() OVER (PARTITION BY period ORDER BY score DESC) as new_rank
  FROM ranking_cache
) sub
WHERE rc.user_id = sub.user_id AND rc.period = sub.period;
```

**Nota sobre dicas:** Utilizadores Free que usam dica ficam com XP = 0 para aquela questão (não conta para ranking). Utilizadores Premium com dica recebem 50% do XP (conta para ranking).

---

## 8. Páginas Frontend

### 8.1 Landpage (`/`)
- Hero com CTA duplo (Começar grátis / Ver demo)
- Stats sociais (nº questões, utilizadores, anos de exames)
- Features cards (6 principais)
- Comparação de planos Free vs Premium
- Testemunhos de utilizadores
- FAQ

### 8.2 Auth (`/login`, `/register`)
- Formulário com validação Zod
- OAuth com Google
- Verificação de email
- Página de reset de password

### 8.3 Dashboard (`/dashboard`)
- Saudação personalizada + countdown para exame
- Streak actual com indicador visual
- 4 métricas principais: questões, taxa acerto, ranking, XP
- Gráfico de actividade semanal (barras)
- Gráfico de desempenho por matéria (horizontal bars)
- Questões recentes com resultado
- Botão "Continuar a estudar" → exercícios

### 8.4 Exercícios (`/exercicios`)
- Filtros: matéria, ano, dificuldade, tipo (exame/treino)
- Progress bar visual (questão X de Y)
- Card da questão com opções A/B/C/D
- Botão de dica com aviso de penalização (Free) ou sem penalização (Premium)
- Feedback imediato: correto/errado + explicação
- XP ganho animado
- Histórico da sessão

### 8.5 Ranking (`/ranking`)
- Toggle: Semana / Mês / Geral
- Pódio visual (top 3)
- Lista posições 4–100
- Destaque da posição do utilizador autenticado
- Tags de matéria (ranking por disciplina — Premium)

### 8.6 Perfil (`/perfil`)
- Avatar + nick + email
- Edição de nick com verificação de unicidade (debounce + API check)
- Badges e conquistas
- Estatísticas detalhadas
- Gráfico radar por matéria (melhores / piores)
- Histórico de estudo por dia
- Gestão de plano / upgrade

### 8.7 Monetização (`/premium`)
- Comparação detalhada de planos
- Checkout Stripe integrado
- Página de sucesso pós-pagamento
- Portal de gestão de subscrição (Stripe Customer Portal)

---

## 9. Seeds — Popular Base de Dados

```typescript
// prisma/seed.ts
async function main() {
  // 1. Matérias
  const subjects = await seedSubjects();
  
  // 2. Questões (mínimo 500 para arrancar)
  await seedQuestions(subjects);
  
  // 3. Utilizadores de teste
  await seedTestUsers();
}

const SUBJECTS_SEED = [
  { name: 'Biologia e Geologia', slug: 'bio-geo', exam_code: 'BG' },
  { name: 'Matemática A', slug: 'mat-a', exam_code: 'MAT-A' },
  { name: 'Matemática B', slug: 'mat-b', exam_code: 'MAT-B' },
  { name: 'Físico-Química A', slug: 'fqA', exam_code: 'FQA' },
  { name: 'Português', slug: 'port', exam_code: 'PORT' },
  { name: 'Inglês', slug: 'ing', exam_code: 'ING' },
  { name: 'História A', slug: 'hist-a', exam_code: 'HIST-A' },
  { name: 'Geometria Descritiva A', slug: 'gda', exam_code: 'GDA' },
  { name: 'Economia A', slug: 'econ-a', exam_code: 'ECON-A' },
  { name: 'Filosofia', slug: 'filo', exam_code: 'FILO' },
];
```

---

## 10. Segurança e Regras

### Nick único
- `UNIQUE INDEX idx_users_nick_lower ON users(LOWER(nick))` — case-insensitive
- Validação no backend antes do UPDATE
- Verificação em tempo real no frontend (debounce 500ms)
- Mudança permitida 1x por mês (`nick_changed_at` check)

### Rate Limiting (Redis/Upstash)
```typescript
// NestJS Guard
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('attempts')
async submitAttempt() { ... }

// Limite de exercícios Free
async checkDailyLimit(userId: string): Promise<boolean> {
  const user = await this.usersService.findOne(userId);
  if (user.plan === 'premium') return true;
  
  const todayAttempts = await this.attemptsService.countToday(userId);
  return todayAttempts < 10;
}
```

### Autenticação JWT
```typescript
// Access token: 15 min
// Refresh token: 7 dias (rotação automática)
// Armazenamento: httpOnly cookies (não localStorage)
```

---

## 11. Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql://...@supabase.co:5432/postgres
DIRECT_URL=postgresql://...   # para Prisma migrations

# Auth
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...

# Redis
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Email
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@exampt.pt

# App
FRONTEND_URL=https://exampt.pt
NODE_ENV=production
```

---

## 12. Roadmap de Desenvolvimento

### Fase 1 — MVP (6-8 semanas)
- [ ] Auth (register/login/JWT/Google OAuth)
- [ ] Modelo de dados + migrations + seeds (500 questões)
- [ ] Exercícios básicos MCQ (10/dia Free)
- [ ] Dashboard simples
- [ ] Ranking semanal

### Fase 2 — Gamificação (4 semanas)
- [ ] Sistema XP + níveis + streak
- [ ] Animações de feedback (Framer Motion)
- [ ] Gráficos por matéria
- [ ] Dificuldade adaptativa real
- [ ] Badges e conquistas

### Fase 3 — Monetização (3 semanas)
- [ ] Integração Stripe (checkout + webhooks)
- [ ] Portal de cliente Stripe
- [ ] Premium gates (explicações, exames completos)
- [ ] Email marketing (Resend)

### Fase 4 — Escala (contínuo)
- [ ] Exames passados completos (PDF parser + admin import)
- [ ] Admin panel para gestão de questões
- [ ] Push notifications (PWA)
- [ ] App mobile (React Native ou PWA)
- [ ] Analytics avançado (PostHog)

---

## 13. Estrutura de Pastas Frontend

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── exercicios/
│   │   │   ├── ranking/
│   │   │   └── perfil/
│   │   ├── premium/
│   │   └── page.tsx            # Landpage
│   ├── components/
│   │   ├── ui/                 # Botões, inputs, badges, cards
│   │   ├── exercise/           # QuestionCard, OptionItem, HintBox
│   │   ├── charts/             # SubjectChart, ActivityChart
│   │   ├── ranking/            # Podium, RankList, RankItem
│   │   └── layout/             # Navbar, Sidebar, Footer
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useExercise.ts
│   │   └── useRanking.ts
│   ├── lib/
│   │   ├── api.ts              # Axios instance + interceptors
│   │   └── queryClient.ts
│   ├── store/
│   │   └── useStore.ts         # Zustand
│   └── types/
│       └── index.ts
├── tailwind.config.ts
└── .env.local
```
