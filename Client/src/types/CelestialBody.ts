import { OrbitData2 } from "./Orbit2";

export interface CelestialBody {
    name: string;
    orbit: OrbitData2;
    radius: number;        // in kilometers
    color: string;         // hex color or named color
    texture?: string;      // optional texture URL
    mass: number;          // kg
    scale: number;          // Scaling factor for rendering
    dayLength: number;      // in minutes
}
