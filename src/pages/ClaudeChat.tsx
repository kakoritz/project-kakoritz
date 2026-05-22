import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import {
  Box, Typography, IconButton, TextField, CircularProgress,
  Avatar, Tooltip,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import PersonIcon from '@mui/icons-material/Person'

const CLAUDE_API = 'http://192.168.1.251:8587'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: Message = {
  role: 'assistant',
  content: "Hey! I'm your personal Claude assistant running on the KAKORITZ dashboard. Ask me anything — coding help, home lab questions, or just chat.",
}

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 1,
        mb: 1.5,
      }}
    >
      <Avatar
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          bgcolor: isUser ? 'primary.main' : 'rgba(99,102,241,0.15)',
          border: isUser ? 'none' : '1px solid rgba(99,102,241,0.3)',
        }}
      >
        {isUser
          ? <PersonIcon sx={{ fontSize: 16 }} />
          : <SmartToyIcon sx={{ fontSize: 16, color: 'primary.main' }} />
        }
      </Avatar>

      <Box
        sx={{
          maxWidth: '80%',
          px: 2,
          py: 1.25,
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          bgcolor: isUser
            ? 'primary.main'
            : 'background.paper',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.07)',
          color: isUser ? 'white' : 'text.primary',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.6,
            fontSize: { xs: '0.875rem', sm: '0.9rem' },
          }}
        >
          {msg.content}
        </Typography>
      </Box>
    </Box>
  )
}

function TypingDots() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 1.5 }}>
      <Avatar
        sx={{
          width: 30, height: 30, flexShrink: 0,
          bgcolor: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)',
        }}
      >
        <SmartToyIcon sx={{ fontSize: 16, color: 'primary.main' }} />
      </Avatar>
      <Box
        sx={{
          px: 2, py: 1.5,
          borderRadius: '18px 18px 18px 4px',
          bgcolor: 'background.paper',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', gap: 0.6, alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6, height: 6, borderRadius: '50%',
              bgcolor: 'primary.main', opacity: 0.7,
              animation: 'bounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
              '@keyframes bounce': {
                '0%, 80%, 100%': { transform: 'translateY(0)' },
                '40%': { transform: 'translateY(-6px)' },
              },
            }}
          />
        ))}
      </Box>
    </Box>
  )
}

export default function ClaudeChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const send = async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setStreaming(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages([...history, assistantMsg])

    try {
      const res = await fetch(`${CLAUDE_API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const { text, error } = JSON.parse(payload)
            if (error) throw new Error(error)
            if (text) {
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + text },
                ]
              })
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Could not reach claude-api on port 8587.'}` },
      ])
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const clear = () => {
    setMessages([WELCOME])
    setInput('')
    inputRef.current?.focus()
  }

  const showTyping = streaming && messages[messages.length - 1]?.content === ''

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'calc(100vh - 130px)', sm: 'calc(100vh - 112px)' },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          mb: 2, flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 0.75, borderRadius: 1.5,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.1) 100%)',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <SmartToyIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Claude AI
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Powered by claude-sonnet-4-6
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Clear conversation">
          <IconButton
            onClick={clear}
            size="small"
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 0.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2,
          },
        }}
      >
        {messages.map((msg, i) => (
          <Bubble key={i} msg={msg} />
        ))}
        {showTyping && <TypingDots />}
        <div ref={bottomRef} />
      </Box>

      {/* Input bar */}
      <Box
        sx={{
          display: 'flex', gap: 1, alignItems: 'flex-end',
          pt: 1.5, flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={4}
          placeholder="Message Claude..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={streaming}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: 'background.paper',
              fontSize: { xs: '0.95rem', sm: '0.875rem' },
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.4)' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
        <IconButton
          onClick={send}
          disabled={!input.trim() || streaming}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            width: 42, height: 42, flexShrink: 0,
            borderRadius: 2.5,
            '&:hover': { bgcolor: '#4f52d9' },
            '&.Mui-disabled': { bgcolor: 'rgba(99,102,241,0.2)', color: 'rgba(255,255,255,0.3)' },
          }}
        >
          {streaming
            ? <CircularProgress size={18} sx={{ color: 'rgba(255,255,255,0.5)' }} />
            : <SendIcon sx={{ fontSize: 18 }} />
          }
        </IconButton>
      </Box>
    </Box>
  )
}
