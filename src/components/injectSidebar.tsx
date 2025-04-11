import { createRoot, Root } from 'react-dom/client';
import { Sidebar } from './Sidebar';

// injects sidebar into the youtube page
let summarizerRoot: Root;
export async function injectSidebar(title: string, transcript: string, videoId: string, parentElement: HTMLElement) {

  // check if sidebar container already exists.
  let summarizer = document.getElementById('yt-summarizer-sidebar-container');

  if (!summarizer) {

    // Create a new div element to serve as the summarizer sidebar container
    // prepend to the passed in parent element
    summarizer = document.createElement('div');
    summarizer.id = 'yt-summarizer-sidebar-container';
    parentElement.prepend(summarizer); // empty div at this point
  }

  if (!summarizerRoot) {
    summarizerRoot = createRoot(summarizer);
  }

  // Update the summarizer container div by rendering the Sidebar component with the passed in video details
  // when content script runs on a new video page, react passes in new video details & renders a new Sidebar component
  summarizerRoot.render(<Sidebar title={title} transcript={transcript} videoId={videoId} />);

}