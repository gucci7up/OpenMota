import { Bot } from 'grammy';
import { config } from '../config.js';
import { whitelistMiddleware } from './middleware.js';
import { runAgentLoop } from '../agent/loop.js';
import { memoryStore } from '../db/index.js';
import { transcribeAudio } from '../llm/client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '../../data/tmp');
if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

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

    // 4. Voice message handler
    bot.on('message:voice', async (ctx) => {
        const voice = ctx.message.voice;
        const messageId = ctx.message.message_id;

        console.log(`\n🎙️ Received voice message (${voice.duration}s)...`);
        ctx.replyWithChatAction('typing'); // Usually telegram clients show typing for transcription too

        try {
            // Get file path from telegram servers
            const file = await ctx.getFile();
            if (!file.file_path) throw new Error("Could not get file path.");

            // Download file
            const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            const response = await fetch(fileUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Save temporarily
            const filePath = path.join(TMP_DIR, `${voice.file_id}.ogg`);
            fs.writeFileSync(filePath, buffer);

            console.log('🎤 Transcribing audio via Groq Whisper...');
            // Transcribe
            const transcribedText = await transcribeAudio(filePath);

            // Clean up the temp file
            fs.unlinkSync(filePath);

            console.log(`🗣️ Transcription: "${transcribedText}"`);

            // Echo back what it heard (Optional, but good UX to confirm it understood)
            await ctx.reply(`🎤 _Escuché:_ "${transcribedText}"`, {
                reply_to_message_id: messageId,
                parse_mode: 'Markdown'
            });

            ctx.replyWithChatAction('typing');

            // 5. Send the transcription to the Agent Loop
            const agentResponse = await runAgentLoop(transcribedText);

            // Reply to the specific voice message
            await ctx.reply(agentResponse, { reply_to_message_id: messageId });
        } catch (error: any) {
            console.error('❌ Error handling voice message:', error);
            await ctx.reply(`Sorry, there was an error processing your audio: ${error.message}`);
        }
    });

    // Catch errors
    bot.catch((err) => {
        console.error('Bot Error:', err);
    });
}

// Ensure setup is done when imported
setupBot();
