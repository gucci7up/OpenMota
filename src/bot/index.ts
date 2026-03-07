import { Bot, InputFile } from 'grammy';
import os from 'os';
import { config } from '../config.js';
import { whitelistMiddleware } from './middleware.js';
import { runAgentLoop } from '../agent/loop.js';
import { memoryStore } from '../db/index.js';
import { transcribeAudio, generateSpeech } from '../llm/client.js';
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
            let response = await runAgentLoop(text);

            // Handle Voice Synthesis if agent used <VOICE> tags
            if (response.includes('<VOICE>') && response.includes('</VOICE>')) {
                const voiceTextMatch = response.match(/<VOICE>([\s\S]*?)<\/VOICE>/);
                if (voiceTextMatch && voiceTextMatch[1]) {
                    const voiceText = voiceTextMatch[1].trim();
                    console.log(`🗣️ Generating voice response: "${voiceText.substring(0, 50)}..."`);

                    try {
                        const audioBuffer = await generateSpeech(voiceText);
                        const tempFilePath = path.join(TMP_DIR, `response_${Date.now()}.mp3`);
                        fs.writeFileSync(tempFilePath, audioBuffer);

                        await ctx.replyWithVoice(new InputFile(tempFilePath), { reply_to_message_id: messageId });
                        fs.unlinkSync(tempFilePath);

                        // Clean up response text, replace tags with indicator
                        response = response.replace(/<VOICE>[\s\S]*?<\/VOICE>/g, '🎤 *(Enviado como nota de voz)*').trim();
                    } catch (ttsError) {
                        console.error('TTS Error:', ttsError);
                        response += `\n\n*(Error generando voz: ${ttsError})*`;
                    }
                }
            }

            // Reply to the specific message if there's any remaining text
            if (response.length > 0) {
                await ctx.reply(response, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
            }
        } catch (error: any) {
            console.error('❌ Error in message handler:', error);

            // Fallback error message to the user
            await ctx.reply(`Sorry, I encountered an internal error: ${error.message}`);
        }
    });

    // 4. Voice and Audio message handler
    bot.on(['message:voice', 'message:audio'], async (ctx) => {
        const audioFile = ctx.message.voice || ctx.message.audio;
        const messageId = ctx.message.message_id;

        if (!audioFile) return;

        console.log(`\n🎙️ Received audio message (${audioFile.duration}s)...`);
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
            const filePath = path.join(TMP_DIR, `${audioFile.file_id}.ogg`);
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
            let agentResponse = await runAgentLoop(transcribedText);

            // Handle Voice Synthesis if agent used <VOICE> tags in response to the audio
            if (agentResponse.includes('<VOICE>') && agentResponse.includes('</VOICE>')) {
                const voiceTextMatch = agentResponse.match(/<VOICE>([\s\S]*?)<\/VOICE>/);
                if (voiceTextMatch && voiceTextMatch[1]) {
                    const voiceText = voiceTextMatch[1].trim();
                    console.log(`🗣️ Generating voice response: "${voiceText.substring(0, 50)}..."`);

                    try {
                        const audioBuffer = await generateSpeech(voiceText);
                        const tempFilePath = path.join(TMP_DIR, `audio_reply_${Date.now()}.mp3`);
                        fs.writeFileSync(tempFilePath, audioBuffer);

                        await ctx.replyWithVoice(new InputFile(tempFilePath), { reply_to_message_id: messageId });
                        fs.unlinkSync(tempFilePath);

                        agentResponse = agentResponse.replace(/<VOICE>[\s\S]*?<\/VOICE>/g, '🎤 *(Enviado como nota de voz)*').trim();
                    } catch (ttsError) {
                        console.error('TTS Error:', ttsError);
                        agentResponse += `\n\n*(Error generando voz: ${ttsError})*`;
                    }
                }
            }

            // Reply to the specific voice message
            if (agentResponse.length > 0) {
                await ctx.reply(agentResponse, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
            }
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
