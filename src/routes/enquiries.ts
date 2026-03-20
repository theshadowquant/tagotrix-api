import type { FastifyInstance } from 'fastify'
import { prisma } from '../server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function enquiryRoutes(app: FastifyInstance) {

  // ── POST /enquiries ───────────────────────────────────────
  // Called when someone submits the enquiry form on the website
  app.post('/enquiries', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
  }, async (req, reply) => {

    const { name, email, phone, company, message } = req.body as any

    // Basic validation
    if (!name || !email || !phone) {
      return reply.code(400).send({
        error: 'Name, email and phone are required',
      })
    }

    // Save enquiry to database
    const enquiry = await prisma.enquiry.create({
      data: {
        name,
        email,
        phone,
        company: company || '',
        message: message || '',
        status: 'new',
        source: 'web',
      },
    })

    // Send emails in background — does not slow down the response
    sendEmails({ name, email, phone, company, message, id: enquiry.id })

    // Respond immediately to the user
    return reply.code(201).send({
      success: true,
      id: enquiry.id,
      message: 'Enquiry received! We will respond within 24 hours.',
    })
  })

  // ── GET /admin/enquiries ──────────────────────────────────
  // Admin only — view all enquiries
  app.get('/admin/enquiries', {
    onRequest: [(app as any).authenticate],
  }, async () => {
    return prisma.enquiry.findMany({
      orderBy: { createdAt: 'desc' },
    })
  })

  // ── PATCH /admin/enquiries/:id ────────────────────────────
  // Admin only — update enquiry status
  app.patch('/admin/enquiries/:id', {
    onRequest: [(app as any).authenticate],
  }, async (req, reply) => {
    const { id } = req.params as any
    const { status, adminNotes } = req.body as any

    const updated = await prisma.enquiry.update({
      where: { id },
      data: { status, adminNotes },
    })

    return updated
  })
}

// ── EMAIL AUTOMATION ──────────────────────────────────────
// Sends two emails automatically:
// 1. Auto-reply to the customer
// 2. Notification to Shashi (admin)
async function sendEmails({ name, email, phone, company, message, id }: any) {
  const refNumber = id.slice(0, 8).toUpperCase()

  try {

    // 1. Auto-reply to customer
    await resend.emails.send({
      from: 'Tagotrix <enquiries@tagotrix.com>',
      to: email,
      subject: `[Ref: ${refNumber}] We received your enquiry — Tagotrix`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">

          <div style="background: #00c8e0; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #070d18; margin: 0; font-size: 20px;">
              ⚗️ Tagotrix Instrumentation Technologies
            </h1>
          </div>

          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #1e293b; margin-bottom: 16px;">
              Dear <strong>${name}</strong>,
            </p>
            <p style="color: #64748b; line-height: 1.7; margin-bottom: 20px;">
              Thank you for your enquiry! We have received your message and our team will get back to you within <strong>24 hours</strong> with a detailed quotation.
            </p>

            <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; border-left: 4px solid #00c8e0; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.8;">
                <strong>Reference Number:</strong> ${refNumber}<br/>
                <strong>Company:</strong> ${company || 'Not provided'}<br/>
                <strong>Phone:</strong> ${phone}<br/>
                <strong>Message:</strong> ${message || 'No message provided'}
              </p>
            </div>

            <p style="color: #64748b; margin-bottom: 20px;">
              For urgent assistance, please WhatsApp us directly:
            </p>

            <a
              href="https://wa.me/917899908027"
              style="display: inline-block; background: #25D366; color: black; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px;">
              💬 WhatsApp Us Now
            </a>

            <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
              Tagotrix Instrumentation Technologies<br/>
              Jana Jeeva Orchid, Hallehalli Kithiganur, Bangalore – 560036<br/>
              Phone: +91 78999 08027 | Email: shashi@tagotrix.com
            </p>
          </div>

        </div>
      `,
    })

    // 2. Notification email to admin (Shashi)
    await resend.emails.send({
      from: 'Tagotrix System <system@tagotrix.com>',
      to: 'shashi@tagotrix.com',
      subject: `🔔 New Enquiry from ${name} — Ref: ${refNumber}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">

          <h2 style="color: #00c8e0; margin-bottom: 24px;">
            🔔 New Lab Equipment Enquiry
          </h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; color: #64748b; width: 130px; font-weight: 600;">Name</td>
              <td style="padding: 12px; font-weight: 700; color: #1e293b;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; color: #64748b; font-weight: 600;">Email</td>
              <td style="padding: 12px; color: #1e293b;">${email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; color: #64748b; font-weight: 600;">Phone</td>
              <td style="padding: 12px; font-weight: 700; color: #00c8e0; font-size: 16px;">${phone}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; color: #64748b; font-weight: 600;">Company</td>
              <td style="padding: 12px; color: #1e293b;">${company || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 12px; color: #64748b; font-weight: 600;">Message</td>
              <td style="padding: 12px; color: #1e293b;">${message || 'No message'}</td>
            </tr>
          </table>

          <a
            href="https://tagotrix.com/admin"
            style="display: inline-block; background: #00c8e0; color: #070d18; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 800; font-size: 14px;">
            View in Admin Panel →
          </a>

        </div>
      `,
    })

  } catch (err) {
    // Log error but don't crash — enquiry is already saved to database
    console.error('Email sending error:', err)
  }
}
