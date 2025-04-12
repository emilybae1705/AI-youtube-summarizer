export interface CaptionTrack {
    language: string;
    baseUrl: string;
}

export interface TranscriptItem {
    start: string;
    duration: string;
    text: string;
}

// extracts available caption tracks from the YouTube video page's HTML
// returns a sorted list of captions with their respective URLs
async function getCaptionTracks(videoId: string): Promise<CaptionTrack[]> {

    try {
        
        // Fetch the entire YouTube video page HTML by videoId
        const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        if (!videoPageResponse.ok) {
            console.error('Failed to fetch caption tracks');
            throw new Error("No captions available");
        }
        // Read the body of the response as a string
        const videoPageHtml = await videoPageResponse.text();
        
        // splits the videoPageHtml string into an array at each occurrence of the substring `"captions":`
        const splitHtml = videoPageHtml.split('"captions":');
        
        // Length must at least be two for captions to exist, the splitHTML at this point will be ['<!DOCTYPE html>....' , '{\"playerCaptionsTracklistRenderer\"...}']
        if (splitHtml.length < 2) {
            console.log("No captions available");
            throw new Error("No captions available");
        }

        const captionsJson = JSON.parse(splitHtml[1].split(',"videoDetails')[0].replace('\n', ''));

        // Map through the available caption tracks and return an array of CaptionTrack objects
        // Example captionTracks after map to list - [ {language: 'English' , baseURL: 'www.youtube.com/...'}, {language: 'Spanish' , baseURL: 'www.youtube.com/...'} ]
        const captionTracks: CaptionTrack[] = captionsJson.playerCaptionsTracklistRenderer.captionTracks.map((track: any) => ({
            language: track.name.simpleText,
            baseUrl: track.baseUrl
        }));
        return captionTracks

    } catch (error) {
        console.error('Error fetching caption tracks:', error);
        throw new Error(`No captions available: ${error.message}`)
    }
}


function sortCaptionsByLanguage(captionTracks: CaptionTrack[], desiredLanguage: string): CaptionTrack[] {
    // Sorting logic: Desired Language captions should appear first, followed by other languages
    captionTracks.sort((x: CaptionTrack, y: CaptionTrack) => {
        if (x.language === desiredLanguage && y.language !== desiredLanguage) return -1; // Desired Language comes first
        if (y.language === desiredLanguage && x.language !== desiredLanguage) return 1;
        if (x.language.includes(desiredLanguage) && !y.language.includes(desiredLanguage)) return -1; // Any Desired Language variant comes first e.g. "English (auto-generated)"
        if (y.language.includes(desiredLanguage) && !x.language.includes(desiredLanguage)) return 1;
        return 0; // Keep the original order for non-Desired-Language tracks
    });
    return captionTracks;
}

// captions stored in XML format
// fetch the XML transcript from a provided URL and process it into a list of TranscriptItem (text, start time in video, duration of text)
async function getXMLTranscript(link: string): Promise<TranscriptItem[]> {
    try {
        const transcriptPageResponse = await fetch(link);
        if (!transcriptPageResponse.ok) {
            console.error('Failed to fetch transcript page');
            throw new Error(`Error fetching XML transcript`)
        }
        const transcriptPageXml = await transcriptPageResponse.text(); // Retrieve the transcript XML as a string. 

        // Parse the XML string response to prepare for extracting text and timestamps
        const parser = new DOMParser();
        // Converts raw XML string into a DOM-like XMLDocument object
        const xmlDoc = parser.parseFromString(transcriptPageXml, "text/xml"); 
        const textNodes = xmlDoc.getElementsByTagName("text"); 

        // Convert each <text> XML node into TranscriptItem object
        const transcript: TranscriptItem[] = Array.from(textNodes).map((node: Element) => ({
            start: node.getAttribute("start") || "0", // Fallback to "0" if "start" attribute is missing
            duration: node.getAttribute("dur") || "0", // Fallback to "0" if "duration" attribute is missing
            text: node.textContent?.replace(/\n/g, " ").trim() || "" // Fallback to an empty string if text content is undefined
        }));

        return transcript;
    }
    catch (error) {
        console.error('Error fetching XML transcript:', error);
        throw new Error(`Error fetching XML transcript: ${error.message}`)
    }
}


function convertToString(transcriptItems: TranscriptItem[]): string {
    return transcriptItems
        .map(item => `Start: ${item.start}, Duration: ${item.duration}, Text: ${item.text}`)
        .join('\n');
}


function convertSecondsToMinutes(seconds: string): string {
    const totalSeconds = parseFloat(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export async function getYouTubeTranscript(videoId: string): Promise<string | null> {
    try {

        const captionTracks = await getCaptionTracks(videoId);
        const sortedCaptionTracks = sortCaptionsByLanguage(captionTracks, 'English');
        const firstCaptionTrack = sortedCaptionTracks[0];

        const XMLTranscript = await getXMLTranscript(firstCaptionTrack.baseUrl);
        // Unit Conversion to make summary generation cleaner
        const formattedTranscript = XMLTranscript.map(item => ({
            ...item,
            start: convertSecondsToMinutes(item.start),
            duration: convertSecondsToMinutes(item.duration),
        }));
        // Convert Transcript Item list into string to pass it into LLM
        return convertToString(formattedTranscript);
    } catch (error) {
        console.error('Failed to fetch transcript:', error);
        return null;
    }
}

// Fetch title using regex
export async function getVideoTitle(videoId: string): Promise<string> {
    try {
        const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const videoPageHtml = await videoPageResponse.text();

        const titleMatch = videoPageHtml.match(/<title>(.*?)<\/title>/);
        if (!titleMatch) {
            throw new Error(`Title not found for videoId: ${videoId}`);
        }
        // Remove " - YouTube" suffix and trimming any extra whitespace
        return titleMatch[1].replace(" - YouTube", "").trim()
    } catch (error) {
        console.error('Error fetching video title:', error);
        throw new Error(`Error fetching video title: ${error.message}`)
    }
}