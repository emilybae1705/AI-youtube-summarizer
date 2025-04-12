const PROMPT_TEMPLATE = `Please summarize the following YouTube video titled: "{{title}}" transcript into 6 bullet points. Each bullet point should correspond to a distinct portion of the video (e.g., minute 0-3, minute 3-5, etc.) and highlight the main topic or focus of that segment. The format (in markdown) for each bullet point (-) should be the (in bold **) approximate timestamps - (in bold **) summary title : (regular font) key points covered in that section in a clear, factual and precise manner (and two line breaks between each section using &nbsp; followed by two spaces). Sections irrelevant to the main topic like sponsorships can be ignored. Use an emoji at the end of each bullet point summary.`

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

// dynamically assigns openAI temperature based on video category
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

export async function getLLMSummary(title: string, transcript: string) {
    const response = await fetch("https://video-digest-ai.vercel.app/api/summarize", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: title,
            transcript: transcript,
        })
    });
      
    const data = await response.json();
    return data.summary;
}