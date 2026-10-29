import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

/** Caption font per language (spec 3.6). Files live in assets/fonts (the Remotion public dir). */
export const CAPTION_FONTS: Record<string, { family: string; file: string }> = {
  default: { family: 'IM Fell English', file: 'fonts/im-fell-english-latin-400-normal.woff2' },
  // Phase 7: 'hi-IN': { family: 'Tiro Devanagari Hindi', file: 'fonts/tiro-devanagari-hindi-....woff2' },
};

export const captionFont = (lang: string) => CAPTION_FONTS[lang] ?? CAPTION_FONTS.default;

const loaded = new Map<string, Promise<void>>();

const loadFont = (family: string, file: string) => {
  let pr = loaded.get(family);
  if (!pr) {
    const face = new FontFace(family, `url(${staticFile(file)}) format('woff2')`);
    pr = face.load().then((f) => {
      document.fonts.add(f);
    });
    loaded.set(family, pr);
  }
  return pr;
};

/** Returns true once the caption font is ready; holds the render (delayRender) until then. */
export const useCaptionFont = (lang: string) => {
  const { family, file } = captionFont(lang);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender(`Loading font ${family}`));
  useEffect(() => {
    loadFont(family, file)
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [family, file, handle]);
  return { ready, family };
};
