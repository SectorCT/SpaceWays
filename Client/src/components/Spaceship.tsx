import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CelestialBody } from "../types/CelestialBody";
import { getOrbitalPosition } from "../getPositionFromOrbit";
import * as THREE from "three";
import { SelectionIndicator } from "./SelectionIndicator";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Suspense } from "react";

// Rotation offset in radians (x, y, z)
const ROTATION_OFFSET = new THREE.Vector3(0, 0, -1.2);

interface CelestialBodyProps {
  body: CelestialBody;
  currentTime: Date;
  isSelected: boolean;
  onSelect: (body: CelestialBody) => void;
}

export function Spaceship({
  body,
  currentTime,
  isSelected,
  onSelect,
}: CelestialBodyProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3());
  const lastTimeRef = useRef(currentTime);

  // Load the spaceship model
  const { scene } = useLoader(
    GLTFLoader,
    "/src/assets/Spaceship/spaceship.glb",
  );

  useFrame(() => {
    if (meshRef.current) {
      // Update position based on simulation time
      const newPosition = getOrbitalPosition(body, currentTime);
      meshRef.current.position.set(newPosition.x, newPosition.y, newPosition.z);
      setPosition(
        new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z),
      );

      // Calculate orbital angle based on time
      const orbitalProgress =
        (currentTime.getTime() % (body.orbit.orbital_period * 1000)) /
        (body.orbit.orbital_period * 1000);
      const angle = 2 * Math.PI * orbitalProgress;

      // Calculate the next position to determine direction
      const nextTime = new Date(currentTime.getTime() + 100);
      const nextPosition = getOrbitalPosition(body, nextTime);
      const direction = new THREE.Vector3(
        nextPosition.x - newPosition.x,
        nextPosition.y - newPosition.y,
        nextPosition.z - newPosition.z,
      )
        .normalize()
        .multiplyScalar(-1);

      // Create a rotation matrix to align with orbital path
      const up = new THREE.Vector3(0, 1, 0);
      const matrix = new THREE.Matrix4();
      matrix.lookAt(new THREE.Vector3(0, 0, 0), direction, up);

      // Apply the rotation
      meshRef.current.quaternion.setFromRotationMatrix(matrix);

      // Apply rotation offset
      meshRef.current.rotateX(ROTATION_OFFSET.x);
      meshRef.current.rotateY(ROTATION_OFFSET.y);
      meshRef.current.rotateZ(ROTATION_OFFSET.z);

      lastTimeRef.current = currentTime;
    }
  });

  // Initial position
  const initialPosition = getOrbitalPosition(body, currentTime);
  const handleClick = (event: any) => {
    event.stopPropagation();
    onSelect(body);
  };

  return (
    <Suspense fallback={null}>
      <group
        ref={meshRef}
        position={[initialPosition.x, initialPosition.y, initialPosition.z]}
        onClick={handleClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <primitive object={scene} scale={2} />
        <pointLight
          position={[0, 0, 0]}
          color="#00ffff"
          intensity={2}
          distance={10}
          decay={1}
        />
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={2} />
      </group>

      {isSelected && (
        <SelectionIndicator
          position={position}
          radius={body.radius * body.scale}
        />
      )}
    </Suspense>
  );
}
