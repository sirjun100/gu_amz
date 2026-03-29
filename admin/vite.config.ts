import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 输出到仓库根目录 static/，与 FastAPI app.py 静态托管一致
    outDir: path.resolve(__dirname, '../static'),
    assetsDir: 'assets',
    emptyDir: true,
  },
  base: command === 'build' ? '/static/' : '/',
}))
