import { useRef, useState, useMemo, useEffect } from 'react';
import { Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeEvent, useThree, useFrame } from '@react-three/fiber';
import { OrbitData2 } from '../types/Orbit2';
import { ORBIT_SCALE } from '../consts/spaceScale';

// Maximum number of points to render for the orbit line
const MAX_POINTS = 20000;

interface PromptButton {
    label: string;
    onClick: (params?: any) => void;
}

interface OrbitLine2Props {
    orbit: OrbitData2;
    color?: string;
    dashed?: boolean;
    dashScale?: number;
    dashSize?: number;
    gapSize?: number;
    onOrbitClick?: (event: MouseEvent, buttons: PromptButton[]) => void;
    maneuverNodes?: { position: THREE.Vector3 }[];
    selectedManeuver?: string | null;
}

export function OrbitLine2({ 
    orbit, 
    color = '#ffffff', 
    dashed = false,
    dashScale = 2,
    dashSize = 2,
    gapSize = 2,
    onOrbitClick,
    maneuverNodes = [],
    selectedManeuver = null,
}: OrbitLine2Props) {
    const [points, setPoints] = useState<THREE.Vector3[]>([]);
    const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);
    const baseSize = 50000;
    const [scale, setScale] = useState(baseSize);
    const sphereRef = useRef<THREE.Mesh>(null);
    const { camera, size } = useThree();
    

    // Function to convert 3D position to screen coordinates
    const toScreenPosition = (position: THREE.Vector3) => {
        const vector = position.clone();
        vector.project(camera);
        return {
            x: (vector.x + 1) * size.width / 2,
            y: (-vector.y + 1) * size.height / 2
        };
    };

    // Check if a screen position is near any maneuver node
    const isNearManeuverNode = (screenPos: { x: number, y: number }) => {
        const threshold = 50; // pixels
        return maneuverNodes.some(node => {
            const nodeScreenPos = toScreenPosition(node.position);
            const dx = nodeScreenPos.x - screenPos.x;
            const dy = nodeScreenPos.y - screenPos.y;
            return Math.sqrt(dx * dx + dy * dy) < threshold;
        });
    };

    // Update sphere size based on camera distance
    useFrame(() => {
        if (sphereRef.current && hoverPoint) {
           
            const distance = camera.position.distanceTo(hoverPoint);
            // Scale factor that increases with distance but not linearly
            const scale = Math.pow(distance, 0.8) / 20;
            setScale(scale);
        }
    });

    // Function to reduce points while maintaining orbit shape
    const reducePoints = (points: THREE.Vector3[], targetCount: number): THREE.Vector3[] => {
        if (points.length <= targetCount) return points;

        const result: THREE.Vector3[] = [];
        const step = points.length / targetCount;

        for (let i = 0; i < targetCount; i++) {
            const index = Math.floor(i * step);
            result.push(points[index]);
        }

        // Always include the last point to close the orbit
        if (points.length > 0) {
            result.push(points[points.length - 1]);
        }

        console.log(result);

        return result;
    };

    // Generate points for the orbit preview
    useEffect(() => {
        // Sort timestamps to ensure points are in chronological order
        const timestamps = Object.keys(orbit).sort((a, b) => parseFloat(a) - parseFloat(b));
        
        // Generate all points first
        const allPoints = timestamps.map(timestamp => {
            const [x, y, z] = orbit[timestamp];
            return new THREE.Vector3(x * ORBIT_SCALE, y * ORBIT_SCALE, z * ORBIT_SCALE);
        });

        // Reduce points to target count
        setPoints(reducePoints(allPoints, MAX_POINTS));
    }, [orbit]);

    // Create a curve from the points for the tube geometry
    const curve = useMemo(() => {
        return new THREE.CatmullRomCurve3(points);
    }, [points]);

    const handleTubeHover = (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        
        // Don't show hover when a maneuver is selected
        if (selectedManeuver) {
            setHoverPoint(null);
            return;
        }
        
        // Find the closest point on the curve
        const mousePoint = event.point;
        const curvePoints = points;
        let closestPoint = curvePoints[0];
        let minDistance = mousePoint.distanceTo(curvePoints[0]);

        for (const point of curvePoints) {
            const distance = mousePoint.distanceTo(point);
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
            }
        }

        // Check if the hover point would be near any existing maneuver node
        const screenPos = toScreenPosition(closestPoint);
        if (!isNearManeuverNode(screenPos)) {
            setHoverPoint(closestPoint);
        } else {
            setHoverPoint(null);
        }
    };

    const handleTubeUnhover = () => {
        setHoverPoint(null);
    };

    const handleTubeClick = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        
        if (selectedManeuver) return;
        
        const mousePoint = event.point;
        const curvePoints = points;
        let closestPoint = curvePoints[0];
        let minDistance = mousePoint.distanceTo(curvePoints[0]);

        for (const point of curvePoints) {
            const distance = mousePoint.distanceTo(point);
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
            }
        }

        // Check if the click point would be near any existing maneuver node
        const screenPos = toScreenPosition(closestPoint);
        if (!isNearManeuverNode(screenPos) && onOrbitClick) {
            // Check if it's a right click
            if (event.nativeEvent.button === 2) {
                onOrbitClick(event.nativeEvent, [
                    {
                        label: "Create Maneuver",
                        onClick: () => {
                            // Return the position so it can be used by the parent
                            return closestPoint.clone();
                        }
                    }
                ]);
            } else {
                onOrbitClick(event.nativeEvent, []);
            }
        }
    };
    

    return (
        <group>
            {/* Visible line */}
            {points.length > 0 && (
                <Line
                    points={points}
                    color={color}
                    lineWidth={1}
                    dashed={dashed}
                    dashScale={dashScale}
                    dashSize={dashSize}
                    gapSize={gapSize}
                    renderOrder={3000}
                />
            )}
            
            {/* Invisible line for hover detection */}
            {points.length > 0 && (
                <Line
                    points={points}
                    color="#000000"
                    lineWidth={5}
                    transparent={true}
                    opacity={0}
                    onPointerMove={selectedManeuver ? undefined : handleTubeHover} 
                    onPointerOut={selectedManeuver ? undefined : handleTubeUnhover}
                    onClick={selectedManeuver ? undefined : handleTubeClick}
                    onContextMenu={(e: React.MouseEvent) => {
                        handleTubeClick(e as unknown as ThreeEvent<MouseEvent>);
                    }}
                    renderOrder={2000}
                />
            )}

            {/* Hover indicator sphere */}
            {hoverPoint && (
                <Sphere 
                    ref={sphereRef}
                    position={hoverPoint.toArray()}
                    args={[scale, 32, 32]}
                >
                    <meshBasicMaterial 
                        color={"#ffffff"} 
                        opacity={1}
                        transparent={true}
                        depthWrite={false}
                    />
                </Sphere>
            )}
        </group>
    );
}
