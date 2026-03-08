import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import fs from 'fs';

export const groq = new Groq({ apiKey: config.GROQ_API_KEY });
const genAI = config.GEMINI_API_KEY ? new GoogleGenerativeAI(config.GEMINI_API_KEY) : null;

/**
 * Helper to call Gemini (Native)
 */
async function geminiChatCompletion(messages: any[], tools: any[] = []) {
    if (!genAI) throw new Error("GEMINI_API_KEY not configured");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Convert messages to Gemini format
    const contents = messages.map(m => {
        let parts: any[] = [{ text: m.content || '' }];

        if (m.image_url) {
            // Note: Native Gemini SDK needs base64 or file data for images if used directly, 
            // but here we might prefer OpenRouter for vision if we only have URLs.
            // For now, let's stick to text for the native fallback or assume OpenRouter takes vision.
        }

        return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    // Gemini doesn't follow the exact same tool schema as OpenAI/Groq in the simple SDK,
    // so for tool-enabled complex tasks, OpenRouter or Groq are better.
    // However, we can implement basic chat fallback here.

    const result = await model.generateContent({
        contents: contents as any,
    });

    const response = await result.response;
    return {
        role: 'assistant',
        content: response.text()
    };
}

/**
 * Helper to call OpenRouter for both text and vision
 */
async function openRouterChatCompletion(messages: any[], tools: any[] = [], model: string = 'google/gemini-2.0-flash-001') {
    const openRouterMessages = messages.map(m => {
        if (m.role === 'tool') {
            return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id };
        }

        if (m.role === 'assistant' && m.tool_calls) {
            return { role: 'assistant', content: m.content || '', tool_calls: m.tool_calls };
        }

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
            'HTTP-Referer': 'https://openmota.com',
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
 * Main chat completion function with 3-tier fallback
 */
export const chatCompletion = async (messages: any[], tools: any[] = []) => {
    const hasImage = messages.some(m => m.image_url);

    // 1. Vision ALWAYS uses OpenRouter (Gemini Flash)
    if (hasImage) {
        console.log("📸 Vision detected, calling OpenRouter (Gemini)...");
        return openRouterChatCompletion(messages, tools, 'google/gemini-2.0-flash-001');
    }

    // 2. Try Groq (Primary Text)
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
        console.warn(`⚠️ Groq failed (Status: ${error.status || 'unknown'}). Trying Gemini Native Fallback...`);

        // 3. Try Gemini Native Fallback (Secondary)
        if (config.GEMINI_API_KEY && tools.length === 0) {
            try {
                console.log("♊ Calling Gemini Native...");
                return await geminiChatCompletion(messages);
            } catch (geminiError) {
                console.warn("⚠️ Gemini Native failed, trying OpenRouter as last resort...");
            }
        }

        // 4. Try OpenRouter (Final Resort)
        try {
            console.log("🌐 Calling OpenRouter (Final Fallback)...");
            return await openRouterChatCompletion(messages, tools, 'meta-llama/llama-3.3-70b-instruct');
        } catch (orError: any) {
            console.error('❌ All AI providers failed:', orError);
            throw orError;
        }
    }
};

export const getEmbeddings = async (text: string): Promise<number[]> => {
    const apiKey = config.OPENROUTER_API_KEY;
    if (!apiKey) return [];

    try {
        const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/text-embedding-3-small',
                input: text.substring(0, 8000)
            })
        });

        if (!response.ok) throw new Error(`OpenRouter Embedding Error: ${response.status}`);
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
    if (!apiKey || apiKey.trim() === '') throw new Error("ELEVENLABS_API_KEY limited");

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
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
    });

    if (!response.ok) throw new Error(`ElevenLabs API Error: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
};
