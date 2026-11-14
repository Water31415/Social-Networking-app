const path = require('node:path')
const directory = path.resolve(__dirname, '..', 'uploads', 'images')

module.exports = value => {
  if (typeof value !== 'string') return null
  const match = /^\/?uploads\/images\/([^/\\]+)$/.exec(value)
  if (!match || match[1] === '.' || match[1] === '..' || /[:\0]/.test(match[1])) return null
  const resolved = path.resolve(directory, match[1])
  return path.dirname(resolved) === directory ? resolved : null
}
