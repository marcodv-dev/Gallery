import { execFileSync } from 'child_process'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { networkInterfaces } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const certsDir = join(rootDir, 'certs')

function getMkcert() {
  const wingetPath = join(
    process.env.LOCALAPPDATA ?? '',
    'Microsoft', 'WinGet', 'Packages',
    'FiloSottile.mkcert_Microsoft.Winget.Source_8wekyb3d8bbwe', 'mkcert.exe'
  )
  if (existsSync(wingetPath)) return wingetPath
  return 'mkcert'
}

function getLanIPv4() {
  const addresses = new Set()
  const interfaces = networkInterfaces()
  for (const infos of Object.values(interfaces)) {
    if (!infos) continue
    for (const info of infos) {
      if (info.family === 'IPv4' && !info.internal) addresses.add(info.address)
    }
  }
  return Array.from(addresses)
}

function run(args) {
  const mkcert = getMkcert()
  try {
    execFileSync(mkcert, args, { stdio: 'inherit' })
  } catch (err) {
    console.error(`mkcert fallito: ${err.message}`)
    process.exit(1)
  }
}

mkdirSync(certsDir, { recursive: true })

const lanIps = getLanIPv4()
const hosts = ['localhost', '127.0.0.1', ...lanIps]
if (lanIps.length) {
  console.log(`IP LAN rilevati: ${lanIps.join(', ')}`)
} else {
  console.warn('Nessun IP LAN trovato, genero certificati solo per localhost.')
}

const caroot = execFileSync(getMkcert(), ['-CAROOT'], { encoding: 'utf8' }).trim()
const rootCa = join(caroot, 'rootCA.pem')

run(['-install'])
run(['-cert-file', join(certsDir, 'cert.pem'), '-key-file', join(certsDir, 'key.pem'), ...hosts])

if (existsSync(rootCa)) {
  copyFileSync(rootCa, join(certsDir, 'rootCA.pem'))
  console.log('rootCA.pem copiato in certs/')
} else {
  console.warn('rootCA.pem non trovato nel CAROOT mkcert, salta copia.')
}

console.log('\nCertificati pronti in certs/')
if (lanIps.length) {
  console.log(`\nPer testare dal telefono:\n1. Porta certs/rootCA.pem sul dispositivo\n2. iOS: Impostazioni → Generali → Informazioni → Certificati → attiva la fiducia per la CA\n3. Apri https://${lanIps[0]}:5174`)
}