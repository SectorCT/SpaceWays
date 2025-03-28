import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBody } from '../types/CelestialBody';

interface SelectionIndicatorProps {
  position: THREE.Vector3;
  radius: number;
  body: CelestialBody;
}

export function SelectionIndicator({ position, radius, body }: SelectionIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  // Create sizes for the indicator components
  const indicatorRadius = radius * 1.2;
  const glowRadius = radius * 1.8;
  
  // Generate colors from the body's color
  const colors = useMemo(() => {
    // Create Three.js color from the body's color
    const baseColor = new THREE.Color(body.color);
    
    // Create variations for different parts of the indicator
    const mainColor = new THREE.Color(baseColor).multiplyScalar(1.2);  // Brighter
    const glowColor = new THREE.Color(baseColor).multiplyScalar(0.8);  // Darker
    const particleColor = new THREE.Color(baseColor).multiplyScalar(1.4); // Even brighter
    
    return {
      main: mainColor,
      glow: glowColor,
      particle: particleColor,
      mainHex: '#' + mainColor.getHexString(),
      glowHex: '#' + glowColor.getHexString(),
      particleHex: '#' + particleColor.getHexString()
    };
  }, [body.color]);
  
  // Create particles for space dust effect
  useEffect(() => {
    if (particlesRef.current) {
      const particleCount = 100;
      const particleGeometry = particlesRef.current.geometry as THREE.BufferGeometry;
      
      const positions = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      
      for (let i = 0; i < particleCount; i++) {
        // Create a random position within a spherical shell around the object
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const distance = radius * (2 + Math.random() * 0.5);
        
        positions[i * 3] = distance * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = distance * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = distance * Math.cos(phi);
        
        // Random sizes
        sizes[i] = Math.random() * 0.5 + 0.1;
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    }
  }, [radius]);
  
  // Create glow texture
  const glowTexture = useMemo(() => {
    return createGlowTexture(colors.glowHex);
  }, [colors.glowHex]);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Position the group at the celestial body's position
      groupRef.current.position.copy(position);
      
      // Make effects face the camera
      if (ringRef.current) {
        ringRef.current.lookAt(state.camera.position);
      }
      
      if (glowRef.current) {
        glowRef.current.lookAt(state.camera.position);
      }
      
      // Animate various elements
      const time = state.clock.getElapsedTime();
      
      // Pulse the main ring
      if (ringRef.current) {
        const ringScale = 1 + Math.sin(time * 2) * 0.05;
        ringRef.current.scale.set(ringScale, ringScale, ringScale);
      }
      
      // Rotate the glow effect
      if (glowRef.current) {
        glowRef.current.rotation.z = time * 0.2;
      }
      
      // Animate particles
      if (particlesRef.current) {
        particlesRef.current.rotation.y = time * 0.1;
        particlesRef.current.rotation.z = time * 0.05;
        
        const particleGeometry = particlesRef.current.geometry as THREE.BufferGeometry;
        const positions = particleGeometry.attributes.position.array as Float32Array;
        const sizes = particleGeometry.attributes.size.array as Float32Array;
        
        for (let i = 0; i < positions.length / 3; i++) {
          // Pulse particle sizes
          sizes[i] = (Math.sin(time * 3 + i) * 0.2 + 0.8) * (Math.random() * 0.3 + 0.2);
        }
        
        particleGeometry.attributes.size.needsUpdate = true;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main selection ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[indicatorRadius, indicatorRadius + 0.3, 64]} />
        <meshBasicMaterial color={colors.mainHex} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Inner pulse ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[indicatorRadius * 0.9, indicatorRadius * 0.92, 64]} />
        <meshBasicMaterial 
          color={colors.mainHex} 
          transparent 
          opacity={0.7} 
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh ref={glowRef} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[glowRadius * 2, glowRadius * 2]} />
        <meshBasicMaterial 
          color={colors.glowHex}
          transparent 
          opacity={0.2}
          side={THREE.DoubleSide}
          alphaMap={glowTexture}
          alphaTest={0.01}
        />
      </mesh>
      
      {/* HUD-style corner brackets */}
      {[0, 1, 2, 3].map((i) => (
        <group key={`bracket-${i}`} rotation={[0, 0, (Math.PI / 2) * i]}>
          <mesh position={[indicatorRadius * 1.1, indicatorRadius * 1.1, 0]} rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[indicatorRadius * 0.4, 0.1]} />
            <meshBasicMaterial color={colors.mainHex} transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      
      {/* Decorative scan lines */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={`scan-${i}`} position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, Math.PI * 2 * Math.random()]}>
          <ringGeometry args={[
            indicatorRadius * (0.95 + i * 0.1), 
            indicatorRadius * (0.96 + i * 0.1), 
            64,
            1,
            0,
            Math.PI / 4
          ]} />
          <meshBasicMaterial color={colors.mainHex} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
      
      {/* Particles */}
      <points ref={particlesRef}>
        <bufferGeometry />
        <pointsMaterial 
          size={0.3} 
          color={colors.particleHex} 
          transparent 
          opacity={0.6} 
          sizeAttenuation 
          alphaTest={0.1}
        />
      </points>
    </group>
  );
}

// Helper function to create a radial gradient texture for the glow effect
function createGlowTexture(color: string): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  
  // Parse the color to extract RGB components
  const colorObj = new THREE.Color(color);
  const r = Math.floor(colorObj.r * 255);
  const g = Math.floor(colorObj.g * 255);
  const b = Math.floor(colorObj.b * 255);
  
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.5)`);
  gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.2)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
} 