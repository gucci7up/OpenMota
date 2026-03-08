import Groq from 'groq-sdk';
import { config } from '../config.js';
import fs from 'fs';

export const groq = new Groq({ apiKey: config.GROQ_API_KEY });

/**
 * Helper to call OpenRouter for both text and vision
 */
async function openRouterChatCompletion(messages: any[], tools: any[] = [], model: string = 'google/gemini-2.0-flash-001') {
    const hasImage = messages.some(m => m.image_url);

    const openRouterMessages = messages.map(m => {
        // If it's a tool result or tool call, format as standard chat
        if (m.role === 'tool') {
            return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id };
        }

        if (m.role === 'assistant' && m.tool_calls) {
            return { role: 'assistant', content: m.content || '', tool_calls: m.tool_calls };
        }

        // For user/system, handle potential images
        if (m.image_url) {
            const content: any[] = [{ type: 'text', text: m.content || '' }];
            content.push({
                type: 'image_url',
                image_url: { url: m.image_url }
            });
            return { role: m.role, content };
        }

        return { role: m.role, content: m.content };
    });

    const body: any = {
        model: model,
        messages: openRouterMessages,
        temperature: 0.7,
        max_tokens: 4096,
    };

    if (tools.length > 0) {
        body.tools = tools;
        body.tool_choice = 'auto';
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://openmota.com', // Optional but recommended for OpenRouter
            'X-Title': 'OpenMota Agent'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter Error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message;
}

/**
 * Main chat completion function with automatic fallback
 */
export const chatCompletion = async (messages: any[], tools: any[] = []) => {
    const hasImage = messages.some(m => m.image_url);

    // 1. Vision ALWAYS uses OpenRouter
    if (hasImage) {
        console.log("📸 Vision detected, calling OpenRouter...");
        return openRouterChatCompletion(messages, tools, 'google/gemini-2.0-flash-001');
    }

    // 2. Try Groq (Llama 3.3 70B) for text-only
    try {
        console.log("⚡ Calling Groq (Primary)...");
        const params: any = {
            messages: messages.map(m => ({
                role: m.role,
                content: m.content,
                name: m.name,
                tool_call_id: m.tool_call_id,
                tool_calls: m.tool_calls
            })),
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

    } catch (error: any) {
        // 3. Fallback to OpenRouter if Groq fails (Rate limit or other)
        console.warn(`⚠️ Groq failed (Status: ${error.status || 'unknown'}). Falling back to OpenRouter...`);

        try {
            // Using a reliable model in OpenRouter as fallback
            return await openRouterChatCompletion(messages, tools, 'meta-llama/llama-3.3-70b-instruct');
        } catch (orError: any) {
            console.error('❌ Both Groq and OpenRouter failed:', orError);
            throw orError;
        }
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
        const transcription = await groq.audio.transcriptions.create({
            file: stream as any,
            model: 'whisper-large-v3',
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
            model_id: 'eleven_multilingual_v2',
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
