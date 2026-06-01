import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { EscrowService } from './escrow.service';
import { PaymentsService } from './payments.service';
import { WalletService } from './wallet.service';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly escrow: EscrowService,
    private readonly wallet: WalletService,
  ) {}

  @ApiBearerAuth()
  @Roles(UserRole.BUYER)
  @Post('payments/orders/:orderId/checkout')
  @ApiOperation({ summary: 'Create Razorpay checkout for order escrow' })
  checkout(@CurrentUser() user: JwtPayload, @Param('orderId') orderId: string) {
    return this.payments.createCheckout(user.sub, orderId);
  }

  @ApiBearerAuth()
  @Roles(UserRole.BUYER)
  @Post('payments/orders/:orderId/verify')
  @ApiOperation({ summary: 'Verify payment and fund escrow' })
  verify(
    @CurrentUser() user: JwtPayload,
    @Param('orderId') orderId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.payments.verifyAndCapture(user.sub, orderId, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.BUYER)
  @Post('payments/orders/:orderId/mock-pay')
  @ApiOperation({ summary: 'Dev: instant mock payment (MOCK_PAYMENTS=true)' })
  mockPay(@CurrentUser() user: JwtPayload, @Param('orderId') orderId: string) {
    if (process.env.NODE_ENV === 'production' && process.env.MOCK_PAYMENTS !== 'true') {
      throw new Error('Mock payments disabled in production');
    }
    return this.payments.mockPay(user.sub, orderId);
  }

  @ApiBearerAuth()
  @Get('payments/orders/:orderId/escrow')
  @ApiOperation({ summary: 'Escrow status and ledger for an order' })
  escrowStatus(@CurrentUser() user: JwtPayload, @Param('orderId') orderId: string) {
    return this.escrow.getEscrowDetails(orderId, user.sub);
  }

  @ApiBearerAuth()
  @Get('wallet/me')
  @ApiOperation({ summary: 'Wallet balance and recent settlements' })
  getWallet(@CurrentUser() user: JwtPayload) {
    return this.wallet.getWalletSummary(user.sub);
  }
}
