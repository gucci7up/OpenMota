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
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const TMP_DIR = path.join(DATA_DIR, 'tmp');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

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
            // ── Speedtest shortcut: bypass the LLM, run tool directly ──
            const speedtestKeywords = ['speedtest', 'speed test', 'speed-test', 'run_speedtest',
                'velocidad de internet', 'velocidad internet', 'test de velocidad',
                'prueba de velocidad', 'medir velocidad', 'velocidad de red',
                'que velocidad', 'qué velocidad', 'cuanta velocidad', 'cuánta velocidad'];
            const lowerText = text.toLowerCase();
            const isSpeedtestRequest = speedtestKeywords.some(kw => lowerText.includes(kw));

            if (isSpeedtestRequest) {
                console.log('🌐 Speedtest keyword detected — running HTTP speedtest inline...');
                ctx.replyWithChatAction('typing');
                try {
                    // Ping
                    const pingStart = Date.now();
                    await fetch('https://1.1.1.1', { method: 'HEAD' }).catch(() => {});
                    const pingMs = Date.now() - pingStart;

                    // Download 25MB from Cloudflare
                    const dlStart = Date.now();
                    const dlRes = await fetch('https://speed.cloudflare.com/__down?bytes=25000000');
                    if (!dlRes.ok) throw new Error(`Download falló: HTTP ${dlRes.status}`);
                    const dlBuffer = await dlRes.arrayBuffer();
                    const dlTime = (Date.now() - dlStart) / 1000;
                    const dlMbps = ((dlBuffer.byteLength * 8) / dlTime / 1_000_000).toFixed(2);

                    // Upload 5MB to Cloudflare
                    const uploadData = new Uint8Array(5_000_000);
                    const ulStart = Date.now();
                    await fetch('https://speed.cloudflare.com/__up', {
                        method: 'POST',
                        body: uploadData,
                        headers: { 'Content-Type': 'application/octet-stream' }
                    }).catch(() => {});
                    const ulTime = (Date.now() - ulStart) / 1000;
                    const ulMbps = ((uploadData.byteLength * 8) / ulTime / 1_000_000).toFixed(2);

                    const reply = `🌐 *Resultado del Speedtest:*\n\n` +
                        `📥 *Descarga:* ${dlMbps} Mbit/s\n` +
                        `📤 *Subida:* ${ulMbps} Mbit/s\n` +
                        `📡 *Ping:* ${pingMs} ms\n` +
                        `📍 *Servidor:* Cloudflare CDN`;
                    await ctx.reply(reply, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
                } catch (stErr: any) {
                    await ctx.reply(`❌ Error en speedtest: ${stErr.message}`, { reply_to_message_id: messageId });
                }
                return;
            }

            // ── End speedtest shortcut ──

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

            // Robust reply helper
            const safeReply = async (msg: string, replyToId?: number) => {
                if (!msg) return;
                try {
                    await ctx.reply(msg, { reply_to_message_id: replyToId, parse_mode: 'Markdown' });
                } catch (e: any) {
                    if (e.message?.includes('can\'t parse entities')) {
                        console.warn('⚠️ Telegram Markdown parsing failed, falling back to plain text.');
                        await ctx.reply(msg, { reply_to_message_id: replyToId });
                    } else {
                        throw e;
                    }
                }
            };

            // Reply to the specific message if there's any remaining text
            if (response.length > 0) {
                await safeReply(response, messageId);
            }
        } catch (error: any) {
            console.error('❌ Error in message handler:', error);

            // Fallback error message to the user - always without Markdown to be safe
            await ctx.reply(`Sorry, I encountered an internal error: ${error.message}`);
        }
    });

    // 3.5 Photo message handler
    bot.on('message:photo', async (ctx) => {
        const photo = ctx.message.photo;
        const caption = ctx.message.caption || "Analiza esta imagen.";
        const messageId = ctx.message.message_id;

        if (!photo || photo.length === 0) return;

        console.log(`\n📸 Received photo message...`);
        ctx.replyWithChatAction('typing');

        try {
            const file = await ctx.getFile();
            if (!file.file_path) throw new Error("Could not get photo file path.");

            const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            const response = await fetch(fileUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

            console.log('👁️ Sending image to OpenMota Vision...');
            const agentResponse = await runAgentLoop(caption, false, base64Image);

            if (agentResponse.length > 0) {
                await ctx.reply(agentResponse, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
            }
        } catch (error: any) {
            console.error('❌ Error handling photo message:', error);
            await ctx.reply(`Sorry, there was an error processing your image: ${error.message}`);
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
                try {
                    await ctx.reply(agentResponse, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
                } catch (e: any) {
                    if (e.message?.includes('can\'t parse entities')) {
                        await ctx.reply(agentResponse, { reply_to_message_id: messageId });
                    } else {
                        throw e;
                    }
                }
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
