import { chatCompletion } from '../llm/client.js';
import { memoryStore, Message } from '../db/index.js';
import { getToolsSchema, executeTool, setAgentRunner, loadCustomTools } from './tools.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.join(__dirname, '../../data/skills');

const SYSTEM_PROMPT = `You are OpenMota, an autonomous AI agent.
You communicate via Telegram and a Web Dashboard.

### OPERATIONAL RULES
1. **Location & Time**: You are located in **Santo Domingo, Dominican Republic**. Always use the local time (America/Santo_Domingo) for your responses and tasks.
2. **Tool Usage**: Use tools for interaction with the local system or web. **BUT ALWAYS prioritze answering the user directly if they just say greetings or general questions.**
3. **Persistence**: Only use multi-step reasoning if the user gave you a specific, complex task.
4. **No Hallucinations**: Do NOT report that you have done something (like creating a folder) unless you have successfully called the corresponding tool in the CURRENT session.
5. **conciseness**: Be extremely concise. Avoid long explanations unless asked.

### PHILOSOPHY
Solve problems effectively but stay grounded. If you are unsure, ask the user.`;

/**
 * Loads additional agent instructions (skills) from data/skills directory
 */
async function loadSkills(): Promise<string> {
    if (!fs.existsSync(SKILLS_DIR)) return "";

    try {
        const files = fs.readdirSync(SKILLS_DIR);
        const skillFiles = files.filter(f => f.endsWith('.md'));

        let skillsContent = "";
        for (const file of skillFiles) {
            const content = fs.readFileSync(path.join(SKILLS_DIR, file), 'utf-8');
            // Extract content between --- if it exists (yaml frontmatter) or just take all
            const cleanContent = content.replace(/^---[\s\S]*?---\n?/, '').trim();
            if (cleanContent) {
                skillsContent += `\n\n### SKILL: ${file.replace('.md', '')}\n${cleanContent}`;
            }
        }
        return skillsContent;
    } catch (e) {
        console.error("Error loading skills:", e);
        return "";
    }
}

const MAX_ITERATIONS = 8;

/**
 * The core agent loop running the reasoning process
 * @param userMessage The new incoming user message text
 * @param isSubAgent If true, the loop runs in a temporary context without writing to permanent memory
 * @param imageUrl Optional URL of an image to analyze
 * @returns The final response text to send back to the user
 */
export async function runAgentLoop(userMessage: string, isSubAgent: boolean = false, imageUrl?: string): Promise<string> {
    // Local memory for sub-agents to avoid polluting main conversation
    const localHistory: Message[] = isSubAgent ? [{ role: 'user', content: userMessage, image_url: imageUrl }] : [];

    // 1. Add User Message to Memory (only if not sub-agent)
    if (!isSubAgent) {
        await memoryStore.addMessage({
            role: 'user',
            content: userMessage,
            image_url: imageUrl
        });
    }

    let iterations = 0;

    // The loop
    while (iterations < MAX_ITERATIONS) {
        iterations++;
        const logPrefix = isSubAgent ? `[Sub-Agent]` : `🤖`;
        console.log(`${logPrefix} thinking... (Iteration ${iterations}/${MAX_ITERATIONS})`);

        // Fetch memory
        let history: Message[] = [];
        if (isSubAgent) {
            history = localHistory;
        } else {
            // Only fetch past 30 messages to keep context window reasonable
            history = await memoryStore.getRecentMessages(30);
        }

        // Load dynamic skills
        const skillsContent = await loadSkills();
        const fullSystemPrompt = SYSTEM_PROMPT + skillsContent;

        // Prepend System Prompt
        const messages = [
            { role: 'system', content: fullSystemPrompt },
            ...history
        ];

        // 2. Call LLM
        // Refresh custom tools from disk
        await loadCustomTools();
        const responseMessage = await chatCompletion(messages, getToolsSchema());

        // Filter properties for database storage
        const messageToSave: Omit<Message, 'id' | 'timestamp'> = {
            role: 'assistant',
            content: responseMessage.content || '',
            tool_calls: responseMessage.tool_calls
        };

        // Save Assistant Response to Memory
        if (isSubAgent) {
            localHistory.push(messageToSave as Message);
        } else {
            await memoryStore.addMessage(messageToSave);
        }

        // --- LOOP DETECTION ---
        // If we reach here and we have tool calls, we process them.
        // We also want to verify we aren't calling the exact same tool with same args again.

        // 3. Process outcomes
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            console.log(`🛠️ Agent chose to use ${responseMessage.tool_calls.length} tool(s).`);

            for (const toolCall of responseMessage.tool_calls) {
                // Execute the tool
                const toolResult = await executeTool(
                    toolCall.function.name,
                    toolCall.function.arguments
                );

                // Save the result to Memory
                const toolMsg: any = {
                    role: 'tool',
                    content: toolResult,
                    name: toolCall.function.name,
                    tool_call_id: toolCall.id
                };

                if (isSubAgent) {
                    localHistory.push(toolMsg);
                } else {
                    await memoryStore.addMessage(toolMsg);
                }
            }

            // Continue the loop so LLM can process the tool result
            continue;
        }

        // B. The LLM outputted a text message directly
        if (responseMessage.content) {
            return responseMessage.content as string;
        }

        // Edge case recovery
        console.warn("LLM returned neither content nor tool calls.");
        return "Mmh, my brain just short-circuited. Can you try saying that again?";
    }

    // 4. Hit iteration limit
    const limitMsg = "I've hit my internal iteration limit. I did several things, but couldn't finish the whole process. Please check where I left off.";
    console.log('⚠️ ' + limitMsg);

    return limitMsg;
}

