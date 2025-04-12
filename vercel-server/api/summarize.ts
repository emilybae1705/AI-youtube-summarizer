// api/summarize.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const PROMPT_TEMPLATE = `Please summarize the following YouTube video titled: "{{title}}" transcript into 6 bullet points...`;

type VideoCategory = {
  keywords: string[];
  temperature: number;
};

const CATEGORY_MAPPING: VideoCategory[] = [
  { keywords: ["tutorial", "how to", "setup", "walkthrough"], temperature: 0.4 },
  { keywords: ["lecture", "science", "math", "history", "education"], temperature: 0.3 },
  { keywords: ["vlog", "day in my life", "lifestyle", "my day"], temperature: 0.8 },
  { keywords: ["comedy", "funny", "skit", "standup"], temperature: 1.1 },
  { keywords: ["review", "unboxing", "product", "tech", "haul"], temperature: 0.6 },
  { keywords: ["podcast", "discussion", "interview"], temperature: 0.7 },
  { keywords: ["story", "animation", "narrative"], temperature: 1.0 },
];

function getTempByVideo(title: string): number {
  const video_title = title.toLowerCase();
  const default_temp = 0.7;

  for (const category of CATEGORY_MAPPING) {
    if (category.keywords.some(kw => video_title.includes(kw))) {
      return category.temperature;
    }
  }
  return default_temp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { title, transcript } = req.body;

  const prompt = PROMPT_TEMPLATE.replace("{{title}}", title);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an assistant that summarizes YouTube transcripts." },
          { role: "user", content: `${prompt}\n\n${transcript}` },
        ],
        temperature: getTempByVideo(title),
      }),
    });

    const data = await response.json();
    res.status(200).json({ summary: data.choices[0].message.content });
  } catch (err) {
    console.error("Error summarizing:", err);
    res.status(500).json({ error: "Failed to summarize video" });
  }
}