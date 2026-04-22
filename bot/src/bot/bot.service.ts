import { Injectable } from '@nestjs/common';
import { Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Update()
@Injectable()
export class BotService {
  @Start()
  async onStart(ctx: Context) {
    const webAppUrl = 'https://230e-102-90-96-202.ngrok-free.app';

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
