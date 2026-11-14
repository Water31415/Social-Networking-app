const fs = require('node:fs')
const path = require('node:path')

module.exports = (app, express) => {
  if (process.env.NODE_ENV !== 'production' || process.env.SERVE_FRONTEND === 'false') return
  const directory = path.resolve(__dirname, '../../Frontend/build')
  const index = path.join(directory, 'index.html')
  if (!fs.existsSync(index)) {
    throw new Error('Frontend build is missing. Run npm run build, or set SERVE_FRONTEND=false for an API-only deployment.')
  }
  app.use('/assets', express.static(path.join(directory, 'assets'), { maxAge:'1y', immutable:true, index:false }))
  app.use(express.static(directory, { index:false, maxAge:0 }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || /^\/(api|uploads|assets)(\/|$)/.test(req.path) || path.extname(req.path) || !req.accepts('html')) return next()
    res.sendFile(index, { headers:{ 'Cache-Control':'no-cache' } })
  })
}
