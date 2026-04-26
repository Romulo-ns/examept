# ExamPT - Próximos Passos (To-Do List)

Este documento contém a lista de tarefas e funcionalidades planeadas para o futuro da plataforma ExamPT. Pode ser exportado para PDF para acompanhamento do projeto.

## 🚀 1. Funcionalidade: Geração de Exames em PDF
**Objetivo:** Permitir que os alunos (especialmente os Premium) possam descarregar exames personalizados em formato PDF para imprimir e resolver no papel, simulando o ambiente real de exame.
- [x] Escolher uma biblioteca de geração de PDFs (ex: `pdfmake` no frontend ou `@react-pdf/renderer` ou Puppeteer no backend).
- [x] Criar um endpoint/rota genérica que pegue em 10-20 questões aleatórias de uma disciplina e as formate.
- [x] Gerar automaticamente uma "Página de Soluções" no final do PDF.
- [x] Adicionar botão "Gerar PDF" no Dashboard do utilizador Premium.

## 💳 2. Finalizar Configuração do Stripe (Em Ambiente de Produção)
**Objetivo:** Começar a receber pagamentos reais.
- [ ] Criar conta no Stripe.
- [ ] Criar o Produto "Plano Mensal" e "Plano Anual" no Dashboard do Stripe.
- [ ] Copiar as chaves oficiais para as variáveis `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY` e `STRIPE_PRICE_ANNUAL`.

## 🌍 3. Deployment (Lançar o Projeto na Internet)
**Objetivo:** Colocar a aplicação online para os alunos usarem.
- [x] **Base de Dados:** Criar uma base de dados PostgreSQL alojada na cloud (Supabase configurado).
- [/] **Backend:** Alojamento da API NestJS no Railway (Preparação concluída).
- [/] **Frontend:** Alojamento da plataforma Next.js na Vercel (Preparação concluída).
- [ ] Comprar um domínio (ex: `examept.pt`) e configurá-lo na Vercel.

## 📚 4. População da Base de Dados (Conteúdo)
**Objetivo:** Inserir perguntas reais dos exames nacionais.
- [ ] Reunir os PDFs antigos do IAVE e extrair as perguntas, opções e imagens.
- [ ] Criar um script de "Seed" avançado ou um Backoffice (Painel de Administração) para facilitar a introdução manual/automática de perguntas com imagens.
- [ ] Adicionar imagens às questões armazenando-as num serviço de cloud storage (ex: AWS S3 ou Supabase Storage).

## 🎮 5. Refinamentos de Gamificação
**Objetivo:** Aumentar a retenção dos alunos.
- [ ] Criar um sistema de "Missões Diárias" (ex: "Acerta em 5 perguntas de Biologia hoje").
- [ ] Implementar Notificações (emails ou web push) para avisar os alunos quando perdem a sua *Streak* (dias consecutivos de estudo).
