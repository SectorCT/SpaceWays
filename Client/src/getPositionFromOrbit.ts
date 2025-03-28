import { CelestialBody } from "./types/CelestialBody";

function getOrbitalPosition(body: CelestialBody, currentTime: Date): { x: number; y: number; z: number } {
    const { orbit } = body;
    const { semi_major_axis: a, eccentricity: e, inclination, raan, arg_periapsis, mean_motion, epoch } = orbit;

    // Convert angles to radians
    const i = inclination * (Math.PI / 180);
    const Ω = raan * (Math.PI / 180);
    const ω = arg_periapsis * (Math.PI / 180);

    // Compute time since epoch
    const epochTime = new Date(epoch).getTime() / 1000; // Convert to seconds
    const currentTimeSec = currentTime.getTime() / 1000;
    const Δt = currentTimeSec - epochTime; // Time difference in seconds

    // Compute current Mean Anomaly (M)
    const M = (mean_motion * Δt) % (2 * Math.PI); // Keep it within 0-2π

    // Solve Kepler's Equation for Eccentric Anomaly (E) using Newton's method
    let E = M;
    for (let j = 0; j < 10; j++) { // Iterate to refine E
        E = M + e * Math.sin(E);
    }

    // Compute True Anomaly (ν)
    const ν = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    // Compute Orbital Radius (r)
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(ν));

    // Compute position in orbital plane
    const x_prime = r * Math.cos(ν);
    const y_prime = r * Math.sin(ν);

    // Rotate to 3D Space using Inclination, RAAN, and Argument of Periapsis
    const cosΩ = Math.cos(Ω), sinΩ = Math.sin(Ω);
    const cosω = Math.cos(ω), sinω = Math.sin(ω);
    const cosi = Math.cos(i), sini = Math.sin(i);

    const x = (cosΩ * cosω - sinΩ * sinω * cosi) * x_prime +
              (-cosΩ * sinω - sinΩ * cosω * cosi) * y_prime;
    const y = (sinΩ * cosω + cosΩ * sinω * cosi) * x_prime +
              (-sinΩ * sinω + cosΩ * cosω * cosi) * y_prime;
    const z = (sinω * sini) * x_prime + (cosω * sini) * y_prime;

    return { x, y, z };
}
