import { Orbit } from "./orbit";

export interface CelestialBody {
    name: string;
    orbit: Orbit;
    radius: number;        // in kilometers
    color: string;         // hex color or named color
    texture?: string;      // optional texture URL
    mass: number;          // kg
    scale: number;          // Scaling factor for rendering
}
