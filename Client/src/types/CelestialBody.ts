import { Orbit } from "./orbit";

export interface CelestialBody {
    name: string;
    radius: number; // km
    mass: number; // kg
    texture?: string; // URL for surface texture
    color?: string; // If no texture
    scale: number; // Scaling factor for rendering

    orbit: Orbit;
}
