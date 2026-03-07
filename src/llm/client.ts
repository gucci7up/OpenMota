import Groq from 'groq-sdk';
import { config } from '../config.js';
import fs from 'fs';

export const groq = new Groq({ apiKey: config.GROQ_API_KEY });

// Alternatively, you could setup OpenRouter here if GROQ fails or for fallback
export const chatCompletion = async (messages: any[], tools: any[] = []) => {
    try {
        // Check if any message contains an image_url
        const hasImage = messages.some(m => m.image_url);

        // If there's an image, we MUST use OpenRouter with a vision-capable model
        if (hasImage) {
            console.log("📸 Vision detected, calling OpenRouter...");
            const openRouterMessages = messages.map(m => {
                const content: any[] = [{ type: 'text', text: m.content || '' }];
                if (m.image_url) {
                    content.push({
                        type: 'image_url',
                        image_url: { url: m.image_url }
                    });
                }
                return { role: m.role, content };
            });

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001', // Excellent vision model
                    messages: openRouterMessages,
                    tools: tools.length > 0 ? tools : undefined,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenRouter Vision Error: ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            return data.choices[0].message;
        }

        // Default to Groq for text-only (faster)
        const params: any = {
            messages: messages.map(m => ({ role: m.role, content: m.content, name: m.name, tool_call_id: m.tool_call_id, tool_calls: m.tool_calls })),
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 4096,
        };

        if (tools.length > 0) {
            params.tools = tools;
            params.tool_choice = 'auto';
        }

        const completion = await groq.chat.completions.create(params);
        return completion.choices[0].message;
    } catch (error) {
        console.error('Error calling LLM APIs:', error);
        throw error;
    }
};

export const getEmbeddings = async (text: string): Promise<number[]> => {
    const apiKey = config.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.warn('OPENROUTER_API_KEY not found, semantic memory will be disabled.');
        return [];
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/text-embedding-3-small',
                input: text.substring(0, 8000) // Truncate to avoid limits
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter Embedding Error: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
    } catch (error) {
        console.error('Error getting embeddings:', error);
        return [];
    }
};

export const transcribeAudio = async (filePath: string) => {
    try {
        const stream = fs.createReadStream(filePath);
        // We use any to bypass strict type checking for the file stream in node environments
        const transcription = await groq.audio.transcriptions.create({
            file: stream as any,
            model: 'whisper-large-v3', // Official Groq whisper model
        });
        return transcription.text;
    } catch (error) {
        console.error('Error transcribing audio:', error);
        throw error;
    }
};

export const generateSpeech = async (text: string): Promise<Buffer> => {
    const apiKey = config.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
        throw new Error("ELEVENLABS_API_KEY is not configured.");
    }

    // Using Adam (a great predefined voice)
    const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey as string,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2', // Good for ES and EN
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
            }
        })
    });

    if (!response.ok) {
        throw new Error(`ElevenLabs API Error: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
};
