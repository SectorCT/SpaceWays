import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import { CelestialBody } from '../types/CelestialBody'
import { getOrbitalPosition } from '../getPositionFromOrbit'
import * as THREE from 'three'

interface CelestialBodyProps {
    body: CelestialBody;
}

export function CelestialBodyComponent({ body }: CelestialBodyProps) {
    const meshRef = useRef<THREE.Mesh>(null)
    
    useFrame((state, delta) => {
        if (meshRef.current) {
            // Update position based on current time
            const position = getOrbitalPosition(body, new Date())
            meshRef.current.position.set(position.x, position.y, position.z)
            
            // Rotate the body based on its orbital period
            const rotationSpeed = (2 * Math.PI) / body.orbit.orbital_period
            meshRef.current.rotation.y += rotationSpeed * delta
        }
    })

    // Initial position
    const initialPosition = getOrbitalPosition(body, new Date(body.orbit.epoch))

    return (
        <Sphere
            ref={meshRef}
            args={[body.radius * body.scale, 32, 32]}
            position={[initialPosition.x, initialPosition.y, initialPosition.z]}
        >
            <meshStandardMaterial
                color={body.color}
                metalness={0.1}
                roughness={0.8}
            />
        </Sphere>
    )
} 