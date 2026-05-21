const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
app.use(cors())

const PHOTOS_DIR = process.env.PHOTOS_DIR || '/photos'
const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i

function getImages(dir, base = '') {
  let results = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && IMAGE_EXTS.test(entry.name)) {
        results.push(path.join(base, entry.name))
      } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
        results = results.concat(getImages(path.join(dir, entry.name), path.join(base, entry.name)))
      }
    }
  } catch {}
  return results
}

app.get('/api/photos', (req, res) => {
  const images = getImages(PHOTOS_DIR)
  res.json(images)
})

app.use('/photos', express.static(PHOTOS_DIR))

app.get('/health', (_, res) => res.json({ status: 'ok', dir: PHOTOS_DIR }))

app.listen(3001, () => console.log(`Photo API running — serving ${PHOTOS_DIR}`))
