# ExamPT 🎓

> Plataforma gamificada de preparação para Exames Nacionais em Portugal

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TailwindCSS v4 + React Query + Zustand |
| Backend | NestJS 10 + Prisma ORM |
| Database | PostgreSQL (Supabase) |
| Cache | Redis (Upstash) |
| Deploy | Vercel + Supabase |

## Setup Local

### Pré-requisitos
- Node.js 20 LTS
- npm ou yarn
- PostgreSQL (local ou Supabase)

### Backend

```bash
cd backend
npm install
cp .env.example .env  # configurar variáveis (incluindo Stripe)
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

#### Stripe (Desenvolvimento Local)
Para testar os pagamentos e webhooks localmente, é necessário o Stripe CLI:
1. Garanta que o `stripe.exe` está na pasta `backend`.
2. Num terminal separado:
```bash
npm run stripe:listen
```
3. Use cartões de teste do Stripe (ex: 4242 4242...) para simular compras.

#### Reset de Dados
Para limpar subscrições de teste e voltar ao plano FREE:
```bash
node reset.js
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Estrutura

```
ExamePT/
├── frontend/     # Next.js 14 App Router
├── backend/      # NestJS API (Node + Prisma)
└── README.md
```

## Licença

Projecto privado — todos os direitos reservados.
