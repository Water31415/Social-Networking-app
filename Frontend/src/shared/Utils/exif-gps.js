const readExifGps = file => new Promise(resolve => {
  if (!file || !/jpe?g/i.test(file.type)) return resolve(null)
  const reader = new FileReader()
  reader.onerror = () => resolve(null)
  reader.onload = () => {
    try {
      const view = new DataView(reader.result)
      if (view.getUint16(0) !== 0xffd8) return resolve(null)
      let offset = 2
      while (offset + 4 < view.byteLength) {
        const marker = view.getUint16(offset)
        const segmentLength = view.getUint16(offset + 2)
        if (marker === 0xffe1) {
          const exif = offset + 4
          if (view.getUint32(exif) !== 0x45786966) return resolve(null)
          const tiff = exif + 6
          const little = view.getUint16(tiff) === 0x4949
          const u16 = p => view.getUint16(p, little)
          const u32 = p => view.getUint32(p, little)
          const ifd = tiff + u32(tiff + 4)
          let gps = null
          for (let i = 0; i < u16(ifd); i++) {
            const entry = ifd + 2 + i * 12
            if (u16(entry) === 0x8825) gps = tiff + u32(entry + 8)
          }
          if (!gps) return resolve(null)
          const tags = {}
          for (let i = 0; i < u16(gps); i++) { const entry = gps + 2 + i * 12; tags[u16(entry)] = entry }
          const ref = entry => String.fromCharCode(view.getUint8(entry + 8))
          const dms = entry => { const p = tiff + u32(entry + 8); const d = u32(p) / u32(p + 4); const m = u32(p + 8) / u32(p + 12); const s = u32(p + 16) / u32(p + 20); return d + m / 60 + s / 3600 }
          if (!tags[1] || !tags[2] || !tags[3] || !tags[4]) return resolve(null)
          const lat = dms(tags[2]) * (ref(tags[1]) === 'S' ? -1 : 1)
          const lng = dms(tags[4]) * (ref(tags[3]) === 'W' ? -1 : 1)
          return resolve(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null)
        }
        if (segmentLength < 2) break
        offset += 2 + segmentLength
      }
      resolve(null)
    } catch { resolve(null) }
  }
  reader.readAsArrayBuffer(file)
})

export default readExifGps
