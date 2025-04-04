import { useRef, useState, useEffect } from "react";
import { Sphere, Cylinder } from "@react-three/drei";
import {
  Vector3,
  Group,
  Raycaster,
} from "three";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";

const directionVectors: Record<Direction, Vector3> = {
  prograde: new Vector3(0, 0, 1),
  retrograde: new Vector3(0, 0, -1),
  normal: new Vector3(0, 1, 0),
  antinormal: new Vector3(0, -1, 0),
  radialIn: new Vector3(-1, 0, 0),
  radialOut: new Vector3(1, 0, 0),
};

interface ManeuverNodeProps {
  id: string;
  position: Vector3;
  deltaV: Vector3;
  scale?: number;
  onUpdate: (id: string, deltaV: Vector3, isDragging: boolean) => void;
  setIsDragging: (isDragging: boolean) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

type Direction =
  | "prograde"
  | "retrograde"
  | "normal"
  | "antinormal"
  | "radialIn"
  | "radialOut";

export function ManeuverNode({
  id,
  position,
  deltaV,
  scale = 10000,
  onUpdate,
  setIsDragging,
  isSelected,
  onSelect,
}: ManeuverNodeProps) {
  const groupRef = useRef<Group>(null);
  const { camera, mouse } = useThree();
  const [isDragging, setLocalDragging] = useState<Direction | null>(null);
  const [currentDeltaV, setCurrentDeltaV] = useState<Vector3>(deltaV.clone());
  const dragStartPos = useRef<Vector3 | null>(null);
  const dragStartDeltaV = useRef<Vector3 | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const dragStartOffset = useRef<Vector3 | null>(null);
  const raycaster = useRef<Raycaster>(new Raycaster());

  // Base sizes that will be scaled by camera distance
  const baseHandleSize = 20.0;
  const baseHandleLength = 50.0;
  const baseSphereRadius = 15.0;
  const baseHandleThickness = 3.0;
  const deltaVSensitivity = 2;
  const dragScale = 0.003;

  const [handlePositions, setHandlePositions] = useState<
    Record<Direction, Vector3>
  >({
    prograde: new Vector3(0, 0, baseHandleLength),
    retrograde: new Vector3(0, 0, -baseHandleLength),
    normal: new Vector3(0, baseHandleLength, 0),
    antinormal: new Vector3(0, -baseHandleLength, 0),
    radialIn: new Vector3(-baseHandleLength, 0, 0),
    radialOut: new Vector3(baseHandleLength, 0, 0),
  });

  // Colors for different axes
  const colors = {
    prograde: "#00ff00",
    retrograde: "#ff00ff",
    normal: "#00ffff",
    antinormal: "#ffff00",
    radialIn: "#ff0000",
    radialOut: "#0000ff",
  };

  // Update currentDeltaV when prop changes
  useEffect(() => {
    setCurrentDeltaV(deltaV.clone());
  }, [deltaV]);

  // Add global mouse up listener when dragging starts
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => {
        handlePullerDragEnd();
      };
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => {
        window.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  // Add console log when component mounts
  useEffect(() => {
    console.log("ManeuverNode mounted with props:", {
      id,
      position,
      deltaV,
      scale,
      isSelected
    });
  }, [id, position, deltaV, scale, isSelected]);

  // Update sizes based on camera distance
  useFrame(() => {
    if (groupRef.current) {
      const distance = camera.position.distanceTo(position);
      const targetScale = Math.pow(distance, 0.6) / 5;
      groupRef.current.scale.setScalar(targetScale);
    }
  });

  // Handle drag updates
  useFrame(() => {
    if (isDragging && dragStartPos.current && dragStartOffset.current && dragStartDeltaV.current) {
      raycaster.current.setFromCamera(mouse, camera);
      const intersects = raycaster.current.intersectObjects(groupRef.current?.children || [], true);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        const axisVector = directionVectors[isDragging].clone().normalize();
        const dragVector = intersect.point.clone().sub(dragStartPos.current!);
        
        // Calculate the projection of drag onto the axis and scale it
        const dragProjection = dragVector.dot(axisVector) * dragScale;
        
        // Only allow movement in the positive direction of the axis
        const clampedProjection = Math.max(0, dragProjection);
        
        // Calculate the new position by adding the clamped projection to the base position
        const newPosition = directionVectors[isDragging].clone().multiplyScalar(baseHandleLength).add(
          axisVector.multiplyScalar(clampedProjection)
        );

        // Calculate the length from center
        const length = newPosition.length();

        // Only update if the length is greater than or equal to baseHandleLength
        if (length >= baseHandleLength) {
          // Update handle position
          setHandlePositions(prev => ({
            ...prev,
            [isDragging]: newPosition
          }));

          // Calculate deltaV change based on drag projection directly
          const deltaVChange = dragProjection * deltaVSensitivity;

          // Update deltaV based on direction
          const newDeltaV = dragStartDeltaV.current!.clone();
          switch (isDragging) {
            case 'prograde':
              newDeltaV.z += deltaVChange;
              break;
            case 'retrograde':
              newDeltaV.z -= deltaVChange;
              break;
            case 'normal':
              newDeltaV.y += deltaVChange;
              break;
            case 'antinormal':
              newDeltaV.y -= deltaVChange;
              break;
            case 'radialIn':
              newDeltaV.x -= deltaVChange;
              break;
            case 'radialOut':
              newDeltaV.x += deltaVChange;
              break;
          }

          setCurrentDeltaV(newDeltaV);
          onUpdate(id, newDeltaV, true);
        }
      }
    }
  });

  const handlePullerDragStart = (
    event: ThreeEvent<PointerEvent>,
    direction: Direction,
  ) => {
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    setIsDragging(true);
    setLocalDragging(direction);
    dragStartPos.current = event.point;
    dragStartDeltaV.current = currentDeltaV.clone();
    dragStartOffset.current = event.point
      .clone()
      .sub(handlePositions[direction]);
    lastUpdateTime.current = Date.now();
    document.body.style.cursor = "grabbing";
  };

  const handlePullerDragEnd = (event?: ThreeEvent<PointerEvent>) => {
    if (event) {
      event.stopPropagation();
      event.nativeEvent.stopPropagation();
    }
    setIsDragging(false);
    setLocalDragging(null);
    dragStartPos.current = null;
    dragStartDeltaV.current = null;
    dragStartOffset.current = null;
    lastUpdateTime.current = 0;
    document.body.style.cursor = "auto";

    // Reset handle positions to default length
    setHandlePositions({
      prograde: new Vector3(0, 0, baseHandleLength),
      retrograde: new Vector3(0, 0, -baseHandleLength),
      normal: new Vector3(0, baseHandleLength, 0),
      antinormal: new Vector3(0, -baseHandleLength, 0),
      radialIn: new Vector3(-baseHandleLength, 0, 0),
      radialOut: new Vector3(baseHandleLength, 0, 0),
    });
  };

  const createPuller = (
    direction: Direction,
    rotation: [number, number, number] = [0, 0, 0],
  ) => {
    const handlePos = handlePositions[direction];
    const currentLength = handlePos.length();

    return (
      <>
        <Cylinder
          position={[handlePos.x / 2, handlePos.y / 2, handlePos.z / 2]}
          rotation={rotation}
          args={[baseHandleThickness, baseHandleThickness, currentLength]}
        >
          <meshBasicMaterial color={colors[direction]} />
        </Cylinder>
        <Sphere
          position={[handlePos.x, handlePos.y, handlePos.z]}
          args={[baseHandleSize, 16, 16]}
          onPointerDown={(e) => handlePullerDragStart(e, direction)}
          onPointerMove={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopPropagation();
          }}
          onPointerUp={handlePullerDragEnd}
        >
          <meshBasicMaterial color={colors[direction]} />
        </Sphere>
      </>
    );
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopPropagation();
        onSelect(id);
      }}
    >
      {/* Center hollow sphere */}
      <Sphere
        args={[baseSphereRadius, 32, 32]}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.nativeEvent.stopPropagation();
          onSelect(id);
        }}
      >
        <meshBasicMaterial
          color={isSelected ? "#ffffff" : "#ff0000"}
          wireframe={isSelected}
          transparent={true}
          opacity={0.8}
        />
      </Sphere>

      {/* Only show handles when selected */}
      {isSelected && (
        <>
          {/* Prograde/Retrograde handles */}
          {createPuller(
            "prograde",
            [Math.PI / 2, 0, 0],
          )}
          {createPuller(
            "retrograde",
            [Math.PI / 2, 0, 0],
          )}

          {/* Normal/Anti-normal handles */}
          {createPuller("normal", [0, baseHandleLength, 0])}
          {createPuller("antinormal", [0, -baseHandleLength, 0])}

          {/* Radial handles */}
          {createPuller(
            "radialIn",
            [0, 0, Math.PI / 2],
          )}
          {createPuller(
            "radialOut",
            [0, 0, Math.PI / 2],
          )}
        </>
      )}
    </group>
  );
}
