import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Clear the chunk-reload guard only after the route chunks have had time to
// load. Clearing it immediately at boot can create a reload loop while
// Cloudflare is still serving stale HTML that references deleted chunks.
window.setTimeout(() => {
  sessionStorage.removeItem("app:chunk-reload-at");
}, 60_000);

// Prevent any beforeunload handlers from other libraries
// that might interfere with normal navigation
window.addEventListener('beforeunload', (e) => {
  // Only show warning if there's unsaved data - controlled by individual components
  const hasDraft = sessionStorage.getItem('app:has_unsaved_draft') === 'true';
  if (hasDraft) {
    e.preventDefault();
    e.returnValue = '';
  }
});

createRoot(document.getElementById("root")!).render(<App />);
