import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument = require('pdfkit');

@Injectable()
export class ExamPdfService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a PDF exam buffer for the given subject with random questions.
   */
  async generateExamPdf(subjectId: string, count: number): Promise<Buffer> {
    // Validate subject exists
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Disciplina não encontrada.');
    }

    // Fetch questions with options
    const allQuestions = await this.prisma.question.findMany({
      where: {
        subjectId,
        isActive: true,
        type: 'MCQ',
      },
      include: {
        options: {
          orderBy: { position: 'asc' },
        },
      },
    });

    // Shuffle and pick
    const shuffled = this.shuffleArray([...allQuestions]);
    const selectedQuestions = shuffled.slice(0, count);

    if (selectedQuestions.length === 0) {
      throw new NotFoundException(
        'Não foram encontradas questões suficientes para esta disciplina.',
      );
    }

    return this.buildPdf(subject, selectedQuestions);
  }

  /**
   * Build the PDF using PDFKit.
   * Uses PDFKit's automatic text flow for page breaks — no manual overflow checks.
   */
  private buildPdf(
    subject: { name: string },
    questions: any[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 60, bottom: 60, left: 50, right: 50 },
          info: {
            Title: `ExamPT - Exame de ${subject.name}`,
            Author: 'ExamPT',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        const pageWidth =
          doc.page.width - doc.page.margins.left - doc.page.margins.right;

        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-PT', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });

        // ─── HEADER ─────────────────────────────────────────
        this.drawPageHeader(doc, pageWidth);

        doc.moveDown(1);

        // Title
        doc
          .fontSize(22)
          .fillColor('#1a1a2e')
          .font('Helvetica-Bold')
          .text(`Exame de ${subject.name}`);

        // Metadata
        doc
          .fontSize(10)
          .fillColor('#666666')
          .font('Helvetica')
          .text(`${dateStr}  •  ${questions.length} questões`);

        doc.moveDown(0.3);

        // Instructions
        doc
          .fontSize(9)
          .fillColor('#888888')
          .font('Helvetica-Oblique')
          .text(
            'Responde a todas as questões, selecionando a opção correta. As soluções encontram-se na última página.',
          );

        doc.moveDown(0.5);

        // Separator
        doc
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.margins.left + pageWidth, doc.y)
          .strokeColor('#cccccc')
          .lineWidth(0.5)
          .stroke();

        doc.moveDown(1);

        // ─── QUESTIONS ──────────────────────────────────────
        // PDFKit auto-handles page breaks for doc.text() calls
        questions.forEach((q, index) => {
          // Question number + text
          doc
            .fontSize(11)
            .fillColor('#1a1a2e')
            .font('Helvetica-Bold')
            .text(`${index + 1}. ${q.text}`, {
              width: pageWidth,
              lineGap: 3,
            });

          doc.moveDown(0.4);

          // Options
          q.options.forEach((opt: any) => {
            doc
              .fontSize(10)
              .fillColor('#333333')
              .font('Helvetica')
              .text(`     ${opt.label})  ${opt.text}`, {
                width: pageWidth - 20,
                lineGap: 2,
              });

            doc.moveDown(0.1);
          });

          doc.moveDown(0.8);
        });

        // ─── SOLUTIONS PAGE ─────────────────────────────────
        doc.addPage();
        this.drawPageHeader(doc, pageWidth);
        doc.moveDown(1);

        doc
          .fontSize(22)
          .fillColor('#1a1a2e')
          .font('Helvetica-Bold')
          .text('Soluções');

        doc
          .fontSize(10)
          .fillColor('#666666')
          .font('Helvetica')
          .text(`Exame de ${subject.name} — ${questions.length} questões`);

        doc.moveDown(0.3);

        doc
          .fontSize(9)
          .fillColor('#888888')
          .font('Helvetica-Oblique')
          .text(
            'Confere as tuas respostas com a tabela de soluções abaixo.',
          );

        doc.moveDown(1);

        // Solutions list — simple text-based format (avoids manual rect/positioning issues)
        questions.forEach((q, index) => {
          const correctOption = q.options.find((opt: any) => opt.isCorrect);
          const answer = correctOption
            ? `${correctOption.label}) ${correctOption.text}`
            : '—';

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#7c3aed')
            .text(`${index + 1}.`, {
              continued: true,
              width: pageWidth,
            });

          doc
            .font('Helvetica')
            .fillColor('#333333')
            .text(`  ${answer}`);

          doc.moveDown(0.2);
        });

        // ─── FOOTER ─────────────────────────────────────────
        doc
          .moveDown(2)
          .fontSize(8)
          .fillColor('#999999')
          .font('Helvetica')
          .text('Gerado por ExamPT — exampt.pt', { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Draw the ExamPT brand header with a decorative purple line.
   */
  private drawPageHeader(doc: InstanceType<typeof PDFDocument>, pageWidth: number) {
    doc
      .fontSize(10)
      .fillColor('#7c3aed')
      .font('Helvetica-Bold')
      .text('ExamPT');

    doc
      .moveTo(doc.page.margins.left, doc.y + 4)
      .lineTo(doc.page.margins.left + pageWidth, doc.y + 4)
      .strokeColor('#7c3aed')
      .lineWidth(2)
      .stroke();
  }

  /**
   * Fisher-Yates shuffle.
   */
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
