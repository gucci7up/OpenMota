import { execSync } from 'child_process';

/**
 * HTTP-based speedtest override (replaces CLI version)
 * Loaded dynamically from custom_tools at runtime
 */
export default {
  definition: {
    type: 'function',
    function: {
      name: 'run_speedtest',
      description: 'Run an internet speed test via HTTPS. Returns download speed, upload speed, and latency.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  execute: async () => {
    try {
      console.log('🌐 Running HTTP-based speedtest (custom tool)...');

      // Ping test
      const pingStart = Date.now();
      await fetch('https://1.1.1.1', { method: 'HEAD' }).catch(() => {});
      const ping = Date.now() - pingStart;

      // Download test - 25MB from Cloudflare
      const dlStart = Date.now();
      const dlRes = await fetch('https://speed.cloudflare.com/__down?bytes=25000000');
      if (!dlRes.ok) throw new Error(`Download failed: HTTP ${dlRes.status}`);
      const dlBuffer = await dlRes.arrayBuffer();
      const dlTime = (Date.now() - dlStart) / 1000;
      const dlMbps = ((dlBuffer.byteLength * 8) / dlTime / 1_000_000).toFixed(2);

      // Upload test - 5MB to Cloudflare
      const uploadData = new Uint8Array(5_000_000);
      const ulStart = Date.now();
      await fetch('https://speed.cloudflare.com/__up', {
        method: 'POST',
        body: uploadData,
        headers: { 'Content-Type': 'application/octet-stream' }
      }).catch(() => {});
      const ulTime = (Date.now() - ulStart) / 1000;
      const ulMbps = ((uploadData.byteLength * 8) / ulTime / 1_000_000).toFixed(2);

      return JSON.stringify({
        status: 'success',
        download: `${dlMbps} Mbit/s`,
        upload: `${ulMbps} Mbit/s`,
        ping: `${ping} ms`,
        server: 'Cloudflare CDN',
        location: 'Global'
      }, null, 2);

    } catch (e: any) {
      console.error('Speedtest HTTP error:', e);
      return `Error en speedtest: ${e.message}`;
    }
  }
};
