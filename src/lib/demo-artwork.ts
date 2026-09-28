/** Explicit assignments keep every prominent landing artwork unique. */
export const demoArtwork = {
  escape: { src: "/covers/the-great-escape.png", alt: "The Great Escape album cover" },
  diary: { src: "/covers/the-diary-of-alicia-keys.png", alt: "The Diary of Alicia Keys album cover" },
  ye: { src: "/covers/ye.png", alt: "ye album cover" },
  graduation: { src: "/covers/graduation.png", alt: "Graduation album cover" },
  blue: { src: "/covers/blue-portrait.png", alt: "Blue portrait album artwork" },
  monochrome: { src: "/covers/monochrome-portrait.png", alt: "Black and white portrait album artwork" },
  mama: { src: "/covers/mamas-gun.png", alt: "Erykah Badu, Mama’s Gun album cover" },
  red: { src: "/covers/red-motion.png", alt: "Artist in motion on a red-lit album cover" },
  noodles: { src: "/covers/noodle-artwork.png", alt: "Illustrated noodle bowl album cover" },
  doom: { src: "/covers/operation-doomsday.png", alt: "MF DOOM, Operation: Doomsday album cover" },
  sky: { src: "/covers/blue-sky-portrait.png", alt: "Album artwork with a figure beneath a blue sky and moon" },
  drive: { src: "/covers/night-drive.png", alt: "Album artwork with yellow sports cars at dusk" },
  rodeo: { src: "/covers/rodeo.png", alt: "Travis Scott, Rodeo album cover" },
} as const;

export type DemoArtworkId = keyof typeof demoArtwork;
export const landingArtwork = {
  hero: ["escape", "diary", "ye", "graduation"],
  structure: ["blue", "monochrome", "mama"],
  time: ["red", "noodles", "doom"],
  finale: ["sky", "drive", "rodeo"],
} as const satisfies Record<string, readonly DemoArtworkId[]>;
