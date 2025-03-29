import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SelectionIndicatorProps {
  position: THREE.Vector3;
  radius: number;
  color?: string;
}

export function SelectionIndicator({ position, radius, color = "#00ffff" }: SelectionIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  // Create size for the indicator
  const indicatorRadius = radius * 1.2;
  
  useFrame((state) => {
    if (groupRef.current) {
      // Position the group at the celestial body's position
      groupRef.current.position.copy(position);
      
      // Make ring face the camera
      if (ringRef.current) {
        ringRef.current.lookAt(state.camera.position);
      }
      
      // Animate the ring
      const time = state.clock.getElapsedTime();
      
      // Pulse the ring
      if (ringRef.current) {
        const ringScale = 1 + Math.sin(time * 2) * 0.05;
        ringRef.current.scale.set(ringScale, ringScale, ringScale);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main selection ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} renderOrder={999}>
        <ringGeometry args={[indicatorRadius, indicatorRadius + 0.3, 64]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.9} 
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>
    </group>
  );
} 