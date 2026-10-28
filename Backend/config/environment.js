const path = require('node:path')
const dns = require('node:dns')
const { isIP } = require('node:net')
const dotenv = require('dotenv')

const environmentPath = path.join(__dirname, '..', '.env')

const loadEnvironment = () => {
  const result = dotenv.config({ path: environmentPath, quiet: true })
  // Deployments may supply all configuration through the process environment.
  if (result.error && result.error.code !== 'ENOENT') {
    throw new Error('Could not read Backend/.env. Check the file permissions.')
  }
}

const isConfigured = name => typeof process.env[name] === 'string' && process.env[name].trim().length > 0

const getJwtSecret = () => {
  if (!isConfigured('JWT_API_KEY')) throw new Error('JWT_API_KEY must be configured')
  return process.env.JWT_API_KEY
}

const validateStartupEnvironment = () => {
  const missing = ['DATABASE_API_KEY', 'JWT_API_KEY'].filter(name => !isConfigured(name))
  if (missing.length) throw new Error(`Missing required backend configuration: ${missing.join(', ')}`)
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

module.exports = { loadEnvironment, getJwtSecret, validateStartupEnvironment, applyDatabaseDns }
