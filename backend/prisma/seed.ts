import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding ExamPT database...');

  // 1. Subjects
  const matA = await prisma.subject.upsert({
    where: { slug: 'mat-a' },
    update: {},
    create: { name: 'Matemática A', slug: 'mat-a', examCode: 'MAT-A' },
  });
  const port = await prisma.subject.upsert({
    where: { slug: 'port' },
    update: {},
    create: { name: 'Português', slug: 'port', examCode: 'PORT' },
  });
  const bioGeo = await prisma.subject.upsert({
    where: { slug: 'bio-geo' },
    update: {},
    create: { name: 'Biologia e Geologia', slug: 'bio-geo', examCode: 'BG' },
  });

  console.log('✅ Subjects created');

  // 2. Questions - Matemática A
  const matQuestions = [
    {
      text: 'Qual é a derivada de f(x) = 3x² + 2x - 5?',
      difficulty: 2, year: 2023, examPhase: '1ª fase',
      explanation: 'Aplicando a regra da potência: f\'(x) = 6x + 2',
      hint: 'Aplica a regra da potência a cada termo.',
      options: [
        { label: 'A', text: '6x + 2', isCorrect: true },
        { label: 'B', text: '6x - 5', isCorrect: false },
        { label: 'C', text: '3x + 2', isCorrect: false },
        { label: 'D', text: '6x² + 2', isCorrect: false },
      ],
    },
    {
      text: 'Resolve a equação: 2x² - 8 = 0',
      difficulty: 1, year: 2022, examPhase: '1ª fase',
      explanation: '2x² = 8 → x² = 4 → x = ±2',
      hint: 'Isola x² e depois aplica a raiz quadrada.',
      options: [
        { label: 'A', text: 'x = 2 ou x = -2', isCorrect: true },
        { label: 'B', text: 'x = 4', isCorrect: false },
        { label: 'C', text: 'x = 2', isCorrect: false },
        { label: 'D', text: 'x = -4 ou x = 4', isCorrect: false },
      ],
    },
    {
      text: 'Qual é o limite de (sin x)/x quando x → 0?',
      difficulty: 3, year: 2023, examPhase: '2ª fase',
      explanation: 'Este é um limite notável fundamental: lim(x→0) sin(x)/x = 1',
      hint: 'É um dos limites notáveis mais conhecidos.',
      options: [
        { label: 'A', text: '1', isCorrect: true },
        { label: 'B', text: '0', isCorrect: false },
        { label: 'C', text: '∞', isCorrect: false },
        { label: 'D', text: 'Não existe', isCorrect: false },
      ],
    },
    {
      text: 'A função f(x) = ln(x) tem domínio:',
      difficulty: 2, year: 2021, examPhase: '1ª fase',
      explanation: 'O logaritmo natural só está definido para valores positivos de x.',
      hint: 'Para que valores de x é que ln(x) está definido?',
      options: [
        { label: 'A', text: 'ℝ⁺ (reais positivos)', isCorrect: true },
        { label: 'B', text: 'ℝ', isCorrect: false },
        { label: 'C', text: 'ℝ₀⁺', isCorrect: false },
        { label: 'D', text: 'ℝ \\ {0}', isCorrect: false },
      ],
    },
    {
      text: 'Qual é o valor de C(5,2)?',
      difficulty: 2, year: 2022, examPhase: '2ª fase',
      explanation: 'C(5,2) = 5! / (2! × 3!) = (5×4) / (2×1) = 10',
      hint: 'Usa a fórmula das combinações: n! / (k!(n-k)!)',
      options: [
        { label: 'A', text: '10', isCorrect: true },
        { label: 'B', text: '20', isCorrect: false },
        { label: 'C', text: '5', isCorrect: false },
        { label: 'D', text: '25', isCorrect: false },
      ],
    },
    {
      text: 'Se f(x) = eˣ, então f\'(x) é igual a:',
      difficulty: 1, year: 2023, examPhase: '1ª fase',
      explanation: 'A derivada de eˣ é ela própria: d/dx(eˣ) = eˣ',
      hint: 'A função exponencial tem uma propriedade especial na derivação.',
      options: [
        { label: 'A', text: 'eˣ', isCorrect: true },
        { label: 'B', text: 'x·eˣ⁻¹', isCorrect: false },
        { label: 'C', text: 'ln(x)', isCorrect: false },
        { label: 'D', text: '1/x', isCorrect: false },
      ],
    },
    {
      text: 'O integral de ∫2x dx é:',
      difficulty: 2, year: 2021, examPhase: '1ª fase',
      explanation: '∫2x dx = x² + C, pela regra da potência inversa.',
      hint: 'A primitiva é a operação inversa da derivada.',
      options: [
        { label: 'A', text: 'x² + C', isCorrect: true },
        { label: 'B', text: '2 + C', isCorrect: false },
        { label: 'C', text: 'x² / 2 + C', isCorrect: false },
        { label: 'D', text: '2x² + C', isCorrect: false },
      ],
    },
    {
      text: 'Numa progressão aritmética, a₁ = 3 e r = 4. Qual é o valor de a₅?',
      difficulty: 2, year: 2020, examPhase: '1ª fase',
      explanation: 'aₙ = a₁ + (n-1)r → a₅ = 3 + 4×4 = 19',
      hint: 'Usa a fórmula do termo geral: aₙ = a₁ + (n-1)r',
      options: [
        { label: 'A', text: '19', isCorrect: true },
        { label: 'B', text: '20', isCorrect: false },
        { label: 'C', text: '15', isCorrect: false },
        { label: 'D', text: '23', isCorrect: false },
      ],
    },
    {
      text: 'Qual é a equação da recta tangente ao gráfico de f(x) = x² no ponto (1, 1)?',
      difficulty: 3, year: 2023, examPhase: '1ª fase',
      explanation: 'f\'(x) = 2x, f\'(1) = 2. Equação: y - 1 = 2(x - 1) → y = 2x - 1',
      hint: 'Calcula f\'(1) para obter o declive da tangente.',
      options: [
        { label: 'A', text: 'y = 2x - 1', isCorrect: true },
        { label: 'B', text: 'y = 2x + 1', isCorrect: false },
        { label: 'C', text: 'y = x + 1', isCorrect: false },
        { label: 'D', text: 'y = x', isCorrect: false },
      ],
    },
    {
      text: 'A probabilidade de obter pelo menos uma cara em 3 lançamentos de uma moeda é:',
      difficulty: 3, year: 2022, examPhase: '1ª fase',
      explanation: 'P(pelo menos 1 cara) = 1 - P(nenhuma cara) = 1 - (1/2)³ = 1 - 1/8 = 7/8',
      hint: 'Usa o complementar: P(A) = 1 - P(Ā)',
      options: [
        { label: 'A', text: '7/8', isCorrect: true },
        { label: 'B', text: '3/4', isCorrect: false },
        { label: 'C', text: '1/2', isCorrect: false },
        { label: 'D', text: '1/8', isCorrect: false },
      ],
    },
  ];

  // 3. Questions - Português
  const portQuestions = [
    {
      text: 'Em "Os Lusíadas", quem é o narrador da história de Inês de Castro?',
      difficulty: 2, year: 2023, examPhase: '1ª fase',
      explanation: 'Vasco da Gama narra a história ao rei de Melinde, incluindo o episódio de Inês de Castro.',
      hint: 'Quem conta a história da viagem ao rei de Melinde?',
      options: [
        { label: 'A', text: 'Vasco da Gama', isCorrect: true },
        { label: 'B', text: 'Camões', isCorrect: false },
        { label: 'C', text: 'O rei de Melinde', isCorrect: false },
        { label: 'D', text: 'Inês de Castro', isCorrect: false },
      ],
    },
    {
      text: 'Identifica a figura de estilo em: "Os teus olhos são estrelas".',
      difficulty: 1, year: 2022, examPhase: '1ª fase',
      explanation: 'É uma metáfora porque estabelece uma comparação implícita (sem "como").',
      hint: 'É uma comparação implícita ou explícita?',
      options: [
        { label: 'A', text: 'Metáfora', isCorrect: true },
        { label: 'B', text: 'Comparação', isCorrect: false },
        { label: 'C', text: 'Hipérbole', isCorrect: false },
        { label: 'D', text: 'Personificação', isCorrect: false },
      ],
    },
    {
      text: 'Qual das seguintes frases contém uma oração subordinada concessiva?',
      difficulty: 3, year: 2023, examPhase: '1ª fase',
      explanation: '"Embora" introduz uma oração subordinada concessiva.',
      hint: 'Procura a conjunção que indica concessão.',
      options: [
        { label: 'A', text: 'Embora estivesse cansado, continuou a estudar.', isCorrect: true },
        { label: 'B', text: 'Estudou porque queria passar.', isCorrect: false },
        { label: 'C', text: 'Se estudar, passará no exame.', isCorrect: false },
        { label: 'D', text: 'Quando chegou, já era tarde.', isCorrect: false },
      ],
    },
    {
      text: 'Em "Memorial do Convento", Blimunda tem o poder de:',
      difficulty: 2, year: 2021, examPhase: '1ª fase',
      explanation: 'Blimunda, personagem de Saramago, tem o poder de ver o interior das pessoas em jejum.',
      hint: 'Que poder especial tem Blimunda quando está em jejum?',
      options: [
        { label: 'A', text: 'Ver o interior das pessoas', isCorrect: true },
        { label: 'B', text: 'Prever o futuro', isCorrect: false },
        { label: 'C', text: 'Curar doenças', isCorrect: false },
        { label: 'D', text: 'Voar', isCorrect: false },
      ],
    },
    {
      text: 'Qual é a classe morfológica da palavra "rapidamente"?',
      difficulty: 1, year: 2020, examPhase: '1ª fase',
      explanation: 'Palavras terminadas em "-mente" formadas a partir de adjectivos são advérbios de modo.',
      hint: 'Que tipo de palavra modifica um verbo e termina em "-mente"?',
      options: [
        { label: 'A', text: 'Advérbio', isCorrect: true },
        { label: 'B', text: 'Adjectivo', isCorrect: false },
        { label: 'C', text: 'Nome', isCorrect: false },
        { label: 'D', text: 'Verbo', isCorrect: false },
      ],
    },
    {
      text: 'Fernando Pessoa ortónimo associa-se frequentemente ao tema da:',
      difficulty: 3, year: 2023, examPhase: '2ª fase',
      explanation: 'Pessoa ortónimo explora a nostalgia, a saudade, a dor de pensar e o fingimento poético.',
      hint: 'Qual é o sentimento dominante na poesia de Pessoa ele-mesmo?',
      options: [
        { label: 'A', text: 'Nostalgia e dor de pensar', isCorrect: true },
        { label: 'B', text: 'Alegria e celebração da vida', isCorrect: false },
        { label: 'C', text: 'Objectividade e sensações', isCorrect: false },
        { label: 'D', text: 'Natureza e paganismo', isCorrect: false },
      ],
    },
    {
      text: 'Na frase "O João deu o livro à Maria", "à Maria" tem a função sintática de:',
      difficulty: 2, year: 2022, examPhase: '1ª fase',
      explanation: 'Complemento indirecto responde à pergunta "a quem?" — a quem deu? À Maria.',
      hint: 'A quem é que o João deu o livro?',
      options: [
        { label: 'A', text: 'Complemento indirecto', isCorrect: true },
        { label: 'B', text: 'Complemento directo', isCorrect: false },
        { label: 'C', text: 'Sujeito', isCorrect: false },
        { label: 'D', text: 'Complemento oblíquo', isCorrect: false },
      ],
    },
    {
      text: 'O heterónimo Alberto Caeiro é conhecido como o poeta:',
      difficulty: 2, year: 2021, examPhase: '1ª fase',
      explanation: 'Caeiro é o "poeta da Natureza" — escreve sobre sensações directas sem pensar.',
      hint: 'É o mestre dos outros heterónimos e celebra a natureza.',
      options: [
        { label: 'A', text: 'Da Natureza / das sensações', isCorrect: true },
        { label: 'B', text: 'Da engenharia e modernidade', isCorrect: false },
        { label: 'C', text: 'Do classicismo e formas fixas', isCorrect: false },
        { label: 'D', text: 'Da angústia existencial', isCorrect: false },
      ],
    },
    {
      text: 'Em "Felizmente Há Luar!", de Sttau Monteiro, a personagem Matilde é:',
      difficulty: 3, year: 2022, examPhase: '2ª fase',
      explanation: 'Matilde de Melo é a mulher do General Gomes Freire, símbolo de coragem e dignidade.',
      hint: 'Qual é a relação de Matilde com Gomes Freire?',
      options: [
        { label: 'A', text: 'A mulher de Gomes Freire', isCorrect: true },
        { label: 'B', text: 'A filha do Principal Sousa', isCorrect: false },
        { label: 'C', text: 'A criada de Beresford', isCorrect: false },
        { label: 'D', text: 'A irmã de D. Miguel', isCorrect: false },
      ],
    },
    {
      text: 'Qual é o valor do "que" na frase: "O livro que li era interessante"?',
      difficulty: 2, year: 2023, examPhase: '1ª fase',
      explanation: 'Nesta frase, "que" é pronome relativo — substitui "o livro" na oração subordinada.',
      hint: 'O "que" refere-se a um antecedente na frase principal.',
      options: [
        { label: 'A', text: 'Pronome relativo', isCorrect: true },
        { label: 'B', text: 'Conjunção subordinativa', isCorrect: false },
        { label: 'C', text: 'Determinante', isCorrect: false },
        { label: 'D', text: 'Pronome interrogativo', isCorrect: false },
      ],
    },
  ];

  // 4. Questions - Biologia e Geologia
  const bioQuestions = [
    {
      text: 'A mitose resulta em:',
      difficulty: 1, year: 2023, examPhase: '1ª fase',
      explanation: 'A mitose produz 2 células diploides geneticamente iguais à célula-mãe.',
      hint: 'Quantas células são produzidas e qual a sua ploidia?',
      options: [
        { label: 'A', text: '2 células diploides geneticamente iguais', isCorrect: true },
        { label: 'B', text: '4 células haploides', isCorrect: false },
        { label: 'C', text: '2 células haploides', isCorrect: false },
        { label: 'D', text: '4 células diploides', isCorrect: false },
      ],
    },
    {
      text: 'O ADN é constituído por nucleótidos. Cada nucleótido é formado por:',
      difficulty: 2, year: 2022, examPhase: '1ª fase',
      explanation: 'Cada nucleótido tem: grupo fosfato + desoxirribose (açúcar) + base azotada.',
      hint: 'São três componentes fundamentais.',
      options: [
        { label: 'A', text: 'Grupo fosfato, desoxirribose e base azotada', isCorrect: true },
        { label: 'B', text: 'Aminoácido, ribose e base azotada', isCorrect: false },
        { label: 'C', text: 'Grupo fosfato, glucose e base azotada', isCorrect: false },
        { label: 'D', text: 'Lípido, açúcar e proteína', isCorrect: false },
      ],
    },
    {
      text: 'As rochas sedimentares formam-se por:',
      difficulty: 1, year: 2021, examPhase: '1ª fase',
      explanation: 'As rochas sedimentares formam-se pela deposição e compactação de sedimentos.',
      hint: 'Pensa no processo de acumulação de materiais.',
      options: [
        { label: 'A', text: 'Deposição e compactação de sedimentos', isCorrect: true },
        { label: 'B', text: 'Solidificação de magma', isCorrect: false },
        { label: 'C', text: 'Metamorfismo de pressão e temperatura', isCorrect: false },
        { label: 'D', text: 'Erosão directa', isCorrect: false },
      ],
    },
    {
      text: 'A fotossíntese ocorre em que organelo celular?',
      difficulty: 1, year: 2023, examPhase: '1ª fase',
      explanation: 'A fotossíntese ocorre nos cloroplastos, onde a clorofila capta a luz solar.',
      hint: 'Que organelo contém clorofila?',
      options: [
        { label: 'A', text: 'Cloroplasto', isCorrect: true },
        { label: 'B', text: 'Mitocôndria', isCorrect: false },
        { label: 'C', text: 'Ribossoma', isCorrect: false },
        { label: 'D', text: 'Núcleo', isCorrect: false },
      ],
    },
    {
      text: 'O ciclo de Krebs ocorre:',
      difficulty: 3, year: 2022, examPhase: '2ª fase',
      explanation: 'O ciclo de Krebs ocorre na matriz mitocondrial, após a glicólise.',
      hint: 'Em que parte da mitocôndria?',
      options: [
        { label: 'A', text: 'Na matriz mitocondrial', isCorrect: true },
        { label: 'B', text: 'No citoplasma', isCorrect: false },
        { label: 'C', text: 'Na membrana interna da mitocôndria', isCorrect: false },
        { label: 'D', text: 'No núcleo', isCorrect: false },
      ],
    },
    {
      text: 'O Princípio da Sobreposição de Stratos estabelece que:',
      difficulty: 2, year: 2021, examPhase: '1ª fase',
      explanation: 'Numa sequência não deformada, os estratos mais antigos estão na base e os mais recentes no topo.',
      hint: 'Relaciona a posição dos estratos com a sua idade.',
      options: [
        { label: 'A', text: 'Estratos inferiores são mais antigos que os superiores', isCorrect: true },
        { label: 'B', text: 'Todos os estratos têm a mesma idade', isCorrect: false },
        { label: 'C', text: 'Estratos superiores são mais antigos', isCorrect: false },
        { label: 'D', text: 'A idade depende da composição química', isCorrect: false },
      ],
    },
    {
      text: 'A meiose é essencial para:',
      difficulty: 2, year: 2023, examPhase: '1ª fase',
      explanation: 'A meiose reduz o número de cromossomas para metade, sendo essencial para a reprodução sexuada.',
      hint: 'Que tipo de reprodução requer células haploides?',
      options: [
        { label: 'A', text: 'A reprodução sexuada', isCorrect: true },
        { label: 'B', text: 'A regeneração de tecidos', isCorrect: false },
        { label: 'C', text: 'O crescimento celular', isCorrect: false },
        { label: 'D', text: 'A reprodução assexuada', isCorrect: false },
      ],
    },
    {
      text: 'As enzimas são:',
      difficulty: 1, year: 2020, examPhase: '1ª fase',
      explanation: 'As enzimas são catalisadores biológicos de natureza proteica que aceleram reacções.',
      hint: 'Que tipo de moléculas biológicas actuam como catalisadores?',
      options: [
        { label: 'A', text: 'Proteínas com função catalítica', isCorrect: true },
        { label: 'B', text: 'Lípidos estruturais', isCorrect: false },
        { label: 'C', text: 'Ácidos nucleicos', isCorrect: false },
        { label: 'D', text: 'Glícidos de reserva', isCorrect: false },
      ],
    },
    {
      text: 'Uma falha geológica é:',
      difficulty: 2, year: 2022, examPhase: '1ª fase',
      explanation: 'Uma falha é uma fractura em que houve deslocamento relativo dos blocos rochosos.',
      hint: 'Envolve fractura E deslocamento.',
      options: [
        { label: 'A', text: 'Uma fractura com deslocamento de blocos', isCorrect: true },
        { label: 'B', text: 'Uma dobra nas rochas', isCorrect: false },
        { label: 'C', text: 'Uma intrusão magmática', isCorrect: false },
        { label: 'D', text: 'Uma fractura sem deslocamento', isCorrect: false },
      ],
    },
    {
      text: 'O transporte activo distingue-se do passivo porque:',
      difficulty: 3, year: 2023, examPhase: '1ª fase',
      explanation: 'O transporte activo requer gasto de energia (ATP) para mover substâncias contra o gradiente.',
      hint: 'Qual é o papel da energia neste tipo de transporte?',
      options: [
        { label: 'A', text: 'Requer gasto de energia (ATP)', isCorrect: true },
        { label: 'B', text: 'Ocorre a favor do gradiente', isCorrect: false },
        { label: 'C', text: 'Não envolve proteínas', isCorrect: false },
        { label: 'D', text: 'É mais rápido', isCorrect: false },
      ],
    },
  ];

  // Insert all questions
  const allQuestions = [
    { subjectId: matA.id, questions: matQuestions },
    { subjectId: port.id, questions: portQuestions },
    { subjectId: bioGeo.id, questions: bioQuestions },
  ];

  for (const { subjectId, questions } of allQuestions) {
    for (const q of questions) {
      await prisma.question.create({
        data: {
          subjectId,
          text: q.text,
          difficulty: q.difficulty,
          difficultyComputed: q.difficulty,
          year: q.year,
          examPhase: q.examPhase,
          explanation: q.explanation,
          hint: q.hint,
          tags: [],
          options: {
            create: q.options.map((opt, i) => ({
              label: opt.label,
              text: opt.text,
              isCorrect: opt.isCorrect,
              position: i + 1,
            })),
          },
        },
      });
    }
  }

  console.log('✅ 30 questions seeded (10 per subject)');

  // 5. Test users
  const passwordHash = await bcrypt.hash('teste123', 12);

  await prisma.user.upsert({
    where: { email: 'aluno@exampt.pt' },
    update: {},
    create: {
      email: 'aluno@exampt.pt',
      nick: 'AlunoTeste',
      passwordHash,
      xp: 150,
      level: 2,
      streak: 3,
    },
  });

  await prisma.user.upsert({
    where: { email: 'premium@exampt.pt' },
    update: {},
    create: {
      email: 'premium@exampt.pt',
      nick: 'PremiumUser',
      passwordHash,
      plan: 'PREMIUM',
      xp: 850,
      level: 9,
      streak: 15,
    },
  });

  console.log('✅ Test users created (aluno@exampt.pt / premium@exampt.pt — password: teste123)');
  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
