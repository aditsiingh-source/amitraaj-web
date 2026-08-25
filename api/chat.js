export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', 
        messages: [
          {
            role: 'system',
            // --- CUSTOMIZE YOUR AI HERE ---
            content: `You are an expert AI assistant specializing ONLY in [Insert Your Main Topics, e.g., Indian Stock Markets, NSE FII/DII data, and technical analysis]. 
            Strict Rules:
            1. Only answer questions related to these topics.
            2. If the user asks about unrelated topics (like cooking, coding, or general trivia), politely refuse and guide them back to your main topic.
            3. Keep answers clear, concise, and easy to read.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response generated.";
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
