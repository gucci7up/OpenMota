import Groq from 'groq-sdk';
import { config } from '../config.js';

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
