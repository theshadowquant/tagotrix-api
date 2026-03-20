import type { FastifyInstance } from 'fastify'
import { prisma } from '../server'

export default async function productRoutes(app: FastifyInstance) {

  // GET all products
  app.get('/products', async (req) => {
    const { cat, search, featured } = req.query as any

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(cat && { category: { slug: cat } }),
        ...(featured && { isFeatured: true }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { category: true },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    })

    return { data: products }
  })

  // GET single product by slug
  app.get('/products/:slug', async (req, reply) => {
    const { slug } = req.params as any

    const product = await prisma.product.findUnique({
      where: { slug, isActive: true },
      include: { category: true },
    })

    if (!product) {
      return reply.code(404).send({ error: 'Product not found' })
    }

    return product
  })

  // GET all categories
  app.get('/categories', async () => {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
    })
  })
}
