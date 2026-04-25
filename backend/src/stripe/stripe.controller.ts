import { Controller, Post, Body, Headers, Req, UseGuards, Request } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Request() req: any,
    @Body('plan') plan: 'monthly' | 'annual',
  ) {
    return this.stripeService.createCheckoutSession(req.user.id, plan);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      return { received: false };
    }
    
    // NestJS needs to be configured to expose the raw body for Stripe webhooks
    // This is done in main.ts via { rawBody: true } option in NestFactory.create
    return this.stripeService.handleWebhook(signature, req.rawBody as Buffer);
  }
}
