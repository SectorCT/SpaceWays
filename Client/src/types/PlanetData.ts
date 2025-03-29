export interface PlanetData {
  name: string;
  radius: number;
  color: string;
  mass: number;
  scale: number;
  texture: string;
  dayLength: number;
  rotationMultiplier?: number; // Optional multiplier to adjust rotation speed visually
}
