import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: any;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(apiKey || 'sk_test_placeholder', {
      apiVersion: '2023-10-16' as any, // Using latest or fixed API version
    });
  }

  async createCheckoutSession(userId: string, plan: 'monthly' | 'annual') {
    const priceId = this.configService.get<string>(
      plan === 'monthly' ? 'STRIPE_PRICE_MONTHLY' : 'STRIPE_PRICE_ANNUAL',
    );

    if (!priceId) {
      throw new BadRequestException('Configuração de preço em falta');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${frontendUrl}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/premium`,
        client_reference_id: userId,
        metadata: {
          userId,
        },
      });

      return { url: session.url };
    } catch (error) {
      this.logger.error('Erro a criar checkout session', error);
      throw new BadRequestException('Não foi possível iniciar o pagamento');
    }
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new BadRequestException('Nenhuma assinatura ativa encontrada');
    }

    try {
      const updatedStripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: true },
      );

      // Update local database status
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'canceled_at_period_end', // custom status to identify it's canceling
        },
      });

      this.logger.log(`Assinatura de ${userId} marcada para cancelamento no fim do período`);
      return { success: true, message: 'Assinatura cancelada com sucesso. Continuará ativa até ao final do período pago.' };
    } catch (error) {
      this.logger.error('Erro ao cancelar assinatura', error);
      throw new BadRequestException('Não foi possível cancelar a assinatura');
    }
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET não configurado');
      throw new BadRequestException('Webhook não configurado');
    }

    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Erro de assinatura Webhook: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.client_reference_id || session.metadata?.userId;
        
        if (userId) {
          await this.prisma.user.update({
            where: { id: userId },
            data: { plan: 'PREMIUM' },
          });

          if (session.subscription) {
            // Retrieve subscription to get the correct currentPeriodEnd
            const stripeSubscription = await this.stripe.subscriptions.retrieve(session.subscription as string);

            await this.prisma.subscription.upsert({
              where: { userId },
              update: {
                stripeSubscriptionId: session.subscription as string,
                stripeCustomerId: session.customer as string,
                status: stripeSubscription.status,
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
              },
              create: {
                userId,
                stripeSubscriptionId: session.subscription as string,
                stripeCustomerId: session.customer as string,
                status: stripeSubscription.status,
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
              },
            });
          }

          this.logger.log(`Utilizador ${userId} atualizado para PREMIUM`);
        } else {
          this.logger.warn('Sessão concluída mas sem userId associado', session.id);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
        
        this.logger.log(`Subscrição ${subscription.id} atualizada. Status: ${subscription.status}`);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        
        const subRecord = await this.prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });
        
        if (subRecord) {
          await this.prisma.user.update({
            where: { id: subRecord.userId },
            data: { plan: 'FREE' },
          });
          
          await this.prisma.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: { status: 'canceled' },
          });
          
          this.logger.log(`Subscrição cancelada: ${subscription.id}. Utilizador ${subRecord.userId} revertido para FREE.`);
        } else {
          this.logger.warn(`Subscrição cancelada não encontrada na BD: ${subscription.id}`);
        }
        break;
      }
        
      default:
        this.logger.debug(`Evento não tratado: ${event.type}`);
    }

    return { received: true };
  }
}
