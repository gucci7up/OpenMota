import { z } from 'zod';
import os from 'os';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

console.log('🧪 Config module loading...');
// Load environment variables from .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const envSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
    TELEGRAM_ALLOWED_USER_IDS: z.string().min(1, 'TELEGRAM_ALLOWED_USER_IDS is required'),
    GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().default('openrouter/free'),
    FIREBASE_SERVICE_ACCOUNT: z.string().min(1, 'FIREBASE_SERVICE_ACCOUNT is required (JSON string)'),
    ELEVENLABS_API_KEY: z.string().optional().transform(e => e === "" ? undefined : e),
    PORT: z.string().default('3001').transform(Number),
    OPENMOTA_API_KEY: z.string().min(10, 'OPENMOTA_API_KEY must be at least 10 characters'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('❌ Invalid environment variables:\n', _env.error.format());
    process.exit(1);
}

export const config = _env.data;

export const allowedUserIds = config.TELEGRAM_ALLOWED_USER_IDS.split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0)
    .map(id => parseInt(id, 10))
    // Filter out any NaN values if parsing fails
    .filter(id => !isNaN(id));

if (allowedUserIds.length === 0) {
    console.error('❌ No valid user IDs found in TELEGRAM_ALLOWED_USER_IDS.');
    process.exit(1);
}
