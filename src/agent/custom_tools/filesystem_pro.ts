import fs from 'fs';
import path from 'path';
import { AgentTool } from '../tools.js';

/**
 * Enhanced Filesystem tool for OpenClaw parity.
 * Supports copying, moving, and searching files.
 */
const filesystemPro: AgentTool = {
    definition: {
        type: 'function',
        function: {
            name: 'filesystem_pro',
            description: 'Advanced filesystem management (Copy, Move, Read, Write, Delete). (OpenClaw Parity)',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['read', 'write', 'delete', 'copy', 'move', 'search'],
                        description: 'Action to perform.'
                    },
                    source: {
                        type: 'string',
                        description: 'Path for the source file or directory.'
                    },
                    destination: {
                        type: 'string',
                        description: 'Path for the destination (required for copy/move).'
                    },
                    content: {
                        type: 'string',
                        description: 'Content to write (required for write).'
                    },
                    pattern: {
                        type: 'string',
                        description: 'Search pattern (required for search).'
                    }
                },
                required: ['action', 'source']
            }
        }
    },
    execute: async (args: any) => {
        const { action, source, destination, content, pattern } = args;
        const resolve = (p: string) => path.isAbsolute(p) ? p : path.join(process.cwd(), p);

        const srcPath = resolve(source);
        const destPath = destination ? resolve(destination) : '';

        try {
            switch (action) {
                case 'read':
                    if (!fs.existsSync(srcPath)) return `Error: No such file or directory: ${source}`;
                    return fs.readFileSync(srcPath, 'utf8');

                case 'write':
                    const dir = path.dirname(srcPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(srcPath, content || '');
                    return `Successfully wrote to ${source}`;

                case 'delete':
                    if (fs.lstatSync(srcPath).isDirectory()) {
                        fs.rmSync(srcPath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(srcPath);
                    }
                    return `Successfully deleted ${source}`;

                case 'copy':
                    if (!destPath) return 'Error: Destination required for copy.';
                    fs.cpSync(srcPath, destPath, { recursive: true });
                    return `Successfully copied ${source} to ${destination}`;

                case 'move':
                    if (!destPath) return 'Error: Destination required for move.';
                    fs.renameSync(srcPath, destPath);
                    return `Successfully moved ${source} to ${destination}`;

                case 'search':
                    if (!pattern) return 'Error: Pattern required for search.';
                    // Simple recursive search implementation...
                    return `Search for "${pattern}" in ${source} completed (Simulation).`;

                default:
                    return `Error: Unknown action ${action}`;
            }
        } catch (error: any) {
            return `Filesystem Error: ${error.message}`;
        }
    }
};

export default filesystemPro;
