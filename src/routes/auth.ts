import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../server'

export default async function authRoutes(app: FastifyInstance) {

  // POST /auth/login — Admin login
  app.post('/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const { email, password } = req.body as any

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)

    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }
  })

  // GET /auth/me — Get current logged in admin
  app.get('/auth/me', {
    onRequest: [(app as any).authenticate],
  }, async (req) => {
    const payload = (req as any).user
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true },
    })
    return user
  })
}