/**
 * Autonomous Heartbeat Loop (OpenClaw Parity)
 * Triggered by a timer to perform background tasks.
 */
export async function runAutonomousHeartbeat(): Promise<void> {
    console.log("💓 Heartbeat triggered...");

    // 1. Get recent context
    const history = await memoryStore.getRecentMessages(10);

    // 2. Prepare autonomous instruction
    const autonomousInstruction = `[SYSTEM HEARTBEAT]
It is now ${new Date().toLocaleString()}. 
Review your recent activity and perform any necessary autonomous actions:
- Check for pending tasks.
- Research topics mentioned in the last conversation if not finished.
- Perform system maintenance or workspace optimizations.
- If nothing is needed, simply respond with "IDLE".`;

    // 3. Run a mini-loop (max 3 iterations to save tokens)
    let iterations = 0;
    const MAX_HB_ITERATIONS = 3;
    const localHistory: Message[] = [...history, { role: 'user', content: autonomousInstruction }];

    while (iterations < MAX_HB_ITERATIONS) {
        iterations++;
        console.log(`💓 HB thinking... (${iterations}/${MAX_HB_ITERATIONS})`);

        const skillsContent = await loadSkills();
        const fullSystemPrompt = SYSTEM_PROMPT + skillsContent;
        const messages = [
            { role: 'system', content: fullSystemPrompt },
            ...localHistory
        ];

        await loadCustomTools();
        const responseMessage = await chatCompletion(messages, getToolsSchema());

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            for (const toolCall of responseMessage.tool_calls) {
                const toolResult = await executeTool(toolCall.function.name, toolCall.function.arguments);
                localHistory.push({ role: 'assistant', content: '', tool_calls: [toolCall] } as any);
                localHistory.push({ role: 'tool', content: toolResult, name: toolCall.function.name, tool_call_id: toolCall.id } as any);
            }
            continue;
        }

        if (responseMessage.content) {
            const content = responseMessage.content as string;
            if (content.toUpperCase().includes("IDLE")) {
                console.log("💓 HB: No actions needed (IDLE).");
            } else {
                console.log(`💓 HB Action: ${content}`);
                // We save the heartbeat's "thought" to memory so the user knows what happened in the background
                await memoryStore.addMessage({
                    role: 'assistant',
                    content: `[HEARTBEAT LOG]: ${content}`
                });
            }
            break;
        }
        break;
    }
}

// Initialize tool-loop orchestration
setAgentRunner(runAgentLoop);
