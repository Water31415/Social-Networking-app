const path = require('node:path')
const dns = require('node:dns')
const { isIP } = require('node:net')
const dotenv = require('dotenv')

const environmentPath = path.join(__dirname, '..', process.env.NODE_ENV === 'production' ? '.env.production' : '.env')

const loadEnvironment = () => {
  const result = dotenv.config({ path: environmentPath, quiet: true })
  // Deployments may supply all configuration through the process environment.
  if (result.error && result.error.code !== 'ENOENT') {
    throw new Error('Could not read the backend environment file. Check its permissions.')
  }
}

const isConfigured = name => typeof process.env[name] === 'string' && process.env[name].trim().length > 0

const getJwtSecret = () => {
  if (!isConfigured('JWT_API_KEY')) throw new Error('JWT_API_KEY must be configured')
  if (process.env.NODE_ENV === 'production' && process.env.JWT_API_KEY.trim().length < 32) {
    throw new Error('JWT_API_KEY must contain at least 32 characters in production')
  }
  return process.env.JWT_API_KEY
}

const getJwtLifetimeSeconds = () => {
  // Keep local sessions short while expiry behavior is being tested.
  const seconds = Number(process.env.JWT_TTL_SECONDS || (process.env.NODE_ENV === 'production' ? 3600 : 120))
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 604800) {
    throw new Error('JWT_TTL_SECONDS must be a whole number between 1 and 604800')
  }
  return seconds
}

const validateStartupEnvironment = () => {
  const missing = ['DATABASE_API_KEY', 'JWT_API_KEY'].filter(name => !isConfigured(name))
  if (missing.length) throw new Error(`Missing required backend configuration: ${missing.join(', ')}`)
  getJwtSecret()
  getJwtLifetimeSeconds()
}

const applyDatabaseDns = () => {
  if (!isConfigured('DATABASE_DNS_SERVERS')) return
  const servers = process.env.DATABASE_DNS_SERVERS.split(',').map(server => server.trim())
  if (servers.some(server => !isIP(server))) {
    throw new Error('DATABASE_DNS_SERVERS must contain comma-separated IP addresses')
  }
  // This changes DNS resolution only inside the running Node process.
  dns.setServers(servers)
}

module.exports = { loadEnvironment, getJwtSecret, getJwtLifetimeSeconds, validateStartupEnvironment, applyDatabaseDns }
