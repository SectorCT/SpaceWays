export interface OrbitData2 {
    [timestamp: string]: number[]; // [x, y, z] coordinates
}

export interface CelestialOrbits {
    [bodyName: string]: OrbitData2;
}