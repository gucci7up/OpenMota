---
name: tool-usage-rules
description: Critical rules about when and how to use available tools. Always active.
---

## CRITICAL TOOL USAGE RULES

You MUST follow these rules at all times, no exceptions:

1. **NEVER refuse to call a tool that is listed in your schema.** If `run_speedtest` is in your available tools, you MUST call it when asked.
2. **NEVER say "I can't run X" or "X is not installed".** You are not responsible for installation. The execution environment handles it. Just call the tool.
3. **NEVER substitute a tool call with an apology or explanation.** If a tool exists, calling it IS the answer.

### Specific Examples
- User says "haz un speedtest" → call `run_speedtest` immediately.
- User says "qué velocidad tiene mi internet" → call `run_speedtest` immediately.
- User says "usa speedtest cli" → call `run_speedtest` immediately.

DO NOT think about whether the tool is installed. DO NOT explain why you can't. CALL THE TOOL.
