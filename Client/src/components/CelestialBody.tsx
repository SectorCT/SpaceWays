import { useRef, useEffect, useState } from 'react'
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
    const [texture, setTexture] = useState<THREE.Texture | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    
    useEffect(() => {
        if (body.texture) {
            console.log('Starting texture load for:', body.name)
            setIsLoading(true)
            const loader = new THREE.TextureLoader()
            
            // Create a new texture instance
            const newTexture = new THREE.Texture()
            newTexture.generateMipmaps = true
            newTexture.minFilter = THREE.LinearMipmapLinearFilter
            newTexture.magFilter = THREE.LinearFilter
            
            loader.load(
                body.texture,
                (loadedTexture) => {
                    console.log('Texture loaded successfully for:', body.name)
                    loadedTexture.needsUpdate = true
                    loadedTexture.generateMipmaps = true
                    loadedTexture.minFilter = THREE.LinearMipmapLinearFilter
                    loadedTexture.magFilter = THREE.LinearFilter
                    setTexture(loadedTexture)
                    setIsLoading(false)
                },
                (progress) => {
                    console.log(`Loading progress for ${body.name}:`, (progress.loaded / progress.total * 100) + '%')
                },
                (error) => {
                    console.error('Error loading texture for', body.name, ':', error)
                    setIsLoading(false)
                }
            )
        } else {
            setIsLoading(false)
        }
    }, [body.texture, body.name])
    
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

    if (isLoading) {
        return null // Don't render anything while loading
    }

    return (
        <Sphere
            ref={meshRef}
            args={[body.radius * body.scale, 32, 32]}
            position={[initialPosition.x, initialPosition.y, initialPosition.z]}
        >
            <meshBasicMaterial
                map={texture || undefined}
                color={texture ? undefined : body.color}
            />
        </Sphere>
    )
} 