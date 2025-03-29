import { Canvas } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import { CelestialBodyComponent } from "./components/CelestialBody";
import { OrbitLine } from "./components/OrbitLine";
import { CelestialBody } from "./types/CelestialBody";
import { Orbit } from "./types/orbit";
import { useState, useEffect } from "react";
import { InfoPanel } from "./components/InfoPanel";
import { PromptMenu } from "./components/PromptMenu";
import { ManeuverNode } from "./components/ManeuverNode";
import { Vector3 } from "three";
import "./App.css";

interface PromptButton {
    label: string;
    onClick: () => Vector3 | void;
}

interface PromptState {
    isOpen: boolean;
    position: { x: number; y: number };
    buttons: PromptButton[];
}

interface ManeuverNodeData {
    id: string;
    position: Vector3;
    deltaV: Vector3;
}

const exampleOrbit: Orbit = {
  name: "Example Orbit",
  semi_major_axis: 100, // Scaled down for visualization
  eccentricity: 0.2,
  inclination: 30,
  raan: 0,
  arg_periapsis: 0,
  true_anomaly: 0,
  apoapsis: 120,
  periapsis: 80,
  orbital_period: 86400,
  mean_motion: 0.0000729,
  epoch: new Date().toISOString(),
};

const moon: CelestialBody = {
  name: "Moon",
  orbit: exampleOrbit,
  radius: 1737,
  color: "#808080",
  mass: 7.348e22,
  scale: 0.005,
  texture: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg"
}

const earth: CelestialBody = {
  name: "Earth",
  orbit: {
    name: "Earth Orbit",
    semi_major_axis: 0, // At center
    eccentricity: 0,
    inclination: 0,
    raan: 0,
    arg_periapsis: 0,
    true_anomaly: 0,
    apoapsis: 0,
    periapsis: 0,
    orbital_period: 86400, // 24 hours in seconds
    mean_motion: 0.0000729, // 2π/86400
    epoch: new Date().toISOString(),
  },
  radius: 6371, // Earth's radius in km
  color: "#4287f5", // Fallback color if texture fails to load
  mass: 5.972e24, // Earth's mass in kg
  scale: 0.01, // Increased scale for better visibility
  texture:
    "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg", // Earth texture from Three.js repository
};

