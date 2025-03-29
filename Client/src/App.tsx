import { Canvas } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import { CelestialBodyComponent } from "./components/CelestialBody";
import { OrbitLine2 } from "./components/OrbitLine";
import { CelestialBody } from "./types/CelestialBody";
import { useState, useEffect, useRef } from "react";
import { InfoPanel } from "./components/InfoPanel";
import { PromptMenu } from "./components/PromptMenu";
import { ManeuverNode } from "./components/ManeuverNode";
import { Vector3 } from "three";
import { DateSelector } from "./components/DateSelector";
import { ZoomButton } from "./components/ZoomButton";
import { getPositionFromOrbit2 } from "./getPositionFromOrbit";
import "./App.css";
import { Spaceship } from "./components/Spaceship";
import { orbitData } from "./orbitData";
import * as THREE from "three";

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

const exampleOrbit2 = orbitData;

const moon: CelestialBody = {
  name: "Moon",
  orbit: exampleOrbit2["Moon"],
  radius: 1737,
  color: "#808080",
  mass: 7.348e22,
  scale: 1737,
  texture:
    "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg",
  dayLength: 24,
};

const spaceship: CelestialBody = {
  name: "Spaceship",
  orbit: exampleOrbit2["Moon"],
  radius: 70, // Increased from 10 to 100 for a much bigger clickable area
  color: "#00ffff",
  mass: 1000,
  scale: 0.1,
};

const earth: CelestialBody = {
  name: "Earth",
  orbit: exampleOrbit2["Earth"],
  radius: 6371,
  color: "#4287f5",
  mass: 5.972e24,
  scale: 1,
  texture:
    "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg",
  dayLength: 24,
};

const sun: CelestialBody = {
  name: "Sun",
  orbit: exampleOrbit2["Sun"],
  radius: 696340,
  color: "#ff0000",
  mass: 1.989e30,
  scale: 1,
  texture: "/src/assets/2k_sun.jpg",
  dayLength: 24,
};

const ZOOM_OUT_DISTANCE = 10000; // Fixed zoom out distance

