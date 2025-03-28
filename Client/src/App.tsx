import { Canvas } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import { CelestialBodyComponent } from "./components/CelestialBody";
import { OrbitLine } from "./components/OrbitLine";
import { CelestialBody } from "./types/CelestialBody";
import { Orbit } from "./types/orbit";
import "./App.css";

// Create Earth celestial body
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
  color: "#4287f5", // Blue color for Earth
  mass: 5.972e24, // Earth's mass in kg
  scale: 0.01, // Increased scale for better visibility
};

// Create an example orbit for visualization
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

function App() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        position: "relative",
      }}
    >
      {/* Background stars */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <Canvas>
          <Stars
            radius={100}
            depth={50}
            count={5000}
            factor={4}
            saturation={0}
            fade
            speed={1}
          />
        </Canvas>
      </div>

      {/* Interactive scene */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <Canvas camera={{ position: [150, 150, 150], fov: 45 }}>
          {/* Main ambient light for overall scene illumination */}
          <ambientLight intensity={0.3} />

          {/* Main directional light (simulating sunlight) */}
          <directionalLight
            position={[100, 100, 100]}
            intensity={1}
            castShadow={true}
          />

          {/* Secondary fill light to reduce harsh shadows */}
          <pointLight
            position={[-50, -50, -50]}
            intensity={0.5}
            color="#ffffff"
          />

          {/* Rim light to create edge highlights */}
          <pointLight position={[0, 0, 100]} intensity={0.3} color="#ffffff" />

          <CelestialBodyComponent body={earth} />
          <OrbitLine orbit={exampleOrbit} color="#00ff00" />
          <OrbitControls
            enableDamping={true}
            dampingFactor={0.05}
            minDistance={50}
            maxDistance={600}
            target={[0, 0, 0]}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        </Canvas>
      </div>
    </div>
  );
}

export default App;
