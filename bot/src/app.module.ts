import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegrafModule } from 'nestjs-telegraf';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { UserModule } from './user/user.module';
import { BotModule } from './bot/bot.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/tele-vote',
        ),
      }),
      inject: [ConfigService],
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN', 'stub_token'),
      }),
      inject: [ConfigService],
    }),
    GameModule,
    UserModule,
    BotModule,
    WalletModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
