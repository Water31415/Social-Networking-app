// The JWT expiry is authoritative; a saved date must never extend the session.
export const getSessionExpiration = (token, savedExpiration) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(window.atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
    if (!Number.isFinite(exp) || exp <= 0) return null
    const tokenExpiry = exp * 1000
    const savedExpiry = savedExpiration ? new Date(savedExpiration).getTime() : tokenExpiry
    if (!Number.isFinite(savedExpiry)) return null
    return new Date(Math.min(tokenExpiry, savedExpiry))
  } catch {
    return null
  }
}

export const notifySessionRejected = (response, headers = {}, data = {}) => {
  const authorization = new Headers(headers).get('Authorization')
  // A failed login must not reload a guest's page.
  if (authorization && /^Bearer\s+(?!null$|undefined$)/i.test(authorization)
      && (response.status === 401 || (response.status === 403 && data.message === 'Authentication failed'))) {
    window.dispatchEvent(new window.Event('snapit:session-expired'))
  }
}
