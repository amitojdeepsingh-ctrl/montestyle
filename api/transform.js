export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.REPLICATE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'REPLICATE_API_KEY not set. Add it in Vercel Dashboard → Settings → Environment Variables.' });
  }

  if (req.method === 'POST') {
    const { image, roomType, style, roomTypeCustom } = req.body;
    if (!image) return res.status(400).json({ error: 'Image is required' });

    const roomLabel = roomTypeCustom || roomType || 'room';
    const styleLabel = style || 'Modern';

    const prompt = `Professional high-end ${styleLabel} ${roomLabel} renovation, luxury finishes, interior design photography, natural lighting, beautiful, modern materials, real architectural photography, 8k`;

    try {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
          input: {
            image: image,
            prompt: prompt,
            negative_prompt: 'ugly, outdated, low quality, dark, messy, cluttered, blurry, watermark',
            width: 768,
            height: 768,
            denoising_strength: 0.75,
            num_outputs: 1,
            scheduler: 'K_EULER',
            num_inference_steps: 30,
            guidance_scale: 7.5,
          },
        }),
      });

      const prediction = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: prediction.detail || 'Replicate API error' });
      }

      return res.status(201).json({
        id: prediction.id,
        urls: prediction.urls,
        status: prediction.status,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Prediction ID required' });

    try {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { 'Authorization': `Token ${apiKey}` },
      });
      const prediction = await response.json();
      return res.json({
        id: prediction.id,
        status: prediction.status,
        output: prediction.output,
        error: prediction.error,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
