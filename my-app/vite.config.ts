import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**', 'src/lib/**', 'src/config/**'],
      exclude: ['src/config/temaer.ts', 'src/lib/supabase.ts'],
    },
  },
})
