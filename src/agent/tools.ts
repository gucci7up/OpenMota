import { z } from 'zod';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Type definition for a tool executor
type ToolExecutor = (args: any) => Promise<string> | string;

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any; // JSON schema
  };
}

export interface AgentTool {
  definition: ToolDefinition;
  execute: ToolExecutor;
}

// 1. Tool to get basic system information
const getSystemInfo: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_system_info',
      description: 'Get basic information about the operating system where the agent is running.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  execute: () => {
    return JSON.stringify({
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
      hostname: os.hostname(),
      uptime: os.uptime()
    });
  }
};

// 2. Tool to execute a safe local command (Restricted)
const runLocalCommand: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'run_local_command',
      description: 'Run a read-only or safe local shell command (e.g., date, ls, echo, pwd). Do NOT run destructive commands!',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute.'
          }
        },
        required: ['command']
      }
    }
  },
  execute: (args: { command: string }) => {
    const { command } = args;

    // Safety check - simple blocklist (in production you'd use a strict allowlist instead)
    const dangerousKeywords = ['rm ', 'del ', 'format ', '> ', '>> ', 'wget ', 'curl ', 'mkfs'];
    if (dangerousKeywords.some(keyword => command.includes(keyword))) {
      return "Error: Command rejected for safety reasons.";
    }

    try {
      // Timeout to prevent hanging
      const output = execSync(command, { encoding: 'utf-8', timeout: 10000 });
      return output.trim() || 'Command executed successfully with no output.';
    } catch (e: any) {
      return `Error executing command: ${e.message}`;
    }
  }
};

// 3. Tool to list files in a directory
const listDirectory: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List contents of a specified directory path on the local system.',
      parameters: {
        type: 'object',
        properties: {
          dirPath: {
            type: 'string',
            description: 'The absolute or relative path to the directory.'
          }
        },
        required: ['dirPath']
      }
    }
  },
  execute: (args: { dirPath: string }) => {
    const { dirPath } = args;
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const formatted = items.map(item => `[${item.isDirectory() ? 'DIR' : 'FILE'}] ${item.name}`);
      return formatted.join('\n');
    } catch (e: any) {
      return `Error reading directory: ${e.message}`;
    }
  }
};

// Combine tools into a map for fast lookup and an array for the LLM
export const availableTools: AgentTool[] = [
  getSystemInfo,
  runLocalCommand,
  listDirectory
];

export const toolsSchema = availableTools.map(t => t.definition);

export async function executeTool(toolName: string, toolArgs: string): Promise<string> {
  const tool = availableTools.find(t => t.definition.function.name === toolName);

  if (!tool) {
    return `Error: Tool "${toolName}" not found.`;
  }

  try {
    const parsedArgs = JSON.parse(toolArgs) || {};
    console.log(`🔧 Executing tool: ${toolName}`, parsedArgs);
    const result = await tool.execute(parsedArgs);
    console.log(`✅ Tool result (${toolName}):`, result.substring(0, 100) + (result.length > 100 ? '...' : ''));
    return result;
  } catch (error: any) {
    console.error(`❌ Error executing tool ${toolName}:`, error);
    return `Error during tool execution: ${error.message}`;
  }
}
