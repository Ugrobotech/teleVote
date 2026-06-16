import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WalletService } from './wallet.service';
import { User, UserDocument } from '../user/schemas/user.schema';
import { ConfigService } from '@nestjs/config';

@Controller('api/wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  @Get('balances')
  async getBalances(@Query('telegramId') telegramId: string) {
    if (!telegramId) {
      throw new NotFoundException('telegramId is required');
    }

    const user = await this.userModel.findOne({ telegramId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const svmAddress = user.svmWalletAddress;
    const evmAddress = user.evmWalletAddress;

    // Load configurations from .env
    const solanaRpc = this.configService.get<string>('SOLANA_RPC', 'https://api.mainnet-beta.solana.com');
    const ethereumRpc = this.configService.get<string>('ETHEREUM_RPC', 'https://cloudflare-eth.com');
    const bscRpc = this.configService.get<string>('BSC_RPC', 'https://bsc-dataseed.binance.org/');
    const baseRpc = this.configService.get<string>('BASE-RPC') || this.configService.get<string>('BASE_RPC', 'https://mainnet.base.org');
    const polygonRpc = this.configService.get<string>('POLYGON_RPC', 'https://polygon-rpc.com');
    const arbitrumRpc = this.configService.get<string>('ARBITRUM_RPC', 'https://arb1.arbitrum.io/rpc');

    const usdcSolana = this.configService.get<string>('USDC_SOLANA');
    const usdcEthereum = this.configService.get<string>('USDC_ETHEREUM');
    const usdcBsc = this.configService.get<string>('USDC_BSC');
    const usdcBase = this.configService.get<string>('USDC_BASE');
    const usdcPolygon = this.configService.get<string>('USDC_POLYGON');
    const usdcArbitrum = this.configService.get<string>('USDC_ARBITRUM');

    // Fetch balances in parallel with individual try-catch blocks
    const [
      solNative, solUsdc,
      ethNative, ethUsdc,
      bscNative, bscUsdc,
      baseNative, baseUsdc,
      polyNative, polyUsdc,
      arbNative, arbUsdc
    ] = await Promise.all([
      // Solana
      svmAddress ? this.walletService.getSolBalance(svmAddress, solanaRpc).then(r => r.balance).catch(() => 0) : Promise.resolve(0),
      svmAddress && usdcSolana ? this.walletService.getSPLTokenBalance(svmAddress, usdcSolana, solanaRpc, 6).then(r => r.balance).catch(() => 0) : Promise.resolve(0),

      // Ethereum
      evmAddress ? this.walletService.getEVMNativeTokenBalance(evmAddress, ethereumRpc).then(r => r.balance).catch(() => 0) : Promise.resolve(0),
      evmAddress && usdcEthereum ? this.walletService.getERC20Balance(evmAddress, usdcEthereum, ethereumRpc).then(r => r.balance).catch(() => 0) : Promise.resolve(0),

      // BNB Chain
      evmAddress ? this.walletService.getEVMNativeTokenBalance(evmAddress, bscRpc).then(r => r.balance).catch(() => 0) : Promise.resolve(0),
      evmAddress && usdcBsc ? this.walletService.getERC20Balance(evmAddress, usdcBsc, bscRpc).then(r => r.balance).catch(() => 0) : Promise.resolve(0),

      // Base
      evmAddress ? this.walletService.getEVMNativeTokenBalance(evmAddress, baseRpc).then(r => r.balance).catch(() => 0) : Promise.resolve(0),
      evmAddress && usdcBase ? this.walletService.getERC20Balance(evmAddress, usdcBase, baseRpc).then(r => r.balance).catch(() => 0) : Promise.resolve(0),

      // Polygon
      evmAddress ? this.walletService.getEVMNativeTokenBalance(evmAddress, polygonRpc).then(r => r.balance).catch(() => 0) : Promise.resolve(0),
      evmAddress && usdcPolygon ? this.walletService.getERC20Balance(evmAddress, usdcPolygon, polygonRpc).then(r => r.balance).catch(() => 0) : Promise.resolve(0),

      // Arbitrum
      evmAddress ? this.walletService.getEVMNativeTokenBalance(evmAddress, arbitrumRpc).then(r => r.balance).catch(() => 0) : Promise.resolve(0),
      evmAddress && usdcArbitrum ? this.walletService.getERC20Balance(evmAddress, usdcArbitrum, arbitrumRpc).then(r => r.balance).catch(() => 0) : Promise.resolve(0),
    ]);

    return {
      addresses: {
        solana: svmAddress,
        evm: evmAddress,
      },
      explorers: {
        solana: this.configService.get<string>('SOLSCAN_URL', ''),
        ethereum: this.configService.get<string>('ETHERSCAN_URL', ''),
        bsc: this.configService.get<string>('BSC_SCAN_URL', ''),
        base: this.configService.get<string>('BASESCAN_URL', ''),
        polygon: this.configService.get<string>('POLY_SCAN_URL', ''),
        arbitrum: this.configService.get<string>('ARB_SCAN_URL', ''),
      },
      balances: {
        solana: { native: solNative, usdc: solUsdc },
        ethereum: { native: ethNative, usdc: ethUsdc },
        bsc: { native: bscNative, usdc: bscUsdc },
        base: { native: baseNative, usdc: baseUsdc },
        polygon: { native: polyNative, usdc: polyUsdc },
        arbitrum: { native: arbNative, usdc: arbUsdc },
      }
    };
  }
}
