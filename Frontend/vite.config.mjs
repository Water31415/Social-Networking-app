import { defineConfig, loadEnv, transformWithOxc } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode, command }) => {
  // Keep the existing public configuration names; never expose backend secrets.
  const env = loadEnv(mode, import.meta.dirname, ['REACT_APP_', 'PUBLIC_URL'])
  const publicUrl = env.PUBLIC_URL || ''
  return {
    base: publicUrl ? `${publicUrl.replace(/\/$/, '')}/` : '/',
    // WSL cannot reliably receive notifications for edits made from Windows.
    server: {
      watch: process.env.WSL_DISTRO_NAME ? { usePolling:true, interval:1000 } : undefined
    },
    plugins: [
      {
        // The existing React components use JSX inside .js files.
        name: 'snapit-jsx-in-js',
        enforce: 'pre',
        transform(code, id) {
          if (!/\/src\/.*\.js$/.test(id.replace(/\\/g, '/'))) return null
          return transformWithOxc(code, id, {
            lang: 'jsx',
            jsx: { runtime: 'automatic', development: command === 'serve', refresh: command === 'serve' }
          })
        }
      },
      react()
    ],
    optimizeDeps: { rolldownOptions: { moduleTypes: { '.js': 'jsx' } } },
    define: {
      'process.env.REACT_APP_BACKEND_URL': JSON.stringify(env.REACT_APP_BACKEND_URL || ''),
      'process.env.PUBLIC_URL': JSON.stringify(publicUrl.replace(/\/$/, ''))
    },
    build: { outDir: 'build' }
  }
})
