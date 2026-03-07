import Groq from 'groq-sdk';
import { config } from '../config.js';
import fs from 'fs';

export const groq = new Groq({ apiKey: config.GROQ_API_KEY });

// Alternatively, you could setup OpenRouter here if GROQ fails or for fallback
export const chatCompletion = async (messages: any[], tools: any[] = []) => {
    try {
        const params: any = {
            messages,
            model: 'llama-3.3-70b-versatile', // Defaulting to the requested Groq model
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
