/// <reference path="../.astro/types.d.ts" />

// SVG imports with ?url suffix return string URLs (Vite-style)
declare module '*.svg?url' {
  const src: string;
  export default src;
}
