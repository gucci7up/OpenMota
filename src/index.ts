import { config } from './config.js';
import './db/index.js'; // Ensure DB initializes
import { bot } from './bot/index.js';
import { startServer } from './server/index.js';

async function bootstrap() {
    console.log('🚀 Starting OpenMota...');

    // Start API Server
    startServer();

    // Verify configuration loaded correctly
    console.log('✅ Configuration loaded. Whitelisted Users:', config.TELEGRAM_ALLOWED_USER_IDS);

    // Start the bot using Long Polling
    bot.start({
        onStart: (botInfo) => {
            console.log(`🤖 Bot @${botInfo.username} started successfully!`);
            console.log('Waiting for messages...');
        }
    });
}

// Handle graceful shutdown
process.once('SIGINT', () => {
    console.log('Stopping OpenMota (SIGINT)...');
    bot.stop();
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log('Stopping OpenMota (SIGTERM)...');
    bot.stop();
    process.exit(0);
});

bootstrap().catch(err => {
    console.error('Fatal error during bootstrap:', err);
    process.exit(1);
});
