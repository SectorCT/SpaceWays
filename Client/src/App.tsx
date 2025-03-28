import { Canvas } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import { CelestialBodyComponent } from "./components/CelestialBody";
import { OrbitLine } from "./components/OrbitLine";
import { CelestialBody } from "./types/CelestialBody";
import { Orbit } from "./types/orbit";
import { useState, useEffect } from "react";
import "./App.css";

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

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
            {/* Time controls */}
            <div style={{ 
                position: 'absolute', 
                top: 20, 
                left: 20, 
                color: 'white',
                zIndex: 1000,
                background: 'rgba(0,0,0,0.7)',
                padding: '10px',
                borderRadius: '5px'
            }}>
                <div>Time: {simulationTime.toLocaleString()}</div>
                <div>Speed: {timeSpeed}x</div>
                <button onClick={() => setIsPaused(!isPaused)}>
                    {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={() => handleSpeedChange(Math.max(1, timeSpeed / 2))}>
                    Slower
                </button>
                <button onClick={() => handleSpeedChange(timeSpeed * 2)}>
                    Faster
                </button>
            </div>

            {/* Background stars */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                <Canvas>
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                </Canvas>
            </div>
            
            {/* Interactive scene */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                <Canvas camera={{ position: [0, 0, 100], fov: 45 }}>
                    <CelestialBodyComponent body={earth} currentTime={simulationTime} />
                    <CelestialBodyComponent body={moon} currentTime={simulationTime} />
                    <OrbitControls />
                    <OrbitLine orbit={exampleOrbit} color="#00ff00" />
                </Canvas>
            </div>
        </div>
    )
}

export default App;
