export interface Orbit {
    name: string;
    semi_major_axis: number;  // in kilometers
    eccentricity: number;     // dimensionless
    inclination: number;      // in degrees
    raan: number;            // Right Ascension of Ascending Node in degrees
    arg_periapsis: number;   // Argument of Periapsis in degrees
    true_anomaly: number;    // in degrees
    apoapsis: number;        // in kilometers
    periapsis: number;       // in kilometers
    orbital_period: number;  // in seconds
    mean_motion: number;     // in radians per second
    epoch: string;          // ISO 8601 date string
} 