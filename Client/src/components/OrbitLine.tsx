import { useRef } from 'react';
import { Orbit } from '../types/orbit';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface OrbitLineProps {
    orbit: Orbit;
    color?: string;
}

export function OrbitLine({ orbit, color = '#ffffff' }: OrbitLineProps) {
    const points = useRef<THREE.Vector3[]>([]);

    // Generate points for the orbit
    const generateOrbitPoints = () => {
        const { semi_major_axis: a, eccentricity: e, inclination, raan, arg_periapsis } = orbit;
        
        // Convert angles to radians
        const i = inclination * (Math.PI / 180);
        const Ω = raan * (Math.PI / 180);
        const ω = arg_periapsis * (Math.PI / 180);

        // Generate 200 points for a smooth orbit
        for (let angle = 0; angle <= 2 * Math.PI; angle += (2 * Math.PI) / 200) {
            // Calculate radius at this angle
            const r = (a * (1 - e * e)) / (1 + e * Math.cos(angle));

            // Calculate position in orbital plane
            const x_prime = r * Math.cos(angle);
            const y_prime = r * Math.sin(angle);

            // Rotate to 3D Space using Inclination, RAAN, and Argument of Periapsis
            const cosΩ = Math.cos(Ω), sinΩ = Math.sin(Ω);
            const cosω = Math.cos(ω), sinω = Math.sin(ω);
            const cosi = Math.cos(i), sini = Math.sin(i);

            const x = (cosΩ * cosω - sinΩ * sinω * cosi) * x_prime +
                     (-cosΩ * sinω - sinΩ * cosω * cosi) * y_prime;
            const y = (sinΩ * cosω + cosΩ * sinω * cosi) * x_prime +
                     (-sinΩ * sinω + cosΩ * cosω * cosi) * y_prime;
            const z = (sinω * sini) * x_prime + (cosω * sini) * y_prime;

            points.current.push(new THREE.Vector3(x, y, z));
        }
    };

    // Generate points when component mounts
    generateOrbitPoints();

    return (
        <Line
            points={points.current}
            color={color}
            lineWidth={1}
            dashed={false}
        />
    );
} 