import { execSync } from 'child_process';

/**
 * Custom tool to run a speedtest using speedtest-cli
 */
export default {
  definition: {
    type: 'function',
    function: {
      name: 'run_speedtest',
      description: 'Run an internet speed test using speedtest-cli and return the results in JSON format.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  execute: async () => {
    try {
      console.log('🌐 Running speedtest-cli...');
      // Use --json for machine-readable output
      const output = execSync('speedtest-cli --json', { encoding: 'utf-8', timeout: 60000 });
      const data = JSON.parse(output);
      
      const downloadMb = (data.download / 1000000).toFixed(2);
      const uploadMb = (data.upload / 1000000).toFixed(2);
      const ping = data.ping.toFixed(2);
      
      return JSON.stringify({
        status: 'success',
        download: `${downloadMb} Mbit/s`,
        upload: `${uploadMb} Mbit/s`,
        ping: `${ping} ms`,
        server: data.server.sponsor,
        location: `${data.server.name}, ${data.server.country}`,
        timestamp: data.timestamp
      }, null, 2);
    } catch (e: any) {
        console.error('Error running speedtest:', e);
        // Fallback for non-JSON output or if tool is missing during local dev
        if (e.message.includes('not found') || e.message.includes('not recognized')) {
            return "Error: speedtest-cli is not installed on this system. Please ensure it is available in the environment.";
        }
        return `Error executing speedtest: ${e.message}`;
    }
  }
};
