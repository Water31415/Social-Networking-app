const backendBaseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000/'

export const backendUrl = path => `${backendBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
export const backendImageUrl = imagePath =>
  /^https?:\/\//i.test(imagePath) ? imagePath : backendUrl(imagePath || '')
