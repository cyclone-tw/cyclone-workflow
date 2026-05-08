// Component test setup — only loaded in jsdom env via environmentMatchGlobs.
// Adds @testing-library/jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...).
// Safe in node env: import is no-op when document/window absent (jest-dom internally guards).
import '@testing-library/jest-dom/vitest';
