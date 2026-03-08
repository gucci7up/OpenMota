import { execSync } from 'child_process';
import { AgentTool } from '../tools.js';

/**
 * OpenClaw-style Terminal tool.
 * Provides more freedom to execute commands in the server environment.
 */
const terminal: AgentTool = {
    definition: {
        type: 'function',
        function: {
            name: 'terminal',
            description: 'Execute shell commands in the server environment. Use this for installing dependencies, running scripts, or system management. (OpenClaw Parity)',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'The shell command to execute.'
                    },
                    cwd: {
                        type: 'string',
                        description: 'Optional working directory for the command.'
                    }
                },
                required: ['command']
            }
        }
    },
    execute: async (args: { command: string, cwd?: string }) => {
        const { command, cwd } = args;

        try {
            // We use a longer timeout (30s) for complex commands
            const output = execSync(command, {
                encoding: 'utf-8',
                timeout: 30000,
                cwd: cwd || process.cwd(),
                shell: '/bin/bash' // Use bash if available for better compatibility
            });

            return output || 'Command executed successfully (no output).';
        } catch (error: any) {
            let errorMsg = `Error executing command: ${error.message}`;
            if (error.stdout) errorMsg += `\nStdout: ${error.stdout}`;
            if (error.stderr) errorMsg += `\nStderr: ${error.stderr}`;
            return errorMsg;
        }
    }
};

export default terminal;
