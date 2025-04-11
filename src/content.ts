import { getVideoTitle, getYouTubeTranscript } from './transcript-service';
import { injectSidebar } from './components/injectSidebar';

function isYouTubeVideoPage(): boolean {
  return window.location.hostname === "www.youtube.com" && window.location.search.includes("v=");
}

export function getVideoIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("v"); // query parameter for video ID in YouTube URLs
}

// searches specifically for element 'related' on the DOM to inject content script
async function waitForElement(elementId: string, timeoutMS = 5000): Promise<HTMLElement | null> {

  const immediateCheck = document.getElementById(elementId);
  if (immediateCheck) return immediateCheck;

  // If the element is not found, create a promise that resolves when the element appears
  return new Promise((resolve, reject) => {

    // Select entire body of document to observe mutation changes
    const targetNode = document.body;

    // Set configs for which mutations to observe
    const config = { childList: true, subtree: true };

    const timeoutId = setTimeout(() => reject('Element not found within timeout'), timeoutMS);

    const callback = (mutationList: MutationRecord[], observer: MutationObserver) => {

      // Stop observing once the element is found
      const element = document.getElementById(elementId);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    }

    // Create a MutationObserver instance linked to the callback function
    const observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
  });
}

let previousVideoId: string | null = null;
async function handleVideoChange() {
  try {

    if (!isYouTubeVideoPage()) {
      console.log('Not a YouTube video page. Skipping...');
      return;
    }

    // Ensure user is playing a new video
    // Due to Youtube's SPA structure, no page re-loads, but videoID in URL changes for each new video
    const videoId = getVideoIdFromUrl();
    if (!videoId || videoId === previousVideoId) return;
    previousVideoId = videoId;

    // Using Promise.all() to fetch both transcript and video title concurrently
    const [transcript, videoTitle] = await Promise.all([
      getYouTubeTranscript(videoId),
      getVideoTitle(videoId),
    ]);

    if (transcript && videoTitle) {
      const element = await waitForElement('related');
      if (element) {
        console.log('Injecting sidebar...');
        injectSidebar(videoTitle, transcript, videoId, element);
      }
    }
  } catch (error) {
    console.error('Error in YouTube summarizer:', error);
  }
}

// continuously monitors DOM for any changes to detect navigation events
function observeForVideoChanges() {
  const targetNode = document.body;
  const config = { childList: true, subtree: true };
  const observer = new MutationObserver(handleVideoChange);
  observer.observe(targetNode, config);
}

observeForVideoChanges();
