import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import readingRouter from './routes/reading.js'

const app = express()
const port = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.use('/api', readingRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(port, () => {
  console.log(`Tarot API server listening on http://localhost:${port}`)
  if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️  GROQ_API_KEY is not set — /api/reading will fail until it is configured.')
  }
})
