import { Injectable, Logger } from '@nestjs/common';
import { Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UserService } from '../user/user.service';

@Update()
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(private readonly userService: UserService) {}

  @Start()
  async onStart(ctx: Context) {
    const webAppUrl = 'https://d446-105-112-102-140.ngrok-free.app';

    // Parse referral code if present (looks like: "/start ref_12345")
    let referredByCode = '';
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.split(' ');
    if (parts.length > 1) {
      referredByCode = parts[1];
      this.logger.log(`Parsed referral code on start: ${referredByCode}`);
    }

    // Save user details from Telegram
    const from = ctx.from;
    if (from) {
      try {
        const user = await this.userService.findOrCreateByTelegramId(
          from.id.toString(),
          from.username || '',
          from.first_name || '',
          from.last_name || '',
          referredByCode,
        );
        this.logger.log(
          `User registered/found: ${from.id} (@${from.username || 'no_username'}) - onboarded: ${user.onboardingComplete}`,
        );
      } catch (error) {
        this.logger.error(`Failed to save user ${from.id}:`, error);
      }
    }

    await ctx.reply(
      'Welcome to Tap for Your Candidate! 🇳🇬\n\nTap the button below to launch the Mini App and start supporting your favorite politician for the 2027 elections!',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Play Now 🚀', web_app: { url: webAppUrl } }],
          ],
        },
      },
    );
  }
}
