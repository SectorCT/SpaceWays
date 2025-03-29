import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import { CelestialBody } from '../types/CelestialBody'
import { getOrbitalPosition } from '../getPositionFromOrbit'
import * as THREE from 'three'
import { SelectionIndicator } from './SelectionIndicator'

interface CelestialBodyProps {
    body: CelestialBody;
    currentTime: Date;
    isSelected: boolean;
    onSelect: (body: CelestialBody) => void;
}

export function CelestialBodyComponent({ 
    body, 
    currentTime, 
    isSelected, 
    onSelect 
}: CelestialBodyProps) {
    const meshRef = useRef<THREE.Mesh>(null)
    const [texture, setTexture] = useState<THREE.Texture | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const lastTimeRef = useRef(currentTime)
    const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3())
    const materialRef = useRef<THREE.MeshBasicMaterial>(null)
    
    // Update material color when selection changes
    useEffect(() => {
        if (meshRef.current && meshRef.current.material) {
            const material = meshRef.current.material as THREE.MeshBasicMaterial;
            if (isSelected) {
                material.color.set(0x88ccff);
            } else if (texture) {
                material.color.set(0xffffff);
            } else {
                material.color.set(body.color);
            }
        }
    }, [isSelected, texture, body.color]);
    
    useEffect(() => {
        if (body.texture) {
            setIsLoading(true)
            const loader = new THREE.TextureLoader()
            
            loader.load(
                body.texture,
                (loadedTexture) => {
                    loadedTexture.needsUpdate = true
                    setTexture(loadedTexture)
                    setIsLoading(false)
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
    
    useFrame(() => {
        if (meshRef.current) {
            // Update position based on simulation time
            const newPosition = getOrbitalPosition(body, currentTime)
            meshRef.current.position.set(newPosition.x, newPosition.y, newPosition.z)
            setPosition(new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z))
            
            // Calculate rotation based on time difference
            const timeDiff = (currentTime.getTime() - lastTimeRef.current.getTime()) / 1000 // Convert to seconds
            const rotationSpeed = (2 * Math.PI) / body.orbit.orbital_period
            meshRef.current.rotation.y += rotationSpeed * timeDiff
            
            lastTimeRef.current = currentTime
        }
    })

    // Initial position
    const initialPosition = getOrbitalPosition(body, currentTime)
    const handleClick = (event: any) => {
        event.stopPropagation();
        onSelect(body);
    };

    if (isLoading) {
        console.log(`${body.name} is still loading, not rendering`);
        return null // Don't render anything while loading
    }

    // Define the material color based on selection state and texture
    const materialColor = isSelected 
        ? new THREE.Color(0x88ccff) 
        : (texture ? new THREE.Color(0xffffff) : new THREE.Color(body.color));

    return (
        <>
            <Sphere
                ref={meshRef}
                args={[body.radius * body.scale, 32, 32]}
                position={[initialPosition.x, initialPosition.y, initialPosition.z]}
                onClick={handleClick}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'auto'}
            >
                <meshBasicMaterial
                    ref={materialRef}
                    map={texture || undefined}
                    color={materialColor}
                />
            </Sphere>

            {isSelected && (
                <SelectionIndicator 
                    position={position} 
                    radius={body.radius * body.scale} 
                />
            )}
        </>
    )
} 