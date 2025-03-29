import { useRef, useEffect, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import { CelestialBody } from '../types/CelestialBody'
import { getPositionFromOrbit2 } from '../getPositionFromOrbit'
import * as THREE from 'three'
import { SelectionIndicator } from './SelectionIndicator'
import { TextureLoader } from 'three'

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
    const materialRef = useRef<THREE.MeshStandardMaterial>(null)
    const [hovered, setHovered] = useState(false)
    const [rotationAngle, setRotationAngle] = useState(0)

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
            
            // Calculate rotation speed in radians per second
            // A full rotation (2π radians) should take exactly one day length
            // dayLength is in hours, so convert to seconds (3600 seconds per hour)
            const rotationSpeed = (2 * Math.PI) / (body.dayLength * 3600)
            
            // Apply rotation with a time multiplier for better visibility
            // This helps see rotation in slow-rotating planets but preserves relative speeds
            const timeMultiplier = 100 // Makes rotation 100x faster but keeps relative speeds intact
            meshRef.current.rotation.y += rotationSpeed * timeDiff * timeMultiplier
            
            // Keep rotation angle between 0 and 2*PI
            if (meshRef.current.rotation.y > Math.PI * 2) {
                meshRef.current.rotation.y -= Math.PI * 2
            }
            
            lastTimeRef.current = currentTime
        }

        // Update material for hover/selection states
        if (materialRef.current) {
            if (isSelected) {
                materialRef.current.emissive.set(0x333333);
                materialRef.current.emissiveIntensity = 0.5;
            } else if (hovered) {
                materialRef.current.emissive.set(0x222222);
                materialRef.current.emissiveIntensity = 0.3;
            } else {
                materialRef.current.emissive.set(0x000000);
                materialRef.current.emissiveIntensity = 0;
            }
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
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <primitive object={material} />
            </Sphere>
            {isSelected && <SelectionIndicator position={position} radius={body.radius * body.scale} />}
        </group>
    )
} 