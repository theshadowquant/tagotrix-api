import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

import productRoutes from './routes/products'
import enquiryRoutes from './routes/enquiries'
import authRoutes from './routes/auth'

// ── PRISMA CLIENT ─────────────────────────────────────────
// This connects to your Neon database
export const prisma = new PrismaClient()

// ── CREATE FASTIFY APP ────────────────────────────────────
const app = Fastify({ logger: true })

// Add authenticate decorator for protected routes
app.decorate('authenticate', async function (req: any, reply: any) {
  try {
    await req.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

async function start() {

  // ── CORS ─────────────────────────────────────────────────
  // Only allow requests from your website
  await app.register(cors, {
    origin: [
      'https://tagotrix.com',
      'https://www.tagotrix.com',
      'http://localhost:3000', // for local development
    ],
    credentials: true,
  })

  // ── JWT ───────────────────────────────────────────────────
  // For admin login authentication
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'changeme-use-a-long-random-string',
  })

  // ── RATE LIMITING ─────────────────────────────────────────
  // Prevents spam and abuse
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // ── HEALTH CHECK ─────────────────────────────────────────
  // Railway uses this to check if your server is running
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'tagotrix-api',
  }))

  // ── ROUTES ───────────────────────────────────────────────
  await app.register(productRoutes, { prefix: '/api/v1' })
  await app.register(enquiryRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes,    { prefix: '/api/v1' })

  // ── START SERVER ─────────────────────────────────────────
  const port = Number(process.env.PORT) || 3001
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`✅ Tagotrix API running on port ${port}`)
}

// Start and handle errors
start().catch((err) => {
  console.error('❌ Server failed to start:', err)
  process.exit(1)
})
