export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in the environment.');
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY.' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: message }] }],
          systemInstruction: {
            parts: [{
              text: "You are the AI assistant for amitraaj.in, a site that gives retail traders clear, no-nonsense reads on NSE market data (FII/DII cash flow, derivative positioning, open interest). Keep answers short, plain-English, and specific to what was asked. You are not a licensed financial advisor and never give buy/sell calls."
            }]
          }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', JSON.stringify(data));
      return res.status(502).json({ error: data?.error?.message || 'The assistant is temporarily unavailable.' });
    }

    const candidate = data.candidates?.[0];
    const reply = candidate?.content?.parts?.map((p) => p.text).join('') || null;

    if (!reply) {
      console.error('Gemini returned no usable reply:', JSON.stringify(data));
      const blockReason = data.promptFeedback?.blockReason;
      return res.status(200).json({
        reply: blockReason
          ? "I can't help with that request — could you rephrase it?"
          : "Sorry, I didn't catch that. Could you try asking again?"
      });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler crashed:', err);
    return res.status(500).json({ error: err.message });
  }
}
