import { availableTools, loadCustomTools } from './src/agent/tools.js';

async function test() {
    await loadCustomTools();
    console.log('Available tools:', availableTools.map(t => t.definition.function.name));

    const playwright = availableTools.find(t => t.definition.function.name === 'playwright_browser');
    if (playwright) {
        console.log('Testing playwright_browser...');
        try {
            const result = await playwright.execute({ action: 'navigate', url: 'https://www.google.com' });
            console.log('Result:', result);
        } catch (e) {
            console.error('Execution error:', e);
        }
    } else {
        console.error('playwright_browser NOT FOUND');
    }
}

test();
