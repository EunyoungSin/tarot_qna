import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import readingRouter from './routes/reading.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 배포 시에는 이 서버 하나가 API와 빌드된 클라이언트 정적 파일을 함께 서빙한다.
const clientDistPath = path.join(__dirname, '../../client/dist')

const app = express()
const port = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.use('/api', readingRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use(express.static(clientDistPath))
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    next()
    return
  }
  res.sendFile(path.join(clientDistPath, 'index.html'))
})

app.listen(port, () => {
  console.log(`Tarot API server listening on http://localhost:${port}`)
  if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️  GROQ_API_KEY is not set — /api/reading will fail until it is configured.')
  }
})
