import { useRef, useState, useMemo } from 'react';
import { Orbit } from '../types/orbit';
import { Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeEvent, useThree, useFrame } from '@react-three/fiber';

interface PromptButton {
    label: string;
    onClick: (params?: any) => void;
}

interface OrbitLineProps {
    orbit: Orbit;
    color?: string;
    dashed?: boolean;
    dashScale?: number;
    dashSize?: number;
    gapSize?: number;
    onOrbitClick?: (event: MouseEvent, buttons: PromptButton[]) => void;
    maneuverNodes?: { position: THREE.Vector3 }[];
}

export function OrbitLine({ 
    orbit, 
    color = '#ffffff', 
    dashed = false,
    dashScale = 2,
    dashSize = 2,
    gapSize = 2,
    onOrbitClick,
    maneuverNodes = []
}: OrbitLineProps) {
    const points = useRef<THREE.Vector3[]>([]);
    const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);
    const sphereRef = useRef<THREE.Mesh>(null);
    const { camera, size } = useThree();
    const baseSize = 0.5; // Reduced from 1.5 to 0.5

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
            const distance = camera.position.distanceTo(new THREE.Vector3(...hoverPoint.toArray()));
            const scale = distance * 0.01;
            sphereRef.current.scale.setScalar(scale);
        }
    });

    // Generate points for the orbit
    const generateOrbitPoints = () => {
        points.current = [];  // Clear existing points
        const { semi_major_axis: a, eccentricity: e, inclination, raan, arg_periapsis } = orbit;
        
        // Convert angles to radians
        const i = inclination * (Math.PI / 180);
        const Ω = raan * (Math.PI / 180);
        const ω = arg_periapsis * (Math.PI / 180);

        // Generate 200 points for a smooth orbit
        for (let angle = 0; angle <= 2 * Math.PI; angle += (2 * Math.PI) / 200) {
            // Calculate radius at this angle
            const r = (a * (1 - e * e)) / (1 + e * Math.cos(angle));

            // Calculate position in orbital plane
            const x_prime = r * Math.cos(angle);
            const y_prime = r * Math.sin(angle);

            // Rotate to 3D Space using Inclination, RAAN, and Argument of Periapsis
            const cosΩ = Math.cos(Ω), sinΩ = Math.sin(Ω);
            const cosω = Math.cos(ω), sinω = Math.sin(ω);
            const cosi = Math.cos(i), sini = Math.sin(i);

            const x = (cosΩ * cosω - sinΩ * sinω * cosi) * x_prime +
                     (-cosΩ * sinω - sinΩ * cosω * cosi) * y_prime;
            const y = (sinΩ * cosω + cosΩ * sinω * cosi) * x_prime +
                     (-sinΩ * sinω + cosΩ * cosω * cosi) * y_prime;
            const z = (sinω * sini) * x_prime + (cosω * sini) * y_prime;

            points.current.push(new THREE.Vector3(x, y, z));
        }
    };

    // Generate points when component mounts
    generateOrbitPoints();

    // Create a curve from the points for the tube geometry
    const curve = useMemo(() => {
        return new THREE.CatmullRomCurve3(points.current);
    }, []);

    const handleTubeHover = (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        
        // Find the closest point on the curve
        const mousePoint = event.point;
        const curvePoints = curve.getPoints(200);
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
        if (onOrbitClick && hoverPoint) {
            const buttons: PromptButton[] = [
                {
                    label: "Create Maneuver",
                    onClick: () => onOrbitClick(event.nativeEvent, [
                        {
                            label: "Create Maneuver Node",
                            onClick: () => {
                                console.log("Creating maneuver at", hoverPoint);
                                return hoverPoint;
                            }
                        }
                    ])
                },
            ];
            
            event.nativeEvent.stopPropagation();
            onOrbitClick(event.nativeEvent, buttons);
        }
    };

    return (
        <group>
            {/* Visible line */}
            <Line
                points={points.current}
                color={color}
                lineWidth={1}
                dashed={dashed}
                dashScale={dashScale}
                dashSize={dashSize}
                gapSize={gapSize}
            />
            
            {/* Invisible tube for hover detection */}
            <mesh 
                onPointerMove={handleTubeHover} 
                onPointerOut={handleTubeUnhover}
                onClick={handleTubeClick}
            >
                <tubeGeometry args={[curve, 200, 5, 8, false]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Hover indicator sphere */}
            {hoverPoint && (
                <Sphere 
                    ref={sphereRef}
                    position={hoverPoint.toArray()} 
                    args={[baseSize, 16, 16]}
                >
                    <meshBasicMaterial color={color} />
                </Sphere>
            )}
        </group>
    );
} 