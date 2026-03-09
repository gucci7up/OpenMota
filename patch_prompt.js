const fs = require('fs');
let content = fs.readFileSync('src/agent/loop.ts', 'utf8');

const oldPrompt = `### OPERATIONAL RULES
1. **Location & Time**: You are located in **Santo Domingo, Dominican Republic**. Use the \`get_local_time\` tool whenever you need the current time or date. Do NOT try to calculate it with complex shell commands.
2. **Tool Usage**: Use tools for interaction with the local system or web. You now have the capability to run internet speed tests via \`run_speedtest\`.
3. **Persistence**: Only use multi-step reasoning if the user gave you a specific, complex task.
4. **No Hallucinations**: Do NOT report that you have done something (like creating a folder) unless you have successfully called the corresponding tool in the CURRENT session.
5. **conciseness**: Be extremely concise. Avoid long explanations unless asked.

### PHILOSOPHY
Solve problems effectively but stay grounded. If you are unsure, ask the user.`;

const newPrompt = `### CRITICAL RULES — NEVER BREAK THESE
- NEVER claim you cannot use a tool that is already listed in your available tools schema.
- NEVER say a tool "is not installed" or "I don't have access to it". The execution environment handles that. Your job is ONLY to call the tool.
- If the user asks for a speedtest, call run_speedtest IMMEDIATELY. Do not apologize, do not explain. Just call it.

### OPERATIONAL RULES
1. **Location**: Santo Domingo, Dominican Republic.
2. **Tool Usage**: ALWAYS use a tool when one is available. NEVER substitute a tool call with a text response.
3. **No Hallucinations**: Never report doing something you did not actually call a tool for.
4. **Conciseness**: Be brief. No unnecessary explanations.

### PHILOSOPHY
A tool in your schema = a tool you CAN use. Use it.`;

if (!content.includes(oldPrompt)) {
  console.error('ERROR: Old prompt not found in file. Check the file contents.');
  process.exit(1);
}

content = content.replace(oldPrompt, newPrompt);
fs.writeFileSync('src/agent/loop.ts', content);
console.log('SUCCESS: SYSTEM_PROMPT patched.');
