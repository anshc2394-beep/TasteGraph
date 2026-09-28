import StackSpread, { type StackSpreadCard } from "./ui/stack-spread";
import { demoArtwork, type DemoArtworkId } from "@/lib/demo-artwork";

const composition: { id: DemoArtworkId; x: number; y: number; rotation: number; mobile: { x: number; y: number } }[] = [
  { id: "escape", x: -29, y: -32, rotation: -12, mobile: { x: -29, y: -30 } },
  { id: "diary", x: 29, y: -30, rotation: 10, mobile: { x: 0, y: -33 } },
  { id: "ye", x: -38, y: 2, rotation: -6, mobile: { x: 29, y: -28 } },
  { id: "graduation", x: 38, y: 8, rotation: 8, mobile: { x: -29, y: 29 } },
  { id: "mama", x: -26, y: 33, rotation: -9, mobile: { x: 0, y: 33 } },
  { id: "doom", x: 27, y: 34, rotation: 6, mobile: { x: 29, y: 28 } },
  { id: "blue", x: 1, y: -35, rotation: 4, mobile: { x: 0, y: 0 } },
  { id: "noodles", x: 3, y: 36, rotation: -4, mobile: { x: 0, y: 0 } },
];
const cards: StackSpreadCard[] = composition.map(({ id, ...position }) => ({ id, ...demoArtwork[id], ...position }));

export function MusicStackSpread() {
  return <StackSpread cards={cards}>
    <h2>SEE WHAT<br />YOU <em>SOUND</em> LIKE.</h2>
    <p>Your listening history is more than a list of songs. TasteGraph turns it into something you can see.</p>
  </StackSpread>;
}
