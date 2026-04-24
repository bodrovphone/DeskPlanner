/// <reference path="../.astro/types.d.ts" />

// SVG imports with ?url suffix return string URLs (Vite-style)
declare module '*.svg?url' {
  const src: string;
  export default src;
}

// TTF/OTF font imports with ?url suffix — used by @react-pdf/renderer Font.register
declare module '*.ttf?url' {
  const src: string;
  export default src;
}
declare module '*.otf?url' {
  const src: string;
  export default src;
}