function App() {
    const [simulationTime, setSimulationTime] = useState<Date>(new Date());
    const [timeSpeed, setTimeSpeed] = useState(1); // 1 = real time, 2 = 2x speed, etc.
    const [isPaused, setIsPaused] = useState(false);
    const [selectedBody, setSelectedBody] = useState<CelestialBody | null>(null);
    const [selectedManeuver, setSelectedManeuver] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<PromptState>({
        isOpen: false,
        position: { x: 0, y: 0 },
        buttons: []
    });
    const [maneuverNodes, setManeuverNodes] = useState<ManeuverNodeData[]>([]);
    const [currentManeuverVector, setCurrentManeuverVector] = useState<Vector3>(new Vector3(0, 0, 0));
    const [isDraggingHandle, setIsDraggingHandle] = useState(false);

    useEffect(() => {
        let lastTime = Date.now();
        const interval = setInterval(() => {
            if (!isPaused) {
                const currentTime = Date.now();
                const deltaMs = (currentTime - lastTime) * timeSpeed;
                setSimulationTime(prevTime => new Date(prevTime.getTime() + deltaMs));
                lastTime = currentTime;
            }
        }, 16); // ~60fps

        return () => clearInterval(interval);
    }, [timeSpeed, isPaused]);

    const handleSpeedChange = (speed: number) => {
        setTimeSpeed(speed);
    };

    const handleSelectBody = (body: CelestialBody) => {
        console.log("Selected body:", body.name);
        
        // Toggle selection if clicking the same body
        if (selectedBody && selectedBody.name === body.name) {
            console.log("Deselecting body:", body.name);
            setSelectedBody(null);
        } else {
            setSelectedBody(body);
        }
    };

    const handleCloseInfoPanel = () => {
        setSelectedBody(null);
    };

    const handleOrbitClick = (event: MouseEvent, buttons: PromptButton[]) => {
        console.log("Orbit clicked");
        event.preventDefault();
        
        // Get the hover point from the button's onClick return value
        const createManeuverButton = buttons.find(b => b.label === "Create Maneuver Node");
        if (createManeuverButton) {
            const hoverPoint = createManeuverButton.onClick();
            if (hoverPoint instanceof Vector3) {
                const newDeltaV = new Vector3(0, 0, 0);
                // Create new node with zero deltaV
                const newNode: ManeuverNodeData = {
                    id: Math.random().toString(36).substr(2, 9),
                    position: hoverPoint,
                    deltaV: newDeltaV.clone()
                };
                setManeuverNodes([newNode]); // Replace array instead of adding to it
                setCurrentManeuverVector(newDeltaV);
                setSelectedManeuver(null); // Deselect any existing node
                closePrompt();
            }
        } else {
            setPrompt({
                isOpen: true,
                position: { x: event.clientX, y: event.clientY },
                buttons
            });
        }
    };

    const closePrompt = () => {
        setPrompt(prev => ({ ...prev, isOpen: false }));
    };

    const handleManeuverUpdate = (id: string, deltaV: Vector3, isDragging: boolean) => {
        setIsDraggingHandle(isDragging);
        
        // Update the maneuver nodes first
        setManeuverNodes(prev => prev.map(node => 
            node.id === id ? { ...node, deltaV: deltaV.clone() } : node
        ));

        // Always update currentManeuverVector to show the active node's deltaV
        setCurrentManeuverVector(deltaV.clone());
    };

    const handleManeuverSelect = (id: string) => {
        console.log("Selecting maneuver:", id);
        setSelectedManeuver(prev => {
            const newSelection = prev === id ? null : id;
            console.log("New selection:", newSelection);
            return newSelection;
        });
    };

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
            {/* Single Canvas for all 3D content */}
            <div style={{ width: '100%', height: '100%' }}>
                <Canvas 
                    camera={{ position: [0, 0, 100], fov: 45 }}
                    onPointerMissed={() => {
                        if (selectedBody) {
                            setSelectedBody(null);
                        }
                        if (selectedManeuver) {
                            setSelectedManeuver(null);
                        }
                    }}
                >
                    {/* Background stars - positioned far behind everything */}
                    <Stars 
                        radius={300} 
                        depth={50} 
                        count={5000} 
                        factor={4} 
                        saturation={0} 
                        fade 
                        speed={1}
                    />
                    
                    {/* Celestial bodies */}
                    <CelestialBodyComponent 
                        body={earth} 
                        currentTime={simulationTime} 
                        isSelected={selectedBody?.name === earth.name}
                        onSelect={handleSelectBody}
                    />
                    <CelestialBodyComponent 
                        body={moon} 
                        currentTime={simulationTime} 
                        isSelected={selectedBody?.name === moon.name}
                        onSelect={handleSelectBody}
                    />
                    
                    {/* Orbit lines */}
                    <OrbitLine 
                        orbit={exampleOrbit} 
                        color="#00ff00" 
                        onOrbitClick={handleOrbitClick}
                        maneuverNodes={maneuverNodes}
                        selectedManeuver={selectedManeuver}
                    />
                    
                    {/* Render all maneuver nodes */}
                    {maneuverNodes.map(node => (
                        <ManeuverNode
                            key={node.id}
                            id={node.id}
                            position={node.position}
                            deltaV={node.deltaV}
                            scale={2}
                            onUpdate={handleManeuverUpdate}
                            setIsDragging={setIsDraggingHandle}
                            isSelected={selectedManeuver === node.id}
                            onSelect={handleManeuverSelect}
                        />
                    ))}
                    
                    {/* Controls */}
                    <OrbitControls 
                        enablePan={!isDraggingHandle && !selectedManeuver}
                        enableZoom={!isDraggingHandle && !selectedManeuver}
                        enableRotate={!isDraggingHandle && !selectedManeuver}
                        enabled={!isDraggingHandle && !selectedManeuver}
                    />
                </Canvas>
            </div>

            {/* Time controls with new stylish UI */}
            <div className="time-controls">
                <div className="time-label">Simulation Time</div>
                <div className="time-value">{simulationTime.toLocaleString()}</div>
                
                <div className="speed-display">
                    <span className="speed-label">Speed:</span>
                    <span className="speed-value">{timeSpeed}x</span>
                </div>
                
                <div className="controls-row">
                    <button 
                        className={`time-button pause-button ${isPaused ? 'paused' : ''}`}
                        onClick={() => setIsPaused(!isPaused)}
                    >
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                </div>
                
                <div className="controls-row" style={{ marginTop: '8px' }}>
                    <button 
                        className="time-button speed-button slower"
                        onClick={() => handleSpeedChange(Math.max(1, timeSpeed / 2))}
                    >
                        <span className="speed-icon">←</span> Slower
                    </button>
                    <div style={{ width: '10px' }}></div>
                    <button 
                        className="time-button speed-button faster"
                        onClick={() => handleSpeedChange(timeSpeed * 2)}
                    >
                        Faster <span className="speed-icon">→</span>
                    </button>
                </div>
            </div>

            {/* Debug info */}
            <div style={{ 
                position: 'absolute', 
                top: 20, 
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                zIndex: 1000,
                background: 'rgba(0,0,0,0.7)',
                padding: '10px',
                borderRadius: '5px',
                fontFamily: 'monospace',
                fontSize: '14px',
                textAlign: 'center'
            }}>
                ΔV: {currentManeuverVector ? 
                    `X: ${currentManeuverVector.x.toFixed(2)} Y: ${currentManeuverVector.y.toFixed(2)} Z: ${currentManeuverVector.z.toFixed(2)} m/s` 
                    : 'No maneuver'}
                <br />
                Magnitude: {currentManeuverVector ? currentManeuverVector.length().toFixed(2) + ' m/s' : '0 m/s'}
            </div>

            {/* Info panel */}
            <InfoPanel 
                selectedBody={selectedBody} 
                onClose={handleCloseInfoPanel} 
            />

            {/* Orbit Action Prompt */}
            <PromptMenu
                isOpen={prompt.isOpen}
                position={prompt.position}
                buttons={prompt.buttons}
                onClose={closePrompt}
            />
        </div>
    );
}

export default App;