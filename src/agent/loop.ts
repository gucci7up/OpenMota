import { chatCompletion } from '../llm/client.js';
import { memoryStore, Message } from '../db/index.js';
import { toolsSchema, executeTool } from './tools.js';

const SYSTEM_PROMPT = `You are OpenMota, a personal AI agent running locally.
You communicate via Telegram. You can think, use tools, and you have persistent memory.
You are helpful, concise, secure, and professional.
CRITICAL INSTRUCTION: To reply to the user, DO NOT use the run_local_command tool with "echo". Instead, simply output a normal text message in your content response.
Use the tools available to you ONLY when you need to interact with the local operating system.

VOICE MESSAGES: If the user asks you to speak, send a voice note, or talk, you MUST wrap your exact spoken response inside <VOICE> and </VOICE> tags. 
For example: <VOICE>¡Hola! Me alegra hablar contigo.</VOICE>
You can combine normal text and voice tags in the same response.

GOOGLE WORKSPACE: You are FULLY AUTHORIZED to manage Gmail, Calendar, Drive, Sheets, and Contacts using the google_workspace tool.
- Emails: You can search, send, draft, and reply. Use it to answer questions like "Do I have any emails about...?"
- Calendar: You can list, create, and update events. Use it for "What's my schedule?"
- Drive: You can search and list files.
- You MUST use this tool whenever the user asks about their Google account data. Authenticity is already established.
- Always confirm with the user before sending new emails or creating/modifying calendar events.`;

const MAX_ITERATIONS = 5;

/**
 * The core agent loop running the reasoning process
 * @param userMessage The new incoming user message text
 * @returns The final response text to send back to the user
 */
export async function runAgentLoop(userMessage: string): Promise<string> {
    // 1. Add User Message to Memory
    await memoryStore.addMessage({
        role: 'user',
        content: userMessage
    });

    let iterations = 0;

    // The loop
    while (iterations < MAX_ITERATIONS) {
        iterations++;
        console.log(`🤖 Agent thinking... (Iteration ${iterations}/${MAX_ITERATIONS})`);

        // Fetch memory
        // Only fetch past 30 messages to keep context window reasonable
        const history = await memoryStore.getRecentMessages(30);

        // Prepend System Prompt
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
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
        await memoryStore.addMessage(messageToSave);

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
                await memoryStore.addMessage({
                    role: 'tool',
                    content: toolResult,
                    name: toolCall.function.name,
                    tool_call_id: toolCall.id
                });
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
    const limitMsg = "I've hit my internal iteration limit while thinking. Here's a partial thought.";
    console.log('⚠️ ' + limitMsg);

    // Optional: Add a system note to memory so the agent knows it hit a limit
    await memoryStore.addMessage({
        role: 'system',
        content: "WARNING: ITERATION LIMIT REACHED. Respond explaining you couldn't finish the thought."
    });

    return limitMsg;
}
