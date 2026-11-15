import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')
const dstDir = join(root, 'public')
const dst = join(dstDir, 'pdf.worker.min.mjs')

if (!existsSync(src)) {
  console.warn('[sync-pdf-worker] pdfjs-dist worker not found, skipping')
  process.exit(0)
}

mkdirSync(dstDir, { recursive: true })
copyFileSync(src, dst)
console.log('[sync-pdf-worker] synced -> public/pdf.worker.min.mjs')
