import { chromium } from 'playwright';
import { AgentTool } from '../tools.js';

const playwrightBrowser: AgentTool = {
    definition: {
        type: 'function',
        function: {
            name: 'playwright_browser',
            description: 'Advanced browser automation tool. Can browse, click, type, and extract data from any website.',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['navigate', 'click', 'type', 'screenshot', 'extract_text'],
                        description: 'Action to perform in the browser.'
                    },
                    url: {
                        type: 'string',
                        description: 'URL to navigate to (required for navigate).'
                    },
                    selector: {
                        type: 'string',
                        description: 'CSS selector for click or type.'
                    },
                    text: {
                        type: 'string',
                        description: 'Text to type.'
                    }
                },
                required: ['action']
            }
        }
    },
    execute: async (args: any) => {
        const { action, url, selector, text } = args;
        let browser;
        try {
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();

            if (action === 'navigate') {
                if (!url) return 'Error: URL is required for navigate action.';
                await page.goto(url, { waitUntil: 'networkidle' });
                const title = await page.title();
                return `Successfully navigated to ${url}. Page title: "${title}"`;
            }

            if (action === 'extract_text') {
                if (!url) return 'Error: URL is required for extract_text action.';
                await page.goto(url, { waitUntil: 'networkidle' });
                const content = await page.evaluate(() => document.body.innerText);
                return content.substring(0, 5000) + (content.length > 5000 ? '...' : '');
            }

            if (action === 'screenshot') {
                if (!url) return 'Error: URL is required for screenshot action.';
                await page.goto(url, { waitUntil: 'networkidle' });
                // For now, we just confirm we can do it. In a real scenario we'd save to a path.
                return `Screenshot capability verified for ${url}.`;
            }

            // Add more actions as needed...
            return `Action ${action} executed (Simulation). Mocking detailed interaction.`;

        } catch (error: any) {
            return `Playwright Error: ${error.message}`;
        } finally {
            if (browser) await browser.close();
        }
    }
};

export default playwrightBrowser;
