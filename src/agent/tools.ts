import { z } from 'zod';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { search } from 'duck-duck-scrape';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

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
  // ... (keeps implementation)
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

// 4. Tool to Search the Web
const webSearch: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the internet for information on a given query.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look for.'
          }
        },
        required: ['query']
      }
    }
  },
  execute: async (args: { query: string }) => {
    try {
      const results = await search(args.query);
      if (!results.results || results.results.length === 0) return "No results found.";

      const formatted = results.results.slice(0, 5).map(r =>
        `Title: ${r.title}\nURL: ${r.url}\nDescription: ${r.description}\n`
      );
      return formatted.join('\n');
    } catch (e: any) {
      return `Error performing web search: ${e.message}`;
    }
  }
};

// 5. Tool to Read a Webpage
const readWebpage: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'read_webpage',
      description: 'Extracts the main readable content from a given URL as text/markdown.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL of the webpage to read.'
          }
        },
        required: ['url']
      }
    }
  },
  execute: async (args: { url: string }) => {
    try {
      const response = await fetch(args.url);
      const htmlText = await response.text();

      const dom = new JSDOM(htmlText, { url: args.url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article || !article.textContent || !article.content) {
        return "Could not extract content from this URL.";
      }

      const turndownService = new TurndownService();
      const markdown = turndownService.turndown(article.content);

      // Send max length to avoid exceeding token limit (roughly 20k characters)
      return markdown.substring(0, 20000);
    } catch (e: any) {
      return `Error reading webpage: ${e.message}`;
    }
  }
};

// 6. Tool to manage Google Workspace (Gmail, Calendar, Drive) via gog CLI
const googleWorkspaceManager: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'google_workspace_manager',
      description: 'Interact with Google Workspace (Gmail, Calendar, Drive, Sheets) using gog CLI. Supports searching, reading, sending emails, and managing calendar events.',
      parameters: {
        type: 'object',
        properties: {
          subcommand: {
            type: 'string',
            enum: ['gmail', 'calendar', 'drive', 'sheets', 'docs', 'contacts'],
            description: 'The Google service to interact with.'
          },
          action: {
            type: 'string',
            description: 'The specific action or command (e.g., "search", "send", "events", "list").'
          },
          args: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional arguments for the command (e.g., ["--max", "10", "newer_than:7d"]).'
          }
        },
        required: ['subcommand', 'action']
      }
    }
  },
  execute: async (args: { subcommand: string, action: string, args?: string[] }) => {
    const { subcommand, action, args: commandArgs = [] } = args;

    // Determine gog binary path
    let gogPath = 'gog';
    if (process.platform === 'win32') {
      const localBinPath = path.join(process.cwd(), 'bin', 'gog.exe');
      if (fs.existsSync(localBinPath)) {
        gogPath = `"${localBinPath}"`;
      }
    } else {
      // Linux/Dokploy logic
      const localBinPath = path.join(process.cwd(), 'bin', 'gog');
      if (fs.existsSync(localBinPath)) {
        gogPath = `"${localBinPath}"`;
      }
    }

    // Construct the full command
    const fullCommand = `${gogPath} ${subcommand} ${action} ${commandArgs.join(' ')}`;

    // Safety check - specifically for gog
    console.log(`📡 Constructing Google Workspace command: ${fullCommand}`);

    try {
      // Execute with a longer timeout for network-bound operations
      const output = execSync(fullCommand, {
        encoding: 'utf-8',
        timeout: 30000,
        env: { ...process.env, GOG_NO_INPUT: 'true' }
      });
      return output.trim() || 'Command executed successfully.';
    } catch (e: any) {
      const errorMsg = e.message || '';
      if (errorMsg.includes('not found') || errorMsg.includes('not recognized') || errorMsg.includes('ENOENT')) {
        return "Error: The 'gog' CLI is not installed or not in the system PATH. Please ensure it is installed and configured (check nixpacks.toml for Dokploy or run local install).";
      }
      return `Error executing Google Workspace command: ${e.message}\nSTDOUT: ${e.stdout || ''}\nSTDERR: ${e.stderr || ''}`;
    }
  }
};

// Combine tools into a map for fast lookup and an array for the LLM
export const availableTools: AgentTool[] = [
  getSystemInfo,
  runLocalCommand,
  listDirectory,
  webSearch,
  readWebpage,
  googleWorkspaceManager
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
