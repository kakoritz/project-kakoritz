import Anthropic from '@anthropic-ai/sdk'
import express from 'express'
import cors from 'cors'

const app = express()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

app.use(cors())
app.use(express.json({ limit: '1mb' }))

const SYSTEM = `You are a personal AI assistant embedded in the KAKORITZ home lab dashboard, running on Adam's Synology NAS on the home network. Be helpful, friendly, and conversational. You can help with anything — coding, home lab / server topics, family questions, general knowledge, or just a quick chat. Keep responses reasonably concise unless the question calls for detail.`

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: SYSTEM,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: String(err.message) })}\n\n`)
  } finally {
    res.end()
  }
})

app.get('/health', (_, res) => res.json({ ok: true }))

app.listen(3001, () => console.log('claude-api listening on :3001'))
