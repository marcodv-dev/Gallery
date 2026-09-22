import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = join(__dirname, '..', 'public', 'logo-vault.svg')
const svgBuffer = readFileSync(svgPath)

const icons = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'maskable-icon-512x512.png', size: 512, maskable: true },
]

for (const icon of icons) {
  const padding = icon.maskable ? Math.round(icon.size * 0.1) : 0
  const innerSize = icon.size - padding * 2

  let pipeline = sharp(svgBuffer).resize(innerSize, innerSize)

  if (icon.maskable) {
    pipeline = pipeline.extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 14, g: 15, b: 12, alpha: 1 },
    })
  }

  const outPath = join(__dirname, '..', 'public', icon.name)
  await pipeline.png().toFile(outPath)
  console.log(`✓ ${icon.name} (${icon.size}×${icon.size}${icon.maskable ? ' maskable' : ''})`)
}

console.log('Done!')
