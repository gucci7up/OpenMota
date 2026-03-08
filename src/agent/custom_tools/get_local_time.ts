import { AgentTool } from '../tools.js';

/**
 * Tool to get the current local time in a user-friendly format.
 * Uses the server's configured TimeZone (America/Santo_Domingo).
 */
const getLocalTime: AgentTool = {
    definition: {
        type: 'function',
        function: {
            name: 'get_local_time',
            description: 'Get the current local time and date in a human-readable format. Use this whenever the user asks for the time or date.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },
    execute: async () => {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        };

        return now.toLocaleString('es-DO', options);
    }
};

export default getLocalTime;
