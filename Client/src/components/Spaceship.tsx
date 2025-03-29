import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CelestialBody } from "../types/CelestialBody";
import { getOrbitalPosition } from "../getPositionFromOrbit";
import * as THREE from "three";
import { SelectionIndicator } from "./SelectionIndicator";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { Suspense } from "react";

// Rotation offset in radians (x, y, z)
const ROTATION_OFFSET = new THREE.Vector3(0.80, 0, 1.5); // You can adjust these values later

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

  // Load textures
  const textureLoader = new THREE.TextureLoader();
  const baseColorTexture = textureLoader.load(
    "/src/assets/Spaceship/Material.001_Base_color.jpg",
  );
  const emissiveTexture = textureLoader.load(
    "/src/assets/Spaceship/Material.001_Emissive.jpg",
  );
  const metallicTexture = textureLoader.load(
    "/src/assets/Spaceship/Material.001_Metallic.jpg",
  );
  const roughnessTexture = textureLoader.load(
    "/src/assets/Spaceship/Material.001_Roughness.jpg",
  );
  const normalTexture = textureLoader.load(
    "/src/assets/Spaceship/Material.001_Normal_DirectX.jpg",
  );
  const aoTexture = textureLoader.load(
    "/src/assets/Spaceship/Material.001_Mixed_AO.jpg",
  );

  // Create PBR material with textures
  const material = new THREE.MeshStandardMaterial({
    map: baseColorTexture,
    emissiveMap: emissiveTexture,
    metalnessMap: metallicTexture,
    roughnessMap: roughnessTexture,
    normalMap: normalTexture,
    aoMap: aoTexture,
    metalness: 0.8,
    roughness: 0.2,
    emissive: new THREE.Color(0x00ffff),
    emissiveIntensity: 0.5,
  });

  // Load the spaceship model
  const obj = useLoader(OBJLoader, "/src/assets/Spaceship/spaceship.obj");

  // Apply material to all meshes in the model
  useEffect(() => {
    if (obj) {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });
    }
  }, [obj, material]);

  useFrame(() => {
    if (meshRef.current) {
      // Update position based on simulation time
      const newPosition = getOrbitalPosition(body, currentTime);
      meshRef.current.position.set(newPosition.x, newPosition.y, newPosition.z);
      setPosition(
        new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z),
      );

      // Calculate orbital velocity for orientation
      const timeDiff =
        (currentTime.getTime() - lastTimeRef.current.getTime()) / 1000;
      const angle = (2 * Math.PI * timeDiff) / body.orbit.orbital_period;
      
      // Calculate velocity vector
      const velocity = new THREE.Vector3(
        Math.sin(angle),
        -Math.cos(angle) * Math.sin(body.orbit.inclination),
        -Math.cos(angle) * Math.cos(body.orbit.inclination)
      );

      // Make the ship face its direction of travel
      if (velocity.length() > 0) {
        meshRef.current.lookAt(
          meshRef.current.position.clone().add(velocity.normalize())
        );
        
        // Apply rotation offset
        meshRef.current.rotation.x += ROTATION_OFFSET.x;
        meshRef.current.rotation.y += ROTATION_OFFSET.y;
        meshRef.current.rotation.z += ROTATION_OFFSET.z;
      }

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
        <primitive object={obj} scale={2} />
        <pointLight
          position={[0, 0, 0]}
          color="#00ffff"
          intensity={2}
          distance={10}
          decay={1}
        />
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
