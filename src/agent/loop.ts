import { chatCompletion } from '../llm/client.js';
import { memoryStore, Message } from '../db/index.js';
import { toolsSchema, executeTool, setAgentRunner } from './tools.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.join(__dirname, '../../data/skills');

const SYSTEM_PROMPT = `You are OpenMota, an autonomous AI agent with "OpenClaw" DNA.
You communicate via Telegram, have persistent memory, and can execute multi-step tasks independently.

### YOUR PHILOSOPHY
- **Autonomy**: Don't ask for permission to use tools or perform safe actions. Solve problems end-to-end.
- **Persistence**: If a task requires multiple steps (search, read, write, test), execute them all in sequence.
- **Proactivity**: If you see a way to improve the code or fix a bug you encounter, do it.
- **Minimal Chitchat**: Be concise. Focus on results and actions.

### OPERATIONAL RULES
1. **Tool Usage**: Use tools for ANY interaction with the local system, web, or files.
2. **Intelligence**: Use \`project_map\` at the start of complex tasks to understand the project structure. Use \`search_memory\` to recall past decisions or specific user information from older sessions.
3. **Orchestration**: Use \`spawn_subagent\` for very complex or long tasks (e.g., "Research this topic and give me a summary", "Create 5 files for the backend"). Sub-agents have their own temporary focus and return a report to you.
4. **Final Response**: Only stop and send a final message to the user when you have completed **every part** of their request.
5. **Voice Messages**: Wrap spoken responses in <VOICE>...</VOICE> tags.
6. **Git**: Use git commits for significant changes.

### AUTONOMY MODE
You are designed to work in loops. If one tool call is just a prerequisite for the next (like creating a folder before a file), execute the next step immediately.

### SKILLS & WORKFLOWS
Follow any skills loaded from your data/skills directory, especially for Brainstorming, Planning, and TDD.`;

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

const MAX_ITERATIONS = 15;

/**
 * The core agent loop running the reasoning process
 * @param userMessage The new incoming user message text
 * @param isSubAgent If true, the loop runs in a temporary context without writing to permanent memory
 * @returns The final response text to send back to the user
 */
export async function runAgentLoop(userMessage: string, isSubAgent: boolean = false): Promise<string> {
    // Local memory for sub-agents to avoid polluting main conversation
    const localHistory: Message[] = isSubAgent ? [{ role: 'user', content: userMessage }] : [];

    // 1. Add User Message to Memory (only if not sub-agent)
    if (!isSubAgent) {
        await memoryStore.addMessage({
            role: 'user',
            content: userMessage
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
        const responseMessage = await chatCompletion(messages, toolsSchema);

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

        // 3. Process outcomes

        // A. The LLM decided to use a tool
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
