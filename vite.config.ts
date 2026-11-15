import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import secureHandler from './api/secure';
import aiHandler from './api/soft-quotation-ai';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), { name: 'local-secure-api', configureServer(server) { server.middlewares.use((req,res,next)=>{ const handler=req.url?.split('?')[0]==='/api/secure'?secureHandler:req.url?.split('?')[0]==='/api/soft-quotation-ai'?aiHandler:null; if(handler)void handler(req,res);else next(); }); } }],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
