import { z } from 'zod';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, execFileSync } from 'child_process';
import { search } from 'duck-duck-scrape';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { memoryStore } from '../db/index.js';

// Type definition for a tool executor
type ToolExecutor = (args: any) => Promise<string> | string;

// Function pointer to avoid circular dependency with loop.ts
let agentRunner: ((msg: string, isSub: boolean) => Promise<string>) | null = null;
export function setAgentRunner(runner: any) {
  agentRunner = runner;
}

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
      memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
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
      return `Error executing command: ${e.message} `;
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
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to list files recursively.'
          }
        },
        required: ['dirPath']
      }
    }
  },
  execute: (args: { dirPath: string, recursive?: boolean }) => {
    const { dirPath, recursive = false } = args;
    try {
      const getFiles = (dir: string, base: string = ''): string[] => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        let result: string[] = [];
        for (const item of items) {
          const relativePath = path.join(base, item.name);
          const fullPath = path.join(dir, item.name);
          result.push(`[${item.isDirectory() ? 'DIR' : 'FILE'}] ${relativePath}`);
          if (recursive && item.isDirectory()) {
            result = [...result, ...getFiles(fullPath, relativePath)];
          }
        }
        return result;
      };
      const formatted = getFiles(dirPath);
      return formatted.join('\n');
    } catch (e: any) {
      return `Error reading directory: ${e.message}`;
    }
  }
};

// 6. Advanced File Manager (OpenClaw style)
const fileManager: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'file_manager',
      description: 'Read, write, or delete files on the local system. Use this for building and managing the codebase.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['read', 'write', 'delete'],
            description: 'The action to perform.'
          },
          filePath: {
            type: 'string',
            description: 'The path to the file.'
          },
          content: {
            type: 'string',
            description: 'The content to write (required for "write" action).'
          }
        },
        required: ['action', 'filePath']
      }
    }
  },
  execute: async (args: { action: 'read' | 'write' | 'delete', filePath: string, content?: string }) => {
    const { action, filePath, content } = args;
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

    try {
      if (action === 'read') {
        if (!fs.existsSync(fullPath)) return `Error: File not found at ${filePath}`;
        return fs.readFileSync(fullPath, 'utf-8');
      } else if (action === 'write') {
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, content || '');
        return `Successfully wrote to ${filePath}`;
      } else if (action === 'delete') {
        if (!fs.existsSync(fullPath)) return `Warning: File already gone at ${filePath}`;
        fs.unlinkSync(fullPath);
        return `Successfully deleted ${filePath}`;
      }
      return 'Invalid action.';
    } catch (e: any) {
      return `Error in file_manager (${action}): ${e.message}`;
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
        `Title: ${r.title} \nURL: ${r.url} \nDescription: ${r.description} \n`
      );
      return formatted.join('\n');
    } catch (e: any) {
      return `Error performing web search: ${e.message} `;
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
      return `Error reading webpage: ${e.message} `;
    }
  }
};

// 7. Search Memory Tool (Legacy Keyword)
const searchMemory: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'search_memory',
      description: 'Search through past conversation history using a keyword.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The keyword or phrase to search for.'
          }
        },
        required: ['query']
      }
    }
  },
  execute: async (args: { query: string }) => {
    const results = await memoryStore.searchMessages(args.query);
    if (results.length === 0) return "No matches found in memory.";
    return JSON.stringify(results, null, 2);
  }
};

// 7b. Semantic Search Memory Tool (Conceptual)
const semanticSearch: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'semantic_search',
      description: 'Search through past conversations using conceptual/semantic similarity. Use this for general questions about what was discussed before.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The concept or question to search for.'
          },
          limit: {
            type: 'number',
            description: 'How many results to return (default: 5).'
          }
        },
        required: ['query']
      }
    }
  },
  execute: async (args: { query: string, limit?: number }) => {
    const results = await memoryStore.semanticSearch(args.query, args.limit);
    if (results.length === 0) return "No conceptual matches found in recent history.";
    return JSON.stringify(results, null, 2);
  }
};

// 8. Project Map Tool
const projectMap: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'project_map',
      description: 'Generate a visual tree of the current project structure.',
      parameters: {
        type: 'object',
        properties: {
          depth: {
            type: 'number',
            description: 'The maximum depth of the tree (default: 3).'
          }
        },
        required: []
      }
    }
  },
  execute: async (args: { depth?: number }) => {
    const depth = args.depth || 3;
    const ignore = ['node_modules', '.git', '.firebase', 'dist', '.next'];

    const getTree = (dir: string, currentDepth: number): string => {
      if (currentDepth > depth) return '';
      const items = fs.readdirSync(dir, { withFileTypes: true });
      let output = '';

      for (const item of items) {
        if (ignore.includes(item.name)) continue;
        const prefix = '  '.repeat(currentDepth - 1);
        output += `${prefix}${item.isDirectory() ? '📁' : '📄'} ${item.name}\n`;
        if (item.isDirectory()) {
          output += getTree(path.join(dir, item.name), currentDepth + 1);
        }
      }
      return output;
    };

    try {
      const tree = getTree(process.cwd(), 1);
      return `Project Structure (Depth: ${depth}):\n${tree}`;
    } catch (e: any) {
      return `Error generating project map: ${e.message}`;
    }
  }
};

