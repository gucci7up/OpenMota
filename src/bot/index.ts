import { Bot } from 'grammy';
import { config } from '../config.js';
import { whitelistMiddleware } from './middleware.js';
import { runAgentLoop } from '../agent/loop.js';
import { memoryStore } from '../db/index.js';

// Initialize the bot
export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

async function setupBot() {
    // 1. Apply global middleware
    bot.use(whitelistMiddleware);

    // 2. Command handlers
    bot.command('start', (ctx) => {
        ctx.reply('Hello! I am OpenMota, your personal AI agent. How can I help you today?');
    });

    bot.command('clear', async (ctx) => {
        await memoryStore.clearMemory();
        ctx.reply('🧹 Memory cleared. I have forgotten our past conversations.');
    });

    // 3. Main message handler
    bot.on('message:text', async (ctx) => {
        const text = ctx.message.text;
        const messageId = ctx.message.message_id;

        console.log(`\n📥 Received message: "${text}"`);

        // Show typing status while thinking
        ctx.replyWithChatAction('typing');

        try {
            // Pass the text to the agent loop
            const response = await runAgentLoop(text);

            // Reply to the specific message
            await ctx.reply(response, { reply_to_message_id: messageId });
        } catch (error: any) {
            console.error('❌ Error in message handler:', error);

            // Fallback error message to the user
            await ctx.reply(`Sorry, I encountered an internal error: ${error.message}`);
        }
    });

    // Catch errors
    bot.catch((err) => {
        console.error('Bot Error:', err);
    });
}

// Ensure setup is done when imported
setupBot();
