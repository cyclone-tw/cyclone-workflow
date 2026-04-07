/**
 * Generate homepage images using Gemini API
 * Run: bun run scripts/generate-images.ts
 */

const API_KEY = process.env.GEMINI_API_KEY || 'REDACTED_GEMINI_KEY';
const MODEL = 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

interface ImageRequest {
  name: string;
  prompt: string;
  filename: string;
}

const images: ImageRequest[] = [
  {
    name: 'Hero Background',
    prompt: `Create a stunning wide banner illustration for a tech website hero section.
Theme: Dark cyberpunk, AI workflow automation.
Style: Abstract, futuristic, minimal, high-end tech aesthetic.
Elements: Glowing neural network nodes connected by light streams, floating holographic UI panels, subtle circuit board patterns, gradient from deep purple (#6C63FF) to dark red (#E94560).
Background: Very dark navy (#0A0A1A).
Mood: Professional, innovative, inspiring.
Aspect ratio: Wide banner (3:1).
No text, no people, no faces. Pure abstract tech art.`,
    filename: 'hero-bg.png',
  },
  {
    name: 'AI Workflow',
    prompt: `Create a minimalist icon illustration for "AI Workflow Design".
Style: Flat design, dark background (#12122A), glowing neon accents.
Elements: Abstract flowchart with glowing nodes connected by light lines, robot/AI icon in center, automation arrows.
Colors: Primary purple (#6C63FF), neon green (#00F5A0) accents.
Size: Square, icon-style. Clean and professional.
No text, no people.`,
    filename: 'feature-workflow.png',
  },
  {
    name: 'Voice Input',
    prompt: `Create a minimalist icon illustration for "Voice Input System".
Style: Flat design, dark background (#12122A), glowing neon accents.
Elements: Abstract microphone with sound waves emanating outward, speech-to-text visualization, waveform patterns.
Colors: Cyan (#00D9FF) and purple (#6C63FF) gradients.
Size: Square, icon-style. Clean and professional.
No text, no people.`,
    filename: 'feature-voice.png',
  },
  {
    name: 'Agent Memory',
    prompt: `Create a minimalist icon illustration for "AI Agent Memory System".
Style: Flat design, dark background (#12122A), glowing neon accents.
Elements: Abstract brain with neural connections, memory layers visualization, data nodes storing information, holographic database.
Colors: Neon green (#00F5A0) and purple (#6C63FF).
Size: Square, icon-style. Clean and professional.
No text, no people.`,
    filename: 'feature-memory.png',
  },
  {
    name: 'Wish Tree',
    prompt: `Create a minimalist icon illustration for "Wish Tree - Community Collaboration".
Style: Flat design, dark background (#12122A), glowing neon accents.
Elements: Abstract glowing tree with light orbs as leaves, connecting hands/nodes representing collaboration, star-like wishes floating around.
Colors: Pink/red (#E94560) and warm yellow (#FFD93D) accents on dark background.
Size: Square, icon-style. Clean and professional.
No text, no people.`,
    filename: 'feature-wishtree.png',
  },
];

async function generateImage(req: ImageRequest): Promise<void> {
  console.log(`Generating: ${req.name}...`);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: req.prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed ${req.name}: ${res.status} ${err}`);
    return;
  }

  const data = await res.json() as any;
  const candidates = data.candidates || [];

  for (const candidate of candidates) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        const path = `public/images/${req.filename}`;
        await Bun.write(path, buffer);
        console.log(`  Saved: ${path} (${(buffer.length / 1024).toFixed(1)} KB)`);
        return;
      }
    }
  }

  console.error(`  No image data in response for ${req.name}`);
}

async function main() {
  await Bun.write('public/images/.gitkeep', '');

  // Generate images sequentially to avoid rate limits
  for (const img of images) {
    await generateImage(img);
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('\nDone! Images saved to public/images/');
}

main();
