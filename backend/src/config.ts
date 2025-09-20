// Packages
import dotenv from 'dotenv';

// Load the .env file in the .. directory if it exists to add environment variables. Helps with local
// development.
//
// On the server, the environment variables are injected via webserver.service; see infra.git.
dotenv.config({ path: ['.env'], quiet: true });
// console.warn('Environment variables:', Object.entries(process.env).sort().filter(([key]) => key.startsWith('G') || key.startsWith('A')).map(([key, value]) => `${key}=${value}`).join('\n'));

export const listeningPort = parseInt(process.env['PORT'] || '3000', 10);
export const isProd = process.env['NODE'] === 'production';

export const appBaseUrl = isProd ? 'https://wapidou.com' : `http://localhost:${listeningPort}`;
