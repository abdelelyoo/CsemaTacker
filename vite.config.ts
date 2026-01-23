import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    // IMPORTANT: This must match your GitHub repository name.
    // If your repo is https://github.com/abdelelyoo/portfolio-analysis, this is correct.
    base: '/CsemaTacker/', 
    define: {
      // This passes the API Key from GitHub Secrets to the code
      'process.env.API_KEY': JSON.stringify(env.API_KEY) 
    }
  }
})