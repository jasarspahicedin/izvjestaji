// Simple Resend (https://resend.com) client for sending a file attachment.
// Usage: set VITE_RESEND_API_KEY and optionally VITE_RESEND_TO in your .env file.
// NOTE: Exposing API keys in frontend is insecure for production. Prefer a server-side function.
export async function sendFileWithResend({ apiKey, from, to, subject, html = '', file }) {
  if (!apiKey) throw new Error('Missing Resend API key')
  if (!to) throw new Error('Missing recipient')
  if (!file) throw new Error('Missing file')

  // Convert file blob to base64
  const data = await file.arrayBuffer()
  const uint8 = new Uint8Array(data)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + chunkSize)))
  }
  const base64 = btoa(binary)

  const payload = {
    from,
    to: [to],
    subject,
    html,
    attachments: [
      {
        type: file.type || 'application/octet-stream',
        name: file.name || 'attachment',
        data: base64,
      },
    ],
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend error: ${res.status} ${text}`)
  }
  return res.json()
}