// 9. Sub-agent Spawning Tool
const spawnSubagent: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'spawn_subagent',
      description: 'Spawn a specialized sub-agent to handle a specific sub-task or research. Use this for complex multi-part tasks.',
      parameters: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'The specific task or instruction for the sub-agent.'
          }
        },
        required: ['task']
      }
    }
  },
  execute: async (args: { task: string }) => {
    if (!agentRunner) return "Error: Sub-agent engine not initialized.";
    try {
      console.log(`🚀 Spawning sub-agent for task: ${args.task}`);
      const result = await agentRunner(args.task, true);
      return `### SUB-AGENT REPORT ###\n${result}\n### END OF REPORT ###`;
    } catch (e: any) {
      return `Error spawning sub-agent: ${e.message}`;
    }
  }
};

// 10. Auto-Skills: Develop Tool
const developTool: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'develop_tool',
      description: 'Program a new tool for yourself. Provide the tool name, a detailed description, and the TypeScript code for the execute function. The code must follow the AgentTool interface and be self-contained.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The internal name of the tool (e.g., get_weather).' },
          description: { type: 'string', description: 'What the tool does and when to use it.' },
          parameters: { type: 'object', description: 'JSON Schema of the tool parameters.' },
          code: { type: 'string', description: 'The TypeScript code for the tool. Use "export default { definition: ..., execute: ... }" format.' }
        },
        required: ['name', 'description', 'parameters', 'code']
      }
    }
  },
  execute: async (args: { name: string, description: string, parameters: any, code: string }) => {
    const toolFilename = `${args.name}.ts`;
    const toolDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'custom_tools');
    const toolFile = path.join(toolDir, toolFilename);

    try {
      if (!fs.existsSync(toolDir)) fs.mkdirSync(toolDir, { recursive: true });
      fs.writeFileSync(toolFile, args.code);
      return `Successfully developed and installed tool: ${args.name}. It will be available in the next iteration.`;
    } catch (e: any) {
      return `Error developing tool: ${e.message}`;
    }
  }
};

// 11. Speedtest Tool (Static)
const runSpeedtest: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'run_speedtest',
      description: 'Run an internet speed test using speedtest-cli and return JSON results (download, upload, ping).',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  execute: async () => {
    try {
      console.log('🌐 Executing Ookla speedtest...');
      const { execSync } = await import('child_process');
      const output = execSync('speedtest --format=json --accept-license --accept-gdpr', {
        encoding: 'utf-8',
        timeout: 60000
      });
      const data = JSON.parse(output);
      const downloadMbps = (data.download.bandwidth * 8 / 1000000).toFixed(2);
      const uploadMbps = (data.upload.bandwidth * 8 / 1000000).toFixed(2);
      const ping = data.ping.latency.toFixed(2);
      return JSON.stringify({
        status: 'success',
        download: `${downloadMbps} Mbit/s`,
        upload: `${uploadMbps} Mbit/s`,
        ping: `${ping} ms`,
        server: data.server.name,
        location: `${data.server.location}, ${data.server.country}`,
        timestamp: data.timestamp
      }, null, 2);
    } catch (e: any) {
      console.error('Speedtest error:', e);
      return `Error ejecutando speedtest: ${e.message}`;
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
  fileManager,
  searchMemory,
  semanticSearch,
  projectMap,
  spawnSubagent,
  developTool,
  runSpeedtest
];

/**
 * Dynamically loads custom tools from the custom_tools directory
 */
export async function loadCustomTools() {
  const toolDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'custom_tools');
  if (!fs.existsSync(toolDir)) return;

  try {
    const files = fs.readdirSync(toolDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of files) {
      // Use dynamic import to load the tool
      console.log(`📂 Loading custom tool: ${file}`);
      const toolModule = await import(`./custom_tools/${file}?cache=${Date.now()}`);
      if (toolModule.default) {
        const toolName = toolModule.default.definition.function.name;
        // Only add if not already there
        if (!availableTools.find(t => t.definition.function.name === toolName)) {
          console.log(`✅ Loaded custom tool: ${toolName}`);
          availableTools.push(toolModule.default);
        }
      }
    }
  } catch (e) {
    console.error("Error loading custom tools:", e);
  }
}

export const getToolsSchema = () => availableTools.map(t => t.definition);

export async function executeTool(toolName: string, toolArgs: string): Promise<string> {
  const tool = availableTools.find(t => t.definition.function.name === toolName);

  if (!tool) {
    return `Error: Tool "${toolName}" not found.`;
  }

  try {
    const parsedArgs = JSON.parse(toolArgs) || {};
    console.log(`🔧 Executing tool: ${toolName} `, parsedArgs);
    const result = await tool.execute(parsedArgs);
    console.log(`✅ Tool result(${toolName}): `, result.substring(0, 100) + (result.length > 100 ? '...' : ''));
    return result;
  } catch (error: any) {
    console.error(`❌ Error executing tool ${toolName}: `, error);
    return `Error during tool execution: ${error.message} `;
  }
}
