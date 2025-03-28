import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SelectionIndicatorProps {
  position: THREE.Vector3;
  radius: number;
}

export function SelectionIndicator({ position, radius }: SelectionIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create a slightly larger radius for the indicator
  const indicatorRadius = radius * 1.2;
  
  useFrame((state) => {
    if (groupRef.current) {
      // Make the indicator face the camera
      groupRef.current.lookAt(state.camera.position);
      
      // Optional: Make the indicator pulse slightly
      const time = state.clock.getElapsedTime();
      const scale = 1 + Math.sin(time * 3) * 0.05;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  // Position the indicator at the celestial body's position
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(position);
    }
  }, [position]);

  return (
    <group ref={groupRef}>
      {/* Circle indicator */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[indicatorRadius, indicatorRadius + 0.2, 64]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Radial lines */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, 0, (Math.PI / 2) * i]}>
          <planeGeometry args={[indicatorRadius * 0.8, 0.1]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
} 