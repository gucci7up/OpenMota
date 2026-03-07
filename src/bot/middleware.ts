import { Context, NextFunction } from 'grammy';
import { allowedUserIds } from '../config.js';

/**
 * Middleware to ensure only whitelisted users can interact with the bot.
 * This is crucial for a personal AI agent to prevent unauthorized access.
 */
export async function whitelistMiddleware(ctx: Context, next: NextFunction) {
    // If there's no from object, we can't verify, so we drop it
    if (!ctx.from) {
        console.warn('⚠️ Dropped update with no from object.');
        return;
    }

    const userId = ctx.from.id;

    if (!allowedUserIds.includes(userId)) {
        console.warn(`⛔ Unauthorized access attempt from user ID: ${userId} (@${ctx.from.username})`);

        // Optional: Send a rejection message. But for ultimate security/stealth, 
        // it's often better to just silently drop the update so they don't even know it's a bot.
        // await ctx.reply('Sorry, this is a private bot.');

        return; // Stop processing
    }

    // User is allowed, continue to the next middleware/handler
    await next();
}
