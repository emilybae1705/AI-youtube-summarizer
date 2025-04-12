import { createRoot } from 'react-dom/client';

export function Popup() {
  return (
    <div>
      <h1>VideoDigest.ai</h1>
      <p>AI Summaries of YouTube videos</p>
      <img src="icon128.png"/>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<Popup />);
}
