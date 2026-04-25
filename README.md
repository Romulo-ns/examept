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
cp .env.example .env  # configurar variáveis
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # configurar variáveis
npm run dev
```

## Estrutura

```
ExamePT/
├── frontend/     # Next.js App Router
├── backend/      # NestJS API
└── README.md
```

## Licença

Projecto privado — todos os direitos reservados.
