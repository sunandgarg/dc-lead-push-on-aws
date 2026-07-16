import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Clear the chunk-reload guard once the app boots successfully.
sessionStorage.removeItem("app:chunk-reload");

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
