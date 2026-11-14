// Keep production startup independent of shell-specific environment syntax.
process.env.NODE_ENV = 'production'
require('./app').runServer()