function App() {
  const [simulationTime, setSimulationTime] = useState<Date>(new Date());
  const [timeSpeed, setTimeSpeed] = useState(1); // 1 = real time, 2 = 2x speed, etc.
  const [isPaused, setIsPaused] = useState(false);
  const [selectedBody, setSelectedBody] = useState<CelestialBody | null>(earth);
  const [selectedManeuver, setSelectedManeuver] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PromptState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    buttons: [],
  });
  const [maneuverNodes, setManeuverNodes] = useState<ManeuverNodeData[]>([]);
  const [currentManeuverVector, setCurrentManeuverVector] = useState<Vector3>(
    new Vector3(0, 0, 0),
  );
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [isZoomedIn, setIsZoomedIn] = useState<boolean>(true);
  const [zoomIndicatorStyle, setZoomIndicatorStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [zoomLevel, setZoomLevel] = useState<"normal" | "wide" | "extreme">(
    "normal",
  );
  const [showZoomLevelIndicator, setShowZoomLevelIndicator] = useState(false);

  const [simulationStartTime, _] = useState<Date>(new Date());
  const timeControlsRef = useRef<HTMLDivElement>(null);
  const orbitControlsRef = useRef<any>(null);
  const initialCameraPositionRef = useRef<Vector3 | null>(null);
  const initialTargetRef = useRef<Vector3 | null>(null);
  const zoomTargetRef = useRef<Vector3 | null>(null);
  const isZoomingRef = useRef(true);
  const zoomStartTimeRef = useRef<number>(performance.now());
  const zoomedBodyRef = useRef<CelestialBody | null>(sun);

  useEffect(() => {
    let lastTime = Date.now();
    const interval = setInterval(() => {
      if (!isPaused) {
        const currentTime = Date.now();
        const deltaMs = (currentTime - lastTime) * timeSpeed;
        setSimulationTime((prevTime) => new Date(prevTime.getTime() + deltaMs));
        lastTime = currentTime;
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [timeSpeed, isPaused]);

  // Add keyboard controls for pause, speed up, and slow down
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case " ": // Space bar for pause/resume
          setIsPaused((prevPaused) => !prevPaused);
          break;
        case ">": // > for speed up
        case ".": // Also allow period key (unshifted >)
          handleSpeedChange(timeSpeed * 2);
          break;
        case "<": // < for slow down
        case ",": // Also allow comma key (unshifted <)
          handleSpeedChange(Math.max(1, timeSpeed / 2));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Clean up event listener
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [timeSpeed]); // Only re-add listener if timeSpeed changes

  // Handle screen edges for date picker
  useEffect(() => {
    if (isDatePickerOpen && timeControlsRef.current) {
      const rect = timeControlsRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Check if date picker would go off screen
      if (rect.left + 400 > viewportWidth) {
        timeControlsRef.current.classList.add("date-picker-right-aligned");
      } else {
        timeControlsRef.current.classList.remove("date-picker-right-aligned");
      }

      if (rect.bottom + 400 > viewportHeight) {
        timeControlsRef.current.classList.add("date-picker-top-aligned");
      } else {
        timeControlsRef.current.classList.remove("date-picker-top-aligned");
      }
    }
  }, [isDatePickerOpen]);

  const handleSpeedChange = (speed: number) => {
    setTimeSpeed(speed);
  };

  const handleSelectBody = (body: CelestialBody) => {
    console.log("Selected body:", body.name);

    // Close date picker if it's open
    if (isDatePickerOpen) {
      setIsDatePickerOpen(false);
    }

    // If clicking the same body that's already selected
    if (selectedBody && selectedBody.name === body.name) {
      // Create pulse effect - zoom in briefly then out
      zoomedBodyRef.current = body;
      isZoomingRef.current = true;
      zoomStartTimeRef.current = performance.now();
      setIsZoomedIn(true);
    }

    // Set the selected body
    setSelectedBody(body);
  };

  // Simple close handler - now returns to null selection
  const handleCloseInfoPanel = () => {
    setSelectedBody(null);
  };

  const handleOrbitClick = (event: MouseEvent, buttons: PromptButton[]) => {
    event.preventDefault();

    // Get the hover point from the button's onClick return value
    const createManeuverButton = buttons.find(
      (b) => b.label === "Create Maneuver Node",
    );
    if (createManeuverButton) {
      const hoverPoint = createManeuverButton.onClick();
      if (hoverPoint instanceof Vector3) {
        const newDeltaV = new Vector3(0, 0, 0);
        // Create new node with zero deltaV
        const newNode: ManeuverNodeData = {
          id: Math.random().toString(36).substr(2, 9),
          position: hoverPoint,
          deltaV: newDeltaV.clone(),
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
        buttons,
      });
    }
  };

  const closePrompt = () => {
    setPrompt((prev) => ({ ...prev, isOpen: false }));
  };

  const handleManeuverUpdate = (
    id: string,
    deltaV: Vector3,
    isDragging: boolean,
  ) => {
    setIsDraggingHandle(isDragging);

    // Update the maneuver nodes first
    setManeuverNodes((prev) =>
      prev.map((node) =>
        node.id === id ? { ...node, deltaV: deltaV.clone() } : node,
      ),
    );

    // Always update currentManeuverVector to show the active node's deltaV
    setCurrentManeuverVector(deltaV.clone());
  };

  const handleManeuverSelect = (id: string) => {
    setSelectedManeuver((prev) => {
      const newSelection = prev === id ? null : id;
      console.log("New selection:", newSelection);
      return newSelection;
    });
  };
  // Handle setting a specific date
  const handleSetDate = (newDate: Date) => {
    console.log("Setting new date:", newDate);
    setSimulationTime(newDate);
    setIsDatePickerOpen(false);
    // Pause simulation when a specific date is set
    setIsPaused(true);
  };

  // Handle showing/hiding the date picker
  const toggleDatePicker = () => {
    console.log("Toggle date picker, current state:", isDatePickerOpen);
    // If we're opening the date picker, close the planet panel
    if (!isDatePickerOpen && selectedBody) {
      setSelectedBody(null);
    }
    setIsDatePickerOpen(!isDatePickerOpen);
  };

  // Add useEffect to monitor date picker state
  useEffect(() => {
    console.log("Date picker state changed:", isDatePickerOpen);
  }, [isDatePickerOpen]);

  // Save the initial camera position and target
  useEffect(() => {
    if (orbitControlsRef.current && !initialCameraPositionRef.current) {
      // Store the initial camera position and target as reference points for zooming
      initialCameraPositionRef.current = new Vector3(0, 0, ZOOM_OUT_DISTANCE);
      initialTargetRef.current = new Vector3(0, 0, 0);

      // Set the camera to this initial position
      orbitControlsRef.current.object.position.copy(
        initialCameraPositionRef.current,
      );
      orbitControlsRef.current.target.copy(initialTargetRef.current);
      orbitControlsRef.current.update();

      console.log(
        "Set wider initial camera position:",
        initialCameraPositionRef.current,
      );
    }
  }, [orbitControlsRef.current]);

  // Update the zoom animation effect
  useEffect(() => {
    // Check if we should run tracking
    if (!isZoomingRef.current && !(isZoomedIn && zoomedBodyRef.current)) return;

    const animate = () => {
      if (!orbitControlsRef.current) {
        console.log("Missing refs for zoom animation");
        return;
      }

      // Calculate animation progress (0 to 1) over 1 second
      const elapsedTime = (performance.now() - zoomStartTimeRef.current) / 1000;
      const progress = Math.min(elapsedTime, 1); // Clamp to 1

      // Use easing function for smooth animation
      const easedProgress = easeInOutCubic(progress);

      if (isZoomedIn && zoomedBodyRef.current) {
        // Get the current position of the tracked body
        const currentBodyPosition = getPositionFromOrbit2(
          zoomedBodyRef.current.orbit,
          simulationTime.getTime(),
          simulationStartTime.getTime(),
        );
        const updatedTargetPosition = new Vector3(
          currentBodyPosition.x,
          currentBodyPosition.y,
          currentBodyPosition.z,
        );

        // During zoom animation
        orbitControlsRef.current.target.lerpVectors(
          orbitControlsRef.current.target.clone(),
          updatedTargetPosition,
          easedProgress,
        );

        // Calculate zoom distance based on whether this is a pulse zoom or normal zoom
        const pulseZoomFactor =
          selectedBody && selectedBody.name === zoomedBodyRef.current.name
            ? 7
            : 10;
        const idealDistance =
          zoomedBodyRef.current.radius *
          zoomedBodyRef.current.scale *
          pulseZoomFactor;

        // Get the direction vector from camera to the target
        const camera = orbitControlsRef.current.object;
        const direction = new Vector3()
          .subVectors(camera.position, updatedTargetPosition)
          .normalize();

        // Calculate the desired camera position based on ideal distance
        const targetCameraPosition = updatedTargetPosition
          .clone()
          .add(direction.multiplyScalar(idealDistance));

        // Move the camera to the ideal position
        orbitControlsRef.current.object.position.lerpVectors(
          orbitControlsRef.current.object.position.clone(),
          targetCameraPosition,
          easedProgress,
        );
      } else if (
        !isZoomedIn &&
        initialCameraPositionRef.current &&
        initialTargetRef.current
      ) {
        // Zooming out - maintain camera direction while increasing distance
        const currentPos = orbitControlsRef.current.object.position;
        const currentTarget = orbitControlsRef.current.target;

        // Get current direction but use it with the fixed zoom out distance
        const direction = currentPos.clone().sub(currentTarget).normalize();
        const targetPosition = direction.multiplyScalar(ZOOM_OUT_DISTANCE);

        // Lerp the camera position
        orbitControlsRef.current.object.position.lerpVectors(
          currentPos,
          targetPosition,
          easedProgress,
        );

        // Smoothly move target back to center
        orbitControlsRef.current.target.lerpVectors(
          currentTarget,
          new Vector3(0, 0, 0),
          easedProgress,
        );
      }

      // Force update the controls
      orbitControlsRef.current.update();

      // If animation is complete
      if (isZoomingRef.current && progress >= 1) {
        isZoomingRef.current = false;

        // If we're zoomed out, stop the tracking and clear references
        if (!isZoomedIn) {
          zoomedBodyRef.current = null;
          zoomTargetRef.current = null;
          // Update the initial position reference to current position
          if (orbitControlsRef.current) {
            initialCameraPositionRef.current =
              orbitControlsRef.current.object.position.clone();
            initialTargetRef.current = orbitControlsRef.current.target.clone();
          }
        }
        return;
      }

      // Continue animation
      requestAnimationFrame(animate);
    };

    // Start animation loop
    const animationId = requestAnimationFrame(animate);

    // Clean up animation frame on component unmount
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isZoomedIn, simulationTime, selectedBody]);

  // Easing function for smooth animation
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const handleZoom = () => {
    if (!orbitControlsRef.current) {
      console.log("Can't zoom: no orbit controls ref");
      return;
    }

    // ZOOM IN to selected body
    if (!selectedBody) {
      console.log("Can't zoom in: no selected body");
      return;
    }

    // Store the selected body for tracking during animation
    zoomedBodyRef.current = selectedBody;
    isZoomingRef.current = true;
    zoomStartTimeRef.current = performance.now();
    setIsZoomedIn(true);

    // Create zoom visual indicator
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    setZoomIndicatorStyle({
      left: windowWidth / 2 - 50,
      top: windowHeight / 2 - 50,
      width: 100,
      height: 100,
    });

    setShowZoomIndicator(true);

    // Hide indicator after animation completes
    setTimeout(() => {
      setShowZoomIndicator(false);
    }, 1000);
  };

  useEffect(() => {
    THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        position: "relative",
      }}
    >
      {/* Single Canvas for all 3D content */}
      <div style={{ width: "100%", height: "100%" }}>
        <Canvas
          camera={{
            position: [0, 0, sun.radius * sun.scale * 10],
            fov: 45,
            near: 1,
            far: 100000000000,
            frustumCulled: false,
          }}
          onPointerMissed={() => {
            setSelectedBody(null);
            if (selectedManeuver) {
              setSelectedManeuver(null);
            }
          }}
        >
          {/* Background stars - positioned far behind everything */}
          {/* <Stars 
            
            // Calculate animation progress (0 to 1) over 1 second
            const elapsedTime = (performance.now() - zoomStartTimeRef.current) / 1000;
            const progress = Math.min(elapsedTime, 1); // Clamp to 1
            
            // Use easing function for smooth animation
            const easedProgress = easeInOutCubic(progress);
            
            if (isZoomedIn && zoomedBodyRef.current) {
                // Get the current position of the tracked body
                const currentBodyPosition = getPositionFromOrbit2(zoomedBodyRef.current.orbit, simulationTime.getTime(), simulationStartTime.getTime());
                const updatedTargetPosition = new Vector3(
                    currentBodyPosition.x, 
                    currentBodyPosition.y, 
                    currentBodyPosition.z
                );
                
                // During zoom animation
                orbitControlsRef.current.target.lerpVectors(
                    orbitControlsRef.current.target.clone(),
                    updatedTargetPosition,
                    easedProgress
                );
                
                // Calculate zoom distance based on whether this is a pulse zoom or normal zoom
                const pulseZoomFactor = selectedBody && selectedBody.name === zoomedBodyRef.current.name ? 7 : 10;
                const idealDistance = zoomedBodyRef.current.radius * zoomedBodyRef.current.scale * pulseZoomFactor;
                
                // Get the direction vector from camera to the target
                const camera = orbitControlsRef.current.object;
                const direction = new Vector3().subVectors(camera.position, updatedTargetPosition).normalize();
                
                // Calculate the desired camera position based on ideal distance
                const targetCameraPosition = updatedTargetPosition.clone().add(
                    direction.multiplyScalar(idealDistance)
                );
                
                // Move the camera to the ideal position
                orbitControlsRef.current.object.position.lerpVectors(
                    orbitControlsRef.current.object.position.clone(),
                    targetCameraPosition,
                    easedProgress
                );
            } else if (!isZoomedIn && initialCameraPositionRef.current && initialTargetRef.current) {
                // Zooming out - maintain camera direction while increasing distance
                const currentPos = orbitControlsRef.current.object.position;
                const currentTarget = orbitControlsRef.current.target;
                
                // Get current direction but use it with the fixed zoom out distance
                const direction = currentPos.clone().sub(currentTarget).normalize();
                const targetPosition = direction.multiplyScalar(ZOOM_OUT_DISTANCE);
                
                // Lerp the camera position
                orbitControlsRef.current.object.position.lerpVectors(
                    currentPos,
                    targetPosition,
                    easedProgress
                );
                
                // Smoothly move target back to center
                orbitControlsRef.current.target.lerpVectors(
                    currentTarget,
                    new Vector3(0, 0, 0),
                    easedProgress
                );
            }
            
            // Force update the controls
            orbitControlsRef.current.update();
            
            // If animation is complete
            if (isZoomingRef.current && progress >= 1) {
                isZoomingRef.current = false;
                
                // If we're zoomed out, stop the tracking and clear references
                if (!isZoomedIn) {
                    zoomedBodyRef.current = null;
                    zoomTargetRef.current = null;
                    // Update the initial position reference to current position
                    if (orbitControlsRef.current) {
                        initialCameraPositionRef.current = orbitControlsRef.current.object.position.clone();
                        initialTargetRef.current = orbitControlsRef.current.target.clone();
                    }
                }
                return;
            }
            
            // Continue animation
            requestAnimationFrame(animate);
        };
        
        // Start animation loop
        const animationId = requestAnimationFrame(animate);
        
        // Clean up animation frame on component unmount
        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [isZoomedIn, simulationTime, selectedBody]);

    // Easing function for smooth animation
    const easeInOutCubic = (t: number): number => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const handleZoom = () => {
        if (!orbitControlsRef.current) {
            console.log("Can't zoom: no orbit controls ref");
            return;
        }
        
        const isZoomedToCurrentSelection = isZoomedIn && 
            zoomedBodyRef.current && 
            selectedBody && 
            zoomedBodyRef.current.name === selectedBody.name;
        
        if (isZoomedToCurrentSelection) {
            // ZOOM OUT
            console.log("Zooming out from", zoomedBodyRef.current!.name);
            
            if (!initialCameraPositionRef.current || !initialTargetRef.current) {
                console.log("No initial camera position saved");
                return;
            }
            
            // Set zoom state
            setIsZoomedIn(false);
            isZoomingRef.current = true;
            zoomStartTimeRef.current = performance.now();
            zoomedBodyRef.current = null;
            
            // Fixed zoom out position
            const zoomOutPosition = new Vector3(0, 0, ZOOM_OUT_DISTANCE);
            
            // Update the camera target position
            initialCameraPositionRef.current = zoomOutPosition;
            initialTargetRef.current = new Vector3(0, 0, 0);
            
            // Create zoom out indicator
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            setZoomIndicatorStyle({
                left: windowWidth / 2 - 50,
                top: windowHeight / 2 - 50,
                width: 100,
                height: 100
            });
            
            setShowZoomIndicator(true);
            
            // Hide indicator after animation completes
            setTimeout(() => {
                setShowZoomIndicator(false);
            }, 1000);
            
            setAutoRotateSpeed(0.1); // Reset to normal rotation speed
        } else {
            // ZOOM IN
            if (!selectedBody) {
                console.log("Can't zoom in: no selected body");
                return;
            }
            
            console.log("Zooming in to", selectedBody.name);
            
            // Store the selected body for tracking during animation
            zoomedBodyRef.current = selectedBody;
            isZoomingRef.current = true;
            zoomStartTimeRef.current = performance.now();
            setIsZoomedIn(true);
            
            // Create zoom visual indicator
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            setZoomIndicatorStyle({
                left: windowWidth / 2 - 50,
                top: windowHeight / 2 - 50,
                width: 100,
                height: 100
            });
            
            setShowZoomIndicator(true);
            
            // Hide indicator after animation completes
            setTimeout(() => {
                setShowZoomIndicator(false);
            }, 1000);
            
            setAutoRotateSpeed(0.1); // Slower rotation when zoomed in
        }
    };

    useEffect(() => {
      THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0,0,1);
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
            {/* Single Canvas for all 3D content */}
            <div style={{ width: '100%', height: '100%' }}>
                <Canvas 
                    camera={{ 
                        position: [0, 0, sun.radius * sun.scale * 10], 
                        fov: 45,
                        near: 1,
                        far: 100000000000,
                        frustumCulled: false
                    }}
                    
                    onPointerMissed={() => {
                        setSelectedBody(null);
                        if (selectedManeuver) {
                            setSelectedManeuver(null);
                        }
                    }}
                >
                    {/* Background stars - positioned far behind everything */}
                    {/* <Stars 
                        radius={6000000} 
                        depth={50} 
                        count={500000} 
                        factor={6} 
                        saturation={1} 
                        fade 
                        speed={1}
                    /> */}

          {/* Celestial bodies */}
          <CelestialBodyComponent
            body={earth}
            currentTime={simulationTime}
            isSelected={selectedBody?.name === earth.name}
            onSelect={handleSelectBody}
            simulationStartTime={simulationStartTime}
          />
          {/* Moon */}
          {/* <CelestialBodyComponent
                        body={moon}
                        currentTime={currentTime}
                        isSelected={selectedBody?.name === moon.name}
                        onSelect={handleBodySelect}
                    /> */}

          {/* Spaceship */}
          <Spaceship
            body={spaceship}
            currentTime={simulationTime}
            isSelected={selectedBody?.name === spaceship.name}
            onSelect={handleSelectBody}
          />

          <CelestialBodyComponent
            body={sun}
            currentTime={simulationTime}
            isSelected={selectedBody?.name === sun.name}
            onSelect={handleSelectBody}
            simulationStartTime={simulationStartTime}
          />

          <OrbitLine2
            orbit={earth.orbit}
            color={earth.color}
            onOrbitClick={handleOrbitClick}
            maneuverNodes={maneuverNodes}
            selectedManeuver={selectedManeuver}
          />

          <OrbitLine2
            orbit={moon.orbit}
            color={moon.color}
            onOrbitClick={handleOrbitClick}
            maneuverNodes={maneuverNodes}
            selectedManeuver={selectedManeuver}
          />

          <OrbitLine2
            orbit={exampleOrbit2["Sun"]}
            color="#ff0000"
            onOrbitClick={handleOrbitClick}
            maneuverNodes={maneuverNodes}
            selectedManeuver={selectedManeuver}
          />

          {/* Render all maneuver nodes */}
          {maneuverNodes.map((node) => (
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
            enablePan={!isDraggingHandle}
            enableZoom={!isDraggingHandle}
            enableRotate={!isDraggingHandle}
            enabled={!isDraggingHandle}
            ref={orbitControlsRef}
            makeDefault
            minDistance={1}
            maxDistance={sun.radius * sun.scale * 4}
            zoomSpeed={1.0}
            rotateSpeed={1}
            panSpeed={0.8}
            dampingFactor={0.1}
          />
        </Canvas>
      </div>

      {/* Time controls with new stylish UI */}
      <div className="time-controls" ref={timeControlsRef}>
        <div className="time-label">Simulation Time</div>
        <div className="time-value">{simulationTime.toLocaleString()}</div>

        <div className="speed-display">
          <span className="speed-label">Speed:</span>
          <span className="speed-value">{timeSpeed}x</span>
        </div>

        <div className="controls-row">
          <button
            className={`time-button pause-button ${isPaused ? "paused" : ""}`}
            onClick={() => setIsPaused(!isPaused)}
            title="Press Space to pause/resume"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>

        <div className="controls-row" style={{ marginTop: "8px" }}>
          <button
            className="time-button speed-button slower"
            onClick={() => handleSpeedChange(Math.max(1, timeSpeed / 2))}
            title="Press < to slow down"
          >
            <span className="speed-icon">←</span> Slower
          </button>
          <div style={{ width: "10px" }}></div>
          <button
            className="time-button speed-button faster"
            onClick={() => handleSpeedChange(timeSpeed * 2)}
            title="Press > to speed up"
          >
            Faster <span className="speed-icon">→</span>
          </button>
        </div>

        <div className="keyboard-shortcuts">
          Keyboard: Space = pause, &lt; = slower, &gt; = faster
        </div>

        <div
          className="controls-row"
          style={{ marginTop: "12px", position: "relative" }}
        >
          <button
            className="time-button date-button"
            onClick={toggleDatePicker}
          >
            Set Specific Date
          </button>

          {isDatePickerOpen && (
            <div
              style={{
                position: "absolute",
                top: "1000%",
                left: "340%",
                width: "300px",
              }}
            >
              <DateSelector
                currentDate={simulationTime}
                onSetDate={handleSetDate}
                onClose={() => setIsDatePickerOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Debug info */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          color: "white",
          zIndex: 1000,
          background: "rgba(0,0,0,0.7)",
          padding: "10px",
          borderRadius: "5px",
          fontFamily: "monospace",
          fontSize: "14px",
          textAlign: "center",
        }}
      >
        ΔV:{" "}
        {currentManeuverVector
          ? `X: ${currentManeuverVector.x.toFixed(2)} Y: ${currentManeuverVector.y.toFixed(2)} Z: ${currentManeuverVector.z.toFixed(2)} m/s`
          : "No maneuver"}
        <br />
        Magnitude:{" "}
        {currentManeuverVector
          ? currentManeuverVector.length().toFixed(2) + " m/s"
          : "0 m/s"}
      </div>

      {/* Info panel */}
      <InfoPanel selectedBody={selectedBody} onClose={handleCloseInfoPanel} />

      {/* Orbit Action Prompt */}
      <PromptMenu
        isOpen={prompt.isOpen}
        position={prompt.position}
        buttons={prompt.buttons}
        onClose={closePrompt}
      />

      {/* Zoom level indicator */}
      <div
        className={`zoom-level-indicator ${showZoomLevelIndicator ? "visible" : ""} ${zoomLevel}`}
      >
        Zoom:{" "}
        {zoomLevel === "normal"
          ? "Standard"
          : zoomLevel === "wide"
            ? "Wide"
            : "Maximum"}
      </div>

      {/* UI Elements */}
      {showZoomIndicator && (
        <div
          className={`zoom-indicator ${isZoomedIn ? "" : "zoom-out"}`}
          style={{
            left: zoomIndicatorStyle.left + "px",
            top: zoomIndicatorStyle.top + "px",
            width: zoomIndicatorStyle.width + "px",
            height: zoomIndicatorStyle.height + "px",
          }}
        />
      )}

      {selectedBody && (
        <ZoomButton
          onZoom={handleZoom}
          isZoomedIn={
            isZoomedIn && zoomedBodyRef.current?.name === selectedBody.name
          }
        />
      )}
    </div>
  );
}

export default App;

