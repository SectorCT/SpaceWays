import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import { CelestialBody } from '../types/CelestialBody'
import { getPositionFromOrbit2 } from '../getPositionFromOrbit'
import * as THREE from 'three'
import { SelectionIndicator } from './SelectionIndicator'

interface CelestialBodyProps {
    body: CelestialBody;
    currentTime: Date;
    isSelected: boolean;
    onSelect: (body: CelestialBody) => void;
    simulationStartTime: Date;
    onPositionUpdate?: (position: THREE.Vector3) => void;
}

export function CelestialBodyComponent({ 
    body, 
    currentTime, 
    isSelected, 
    onSelect,
    simulationStartTime,
    onPositionUpdate
}: CelestialBodyProps) {
    const meshRef = useRef<THREE.Mesh>(null)
    const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
    const [material, setMaterial] = useState<THREE.MeshBasicMaterial | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const lastTimeRef = useRef<Date>(currentTime)

    // Load texture if provided
    useEffect(() => {
        if (body.texture) {
            console.log(`Loading texture for ${body.name} from: ${body.texture}`);
            const textureLoader = new THREE.TextureLoader()
            textureLoader.load(
                body.texture,
                (loadedTexture) => {
                    console.log(`Successfully loaded texture for ${body.name}`);
                    const newMaterial = new THREE.MeshBasicMaterial({
                        map: loadedTexture,
                    });
                    setMaterial(newMaterial);
                    setIsLoading(false);
                    setLoadError(null);
                },
                (progress) => {
                    console.log(`Loading progress for ${body.name}: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
                },
                (error:any) => {
                    console.error(`Error loading texture for ${body.name}:`, error);
                    // Create a fallback material with the body's color
                    const fallbackMaterial = new THREE.MeshBasicMaterial({
                        color: new THREE.Color(body.color)
                    });
                    setMaterial(fallbackMaterial);
                    setIsLoading(false);
                    setLoadError(error.message);
                }
            );
        } else {
            console.log(`No texture provided for ${body.name}`);
            const defaultMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(body.color)
            });
            setMaterial(defaultMaterial);
            setIsLoading(false);
        }
    }, [body.texture, body.name, isSelected, body.color]);

    // Update material color when selection changes
    useEffect(() => {
        if (material) {
            material.color.setHex(isSelected ? 0x88ccff : (body.texture ? 0xffffff : new THREE.Color(body.color).getHex()));
        }
    }, [isSelected, material, body.texture, body.color]);

    useFrame(() => {
        if (meshRef.current) {
            // Update position based on simulation time
            const newPosition = getPositionFromOrbit2(body.orbit, currentTime.getTime(), simulationStartTime.getTime())
            meshRef.current.position.set(newPosition.x, newPosition.y, newPosition.z)
            setPosition(newPosition)
            
            // Notify parent of position update
            if (onPositionUpdate) {
                onPositionUpdate(newPosition)
            }
            
            // Calculate rotation based on time difference
            const timeDiff = (currentTime.getTime() - lastTimeRef.current.getTime()) / 1000 // Convert to seconds
            const rotationSpeed = (2 * Math.PI) / (body.dayLength * 60 * 60)
            meshRef.current.rotation.y += rotationSpeed * timeDiff
            
            lastTimeRef.current = currentTime
        }
    })

    // Initial position
    const initialPosition = getPositionFromOrbit2(body.orbit, currentTime.getTime(), simulationStartTime.getTime())
    const handleClick = (event: any) => {
        event.stopPropagation();
        onSelect(body);
    };

    if (isLoading || !material) {
        return null // Don't render anything while loading
    }

    if (loadError) {
        console.warn(`Failed to load texture for ${body.name}: ${loadError}`);
    }

    return (
        <group>
            <Sphere
                rotation={new THREE.Euler(0, Math.PI/2, Math.PI/2)}
                ref={meshRef}
                args={[body.radius * body.scale, 32, 32]}
                position={initialPosition.toArray()}
                onClick={handleClick}
                
            >
                <primitive object={material} />
            </Sphere>
            {isSelected && <SelectionIndicator position={position} radius={body.radius * body.scale} />}
        </group>
    )
} 