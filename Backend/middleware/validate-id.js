const HttpError = require('../models/http-error')

module.exports = (req, res, next, value) => {
  if (!/^[a-f\d]{24}$/i.test(value)) return next(new HttpError('A valid resource id is required', 422))
  next()
}
