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
1. **Tool Usage**: Use tools for interaction with the local system or web. **BUT ALWAYS prioritze answering the user directly if they just say greetings or general questions.**
2. **Persistence**: Only use multi-step reasoning if the user gave you a specific, complex task.
3. **No Hallucinations**: Do NOT report that you have done something (like creating a folder) unless you have successfully called the corresponding tool in the CURRENT session.
4. **conciseness**: Be extremely concise. Avoid long explanations unless asked.

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

// Initialize tool-loop orchestration
setAgentRunner(runAgentLoop);
