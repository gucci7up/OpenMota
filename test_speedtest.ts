import { availableTools, loadCustomTools } from './src/agent/tools.js';

async function test() {
    console.log('🔄 Loading custom tools...');
    await loadCustomTools();
    
    console.log('🛠️ Available tools:', availableTools.map(t => t.definition.function.name));

    const speedtest = availableTools.find(t => t.definition.function.name === 'run_speedtest');
    
    if (speedtest) {
        console.log('🚀 Testing run_speedtest...');
        try {
            const result = await speedtest.execute({});
            console.log('✅ Result:', result);
        } catch (e) {
            console.error('❌ Execution error:', e);
        }
    } else {
        console.error('❌ run_speedtest tool NOT FOUND');
    }
}

test();
