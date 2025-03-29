import { Canvas } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import { CelestialBodyComponent } from "./components/CelestialBody";
import { OrbitLine2 } from "./components/OrbitLine2";
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
// import { Spaceship } from "./components/Spaceship";
import { orbitData } from "./orbitData";
import * as THREE from "three";
import { planetData } from "./consts/planetData";
import React from "react";

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

// const exampleOrbit2 = orbitData;

const bodies = planetData.map((planet) => {
  return {
    ...planet,
    orbit: orbitData[planet.name as keyof typeof orbitData],
  };
});

// Create references to all needed bodies
const sun = bodies.find((body) => body.name === "Sun")!;
const earth = bodies.find((body) => body.name === "Earth")!;
const mercury = bodies.find((body) => body.name === "Mercury")!;
const venus = bodies.find((body) => body.name === "Venus")!;
const moon = bodies.find((body) => body.name === "Moon")!;
const mars = bodies.find((body) => body.name === "Mars")!;
const jupiter = bodies.find((body) => body.name === "Jupiter")!;
const saturn = bodies.find((body) => body.name === "Saturn")!;
const uranus = bodies.find((body) => body.name === "Uranus")!;
const neptune = bodies.find((body) => body.name === "Neptune")!;
const pluto = bodies.find((body) => body.name === "Pluto")!;

// Create a dummy spaceship object for the UI references
const spaceship = {
  name: "Spaceship",
  orbit: orbitData["Rocket"] || {},
  radius: 70,
  color: "#00ffff",
  mass: 1000,
  scale: 0.1,
  dayLength: 24,
};

// const spaceship: CelestialBody = {

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
  const [maneuverNodeScale, setManeuverNodeScale] = useState(1);

  const [simulationStartTime, _] = useState<Date>(new Date());
  const timeControlsRef = useRef<HTMLDivElement>(null);
  const orbitControlsRef = useRef<any>(null);
  const initialCameraPositionRef = useRef<Vector3 | null>(null);
  const initialTargetRef = useRef<Vector3 | null>(null);
  const zoomTargetRef = useRef<Vector3 | null>(null);
  const isZoomingRef = useRef(true);
  const zoomStartTimeRef = useRef<number>(performance.now());
  const zoomedBodyRef = useRef<CelestialBody | null>(sun);

  // Add state for tracking if we're in wide view
  const [isWideView, setIsWideView] = useState(false);

  // Add state to track the Sun's screen position
  const [sunScreenPosition, setSunScreenPosition] = useState({ x: 0, y: 0 });
  
  // Add state to track all planets' screen positions
  const [planetScreenPositions, setPlanetScreenPositions] = useState({
    Mercury: { x: 0, y: 0 },
    Venus: { x: 0, y: 0 },
    Earth: { x: 0, y: 0 },
    Moon: { x: 0, y: 0 },
    Mars: { x: 0, y: 0 },
    Jupiter: { x: 0, y: 0 },
    Saturn: { x: 0, y: 0 },
    Uranus: { x: 0, y: 0 },
    Neptune: { x: 0, y: 0 },
    Spaceship: { x: 0, y: 0 }
  });

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
        case "=": // = key for extreme zoom out
        case "+": // + key for extreme zoom out
          if (orbitControlsRef.current) {
            // Get current controls position
            const currentPos = orbitControlsRef.current.object.position.clone();
            const currentTarget = orbitControlsRef.current.target.clone();
            
            // Calculate direction vector (normalized)
            const direction = new Vector3()
              .subVectors(currentPos, currentTarget)
              .normalize();
            
            // Move very far in that direction (x10 current distance)
            const distance = currentPos.distanceTo(currentTarget) * 10; // Increased from 5 to 10
            orbitControlsRef.current.object.position.copy(
              currentTarget.clone().add(direction.multiplyScalar(distance))
            );
            
            // Update controls
            orbitControlsRef.current.update();
            setZoomLevel("extreme");
            
            // Show zoom level indicator briefly
            setShowZoomLevelIndicator(true);
            setTimeout(() => setShowZoomLevelIndicator(false), 2000);
          }
          break;
        case "0": // 0 key for toggling between object view and solar system view
          if (orbitControlsRef.current) {
            // Check if we're already zoomed in on an object
            if (isZoomedIn && zoomedBodyRef.current) {
              // We're currently zoomed in, so zoom out to solar system view
              
              // Get the position of the sun as the center point
              const sunPosition = getPositionFromOrbit2(
                sun.orbit,
                simulationTime.getTime(),
                simulationStartTime.getTime(),
              );
              
              // Store the current body reference for potential zoom back in
              const currentZoomBody = zoomedBodyRef.current;
              
              // Set target to sun
              orbitControlsRef.current.target.set(sunPosition.x, sunPosition.y, sunPosition.z);
              
              // Calculate a position extremely far out to see the entire system
              const extremeDistance = sun.radius * sun.scale * 500;
              
              // Position camera above the ecliptic plane
              orbitControlsRef.current.object.position.set(
                sunPosition.x, 
                sunPosition.y, 
                sunPosition.z + extremeDistance
              );
              
              // Update controls
              orbitControlsRef.current.update();
              
              // Update state
              setIsZoomedIn(false);
              setZoomLevel("extreme");
              
              // Store previous zoom state for toggling back
              zoomedBodyRef.current = currentZoomBody;
            } else {
              // We're zoomed out, check if we have a previous body to zoom to
              if (zoomedBodyRef.current) {
                // Zoom back to the previously tracked body
                // Get the current position of the tracked body
                const bodyPosition = getPositionFromOrbit2(
                  zoomedBodyRef.current.orbit,
                  simulationTime.getTime(),
                  simulationStartTime.getTime(),
                );
                
                // Set target to the body
                orbitControlsRef.current.target.set(
                  bodyPosition.x, 
                  bodyPosition.y, 
                  bodyPosition.z
                );
                
                // Calculate ideal distance based on object size
                const zoomMultiplier = zoomedBodyRef.current.name === "Sun" ? 10 : 3;
                const idealDistance =
                  zoomedBodyRef.current.radius *
                  zoomedBodyRef.current.scale *
                  zoomMultiplier;
                
                // Calculate position above the body
                orbitControlsRef.current.object.position.set(
                  bodyPosition.x, 
                  bodyPosition.y, 
                  bodyPosition.z + idealDistance
                );
                
                // Update controls
                orbitControlsRef.current.update();
                
                // Update state
                setIsZoomedIn(true);
                setZoomLevel("normal");
                setIsWideView(false); // Explicitly hide the Sun when zoomed in
                
                // Start the tracking animation
                isZoomingRef.current = true;
                zoomStartTimeRef.current = performance.now();
              } else if (selectedBody) {
                // No previous body but we have a selected body, zoom to it
                zoomedBodyRef.current = selectedBody;
                setIsZoomedIn(true);
                setIsWideView(false); // Explicitly hide the Sun when zoomed in
                
                // Start the tracking animation
                isZoomingRef.current = true;
                zoomStartTimeRef.current = performance.now();
                
                setZoomLevel("normal");
              }
            }
            
            // Show zoom level indicator briefly
            setShowZoomLevelIndicator(true);
            setTimeout(() => setShowZoomLevelIndicator(false), 2000);
          }
          break;
        case "-": // - key for zoom in
        case "_": // _ key for zoom in
          if (orbitControlsRef.current) {
            // Get current controls position
            const currentPos = orbitControlsRef.current.object.position.clone();
            const currentTarget = orbitControlsRef.current.target.clone();
            
            // Calculate direction vector (normalized)
            const direction = new Vector3()
              .subVectors(currentPos, currentTarget)
              .normalize();
            
            // Move closer in that direction (half current distance)
            const distance = currentPos.distanceTo(currentTarget) * 0.5;
            orbitControlsRef.current.object.position.copy(
              currentTarget.clone().add(direction.multiplyScalar(distance))
            );
            
            // Update controls
            orbitControlsRef.current.update();
            setZoomLevel("normal");
            
            // Show zoom level indicator briefly
            setShowZoomLevelIndicator(true);
            setTimeout(() => setShowZoomLevelIndicator(false), 2000);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Clean up event listener
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [timeSpeed, simulationTime]); // Add simulationTime as dependency for the sun position in extreme zoom

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

    // If there are no buttons, just close any existing prompt
    if (!buttons || buttons.length === 0) {
      closePrompt();
      return;
    }

    // Show the prompt menu with the provided buttons
    setPrompt({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      buttons,
    });
  };

  const closePrompt = () => {
    setPrompt((prev) => ({ ...prev, isOpen: false }));
  };

  // Add a new function to handle prompt button clicks
  const handlePromptButtonClick = (button: PromptButton) => {
    if (button.label === "Create Maneuver") {
      const hoverPoint = button.onClick();
      if (hoverPoint instanceof Vector3) {
        console.log("Creating new maneuver node at position:", hoverPoint);
        const newDeltaV = new Vector3(0, 0, 0);
        // Create new node with zero deltaV
        const newNode: ManeuverNodeData = {
          id: Math.random().toString(36).substr(2, 9),
          position: hoverPoint,
          deltaV: newDeltaV.clone(),
        };
        console.log("New maneuver node created:", newNode);
        setManeuverNodes([newNode]); // Replace array instead of adding to it
        setCurrentManeuverVector(newDeltaV);
        setSelectedManeuver(null); // Deselect any existing node
      }
    }
    closePrompt();
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
      // Get Earth's initial position
      const earthPosition = getPositionFromOrbit2(
        earth.orbit,
        simulationTime.getTime(),
        simulationStartTime.getTime(),
      );
      
      // Calculate zoom out distance as 13x Earth's radius
      const zoomOutDistance = earth.radius * earth.scale * 13;
      
      // Set initial camera position above Earth
      initialCameraPositionRef.current = new Vector3(
        earthPosition.x,
        earthPosition.y,
        earthPosition.z + zoomOutDistance
      );
      
      // Set initial target to Earth's position
      initialTargetRef.current = new Vector3(
        earthPosition.x,
        earthPosition.y,
        earthPosition.z
      );

      // Set the camera to this initial position
      orbitControlsRef.current.object.position.copy(initialCameraPositionRef.current);
      orbitControlsRef.current.target.copy(initialTargetRef.current);
      orbitControlsRef.current.update();

      // Set initial zoom state to zoomed out
      setIsZoomedIn(false);
      zoomedBodyRef.current = null;

      console.log("Set initial camera position to Earth:", initialCameraPositionRef.current);
    }
  }, [orbitControlsRef.current]);

  // Update the zoom animation effect
  useEffect(() => {
    // Only run if we're actually zooming or tracking a body
    if (!isZoomingRef.current && !(isZoomedIn && zoomedBodyRef.current)) {
      return;
    }

    let animationFrameId: number;
    let lastUpdateTime = performance.now();
    const UPDATE_INTERVAL = 1000 / 60; // Target 60fps

    const animate = (currentTime: number) => {
      // Calculate delta time since last update
      const deltaTime = currentTime - lastUpdateTime;

      // Only update if enough time has passed
      if (deltaTime >= UPDATE_INTERVAL) {
        if (!orbitControlsRef.current) {
          console.log("Missing refs for zoom animation");
          return;
        }

        // Calculate animation progress (0 to 1) over 1 second
        const elapsedTime = (currentTime - zoomStartTimeRef.current) / 1000;
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

          const pulseZoomFactor =
          selectedBody && selectedBody.name === zoomedBodyRef.current.name
            ? 7
            : 10;

          
          // Use a larger multiplier for the Sun to ensure we're outside it
          const zoomMultiplier = zoomedBodyRef.current.name === "Sun" ? 10 : 3;
          const idealDistance =
            zoomedBodyRef.current.radius *
            zoomedBodyRef.current.scale *
            zoomMultiplier;

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
          // Get Earth's current position
          const earthPosition = getPositionFromOrbit2(
            earth.orbit,
            simulationTime.getTime(),
            simulationStartTime.getTime(),
          );
          
          // Calculate zoom out distance as 13x Earth's radius
          const zoomOutDistance = earth.radius * earth.scale * 13;
          
          // Get current camera position and target
          const currentPos = orbitControlsRef.current.object.position;
          const currentTarget = orbitControlsRef.current.target;

          // Calculate target position relative to Earth
          const targetPosition = new Vector3(
            earthPosition.x,
            earthPosition.y,
            earthPosition.z + zoomOutDistance
          );

          // Lerp the camera position
          orbitControlsRef.current.object.position.lerpVectors(
            currentPos,
            targetPosition,
            easedProgress,
          );

          // Smoothly move target to Earth's position
          orbitControlsRef.current.target.lerpVectors(
            currentTarget,
            new Vector3(earthPosition.x, earthPosition.y, earthPosition.z),
            easedProgress,
          );
        }

        // Force update the controls
        orbitControlsRef.current.update();

        // If animation is complete
        if (progress >= 1) {
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

        lastUpdateTime = currentTime;
      }

      // Continue animation
      animationFrameId = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationFrameId = requestAnimationFrame(animate);

    // Clean up animation frame on component unmount or when dependencies change
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isZoomedIn, selectedBody]); // Only depend on these values, not simulationTime

  // Add camera tracking effect for selected/zoomed objects
  useEffect(() => {
    // Only track if zoomed in and we have a body to track
    if (!isZoomedIn || !zoomedBodyRef.current || !orbitControlsRef.current) {
      return;
    }

    let animationFrameId: number;

    const trackObject = () => {
      if (!zoomedBodyRef.current || !orbitControlsRef.current) return;
      
      // Get the current position of the tracked body
      const currentBodyPosition = getPositionFromOrbit2(
        zoomedBodyRef.current.orbit,
        simulationTime.getTime(),
        simulationStartTime.getTime(),
      );
      
      // Update the orbit controls target to follow the object
      orbitControlsRef.current.target.set(
        currentBodyPosition.x,
        currentBodyPosition.y,
        currentBodyPosition.z
      );
      
      // Get the direction from camera to target
      const camera = orbitControlsRef.current.object;
      const direction = new Vector3()
        .subVectors(camera.position, orbitControlsRef.current.target)
        .normalize();
      
      // Calculate ideal distance based on object size
      const zoomMultiplier = zoomedBodyRef.current.name === "Sun" ? 10 : 3;
      const idealDistance =
        zoomedBodyRef.current.radius *
        zoomedBodyRef.current.scale *
        zoomMultiplier;
      
      // Move camera to maintain constant distance while following
      camera.position.copy(
        orbitControlsRef.current.target.clone().add(
          direction.multiplyScalar(idealDistance)
        )
      );
      
      // Update the controls
      orbitControlsRef.current.update();
      
      // Continue tracking
      animationFrameId = requestAnimationFrame(trackObject);
    };
    
    // Start tracking
    animationFrameId = requestAnimationFrame(trackObject);
    
    // Clean up on unmount or when dependencies change
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isZoomedIn, zoomedBodyRef.current, simulationTime]); // Include simulationTime to update on time changes

  // Easing function for smooth animation
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const handleZoom = () => {
    if (!orbitControlsRef.current) {
      console.log("Can't zoom: no orbit controls ref");
      return;
    }

    // Toggle between zoomed in and out states
    const newZoomState = !isZoomedIn;
    setIsZoomedIn(newZoomState);

    // If zooming in, we need a selected body
    if (newZoomState && !selectedBody) {
      console.log("Can't zoom in: no selected body");
      return;
    }

    // Store the selected body for tracking during animation
    if (newZoomState) {
      zoomedBodyRef.current = selectedBody;
    }
    
    // Start the zoom animation
    isZoomingRef.current = true;
    zoomStartTimeRef.current = performance.now();

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

  // Track camera distance to determine when to show sun
  useEffect(() => {
    if (!orbitControlsRef.current) return;

    const checkCameraDistance = () => {
      const camera = orbitControlsRef.current?.object;
      const target = orbitControlsRef.current?.target;
      
      if (camera && target) {
        // Get the distance from the camera to the center
        const distance = camera.position.distanceTo(target);
        
        // Threshold for showing the sun (when zoomed out very far)
        const sunVisibilityThreshold = sun.radius * sun.scale * 50;
        
        // Update state based on distance
        setIsWideView(distance > sunVisibilityThreshold);
      }
    };

    // Check initially
    checkCameraDistance();

    // Setup event listener for camera change
    const controls = orbitControlsRef.current;
    controls.addEventListener('change', checkCameraDistance);

    return () => {
      controls.removeEventListener('change', checkCameraDistance);
    };
  }, [orbitControlsRef.current]);

  // Add effect to calculate and update the Sun's and planets' screen positions
  useEffect(() => {
    if (!orbitControlsRef.current) return;

    const updateCelestialPositions = () => {
      const camera = orbitControlsRef.current.object;
      if (!camera) return;

      // Function to calculate screen position from world position
      const calculateScreenPosition = (worldPos: { x: number, y: number, z: number }) => {
        // Create Vector3 from the position
        const vector = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
        
        // Project to screen coordinates
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        
        // Clone the vector to avoid modifying the original
        const screenPosition = vector.clone();
        
        // Project the 3D position to screen space
        screenPosition.project(camera);
        
        // Convert to CSS coordinates
        const x = (screenPosition.x * widthHalf) + widthHalf;
        const y = -(screenPosition.y * heightHalf) + heightHalf;
        
        return { x, y };
      };

      // Get the current time values for calculations
      const currentTime = simulationTime.getTime();
      const startTime = simulationStartTime.getTime();

      // Update Sun position
      const sunPosition = getPositionFromOrbit2(sun.orbit, currentTime, startTime);
      setSunScreenPosition(calculateScreenPosition(sunPosition));
      
      // Update all planet positions
      const newPlanetPositions = {
        Mercury: calculateScreenPosition(getPositionFromOrbit2(mercury.orbit, currentTime, startTime)),
        Venus: calculateScreenPosition(getPositionFromOrbit2(venus.orbit, currentTime, startTime)),
        Earth: calculateScreenPosition(getPositionFromOrbit2(earth.orbit, currentTime, startTime)),
        Moon: calculateScreenPosition(getPositionFromOrbit2(moon.orbit, currentTime, startTime)),
        Mars: calculateScreenPosition(getPositionFromOrbit2(mars.orbit, currentTime, startTime)),
        Jupiter: calculateScreenPosition(getPositionFromOrbit2(jupiter.orbit, currentTime, startTime)),
        Saturn: calculateScreenPosition(getPositionFromOrbit2(saturn.orbit, currentTime, startTime)),
        Uranus: calculateScreenPosition(getPositionFromOrbit2(uranus.orbit, currentTime, startTime)),
        Neptune: calculateScreenPosition(getPositionFromOrbit2(neptune.orbit, currentTime, startTime)),
        Spaceship: calculateScreenPosition(getPositionFromOrbit2(spaceship.orbit, currentTime, startTime))
      };
      
      setPlanetScreenPositions(newPlanetPositions);
    };

    // Set up an animation frame loop to continuously update positions
    let animationFrameId: number;
    const animate = () => {
      updateCelestialPositions();
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [simulationTime, orbitControlsRef.current]);

  useEffect(() => {
    THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);
  }, []);

  // Calculate maneuver node scale based on camera distance
  useEffect(() => {
    if (orbitControlsRef.current && maneuverNodes.length > 0) {
      const camera = orbitControlsRef.current.object;
      const nodePosition = maneuverNodes[0].position;
      const distance = camera.position.distanceTo(nodePosition);
      // Simplified scale calculation
      const scale = Math.pow(distance, 0.6) / 5;
      setManeuverNodeScale(scale);
    }
  }, [orbitControlsRef.current, maneuverNodes]);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
            {/* Single Canvas for all 3D content */}
            <div style={{ width: '100%', height: '100%' }}>
                <Canvas 
                    camera={{ 
                        position: [0, 0, sun.radius * sun.scale * 10], 
                        fov: 45,
                        near: 1,
                        far: 10000000000000,
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
                    <Stars 
                        radius={sun.radius * sun.scale * 10000} 
                        depth={50} 
                        count={50000} 
                        factor={6} 
                        saturation={1} 
                        fade={false}
                        speed={1}
                    />

          {/* <Spaceship
            body={spaceship}
            currentTime={simulationTime}
            isSelected={selectedBody?.name === spaceship.name}
            onSelect={handleSelectBody}
          /> */}

          {/* Celestial bodies */}
          {planetData.map((planet) => {
            const body = {
              ...planet,
              orbit: orbitData[planet.name as keyof typeof orbitData],
            };
            if (body.orbit) {
              return (
                <React.Fragment key={planet.name}>
                  <CelestialBodyComponent
                    body={body}
                    currentTime={simulationTime}
                    isSelected={selectedBody?.name === planet.name}
                    onSelect={handleSelectBody}
                    simulationStartTime={simulationStartTime}
                  />
                  <OrbitLine2
                    orbit={body.orbit}
                    color={body.color}
                    onOrbitClick={handleOrbitClick}
                    maneuverNodes={maneuverNodes}
                    selectedManeuver={selectedManeuver}
                  />
                </React.Fragment>
              );
            } else {
              return null;
            }
          })}

          {/* <OrbitLine2
            orbit={saturn.orbit}
            color={saturn.color}
            onOrbitClick={handleOrbitClick}
            maneuverNodes={maneuverNodes}
            selectedManeuver={selectedManeuver}
          />*/}

          {/* Render all maneuver nodes */}
          {maneuverNodes.map((node) => (
            <ManeuverNode
              key={node.id}
              id={node.id}
              position={node.position}
              deltaV={node.deltaV}
              scale={maneuverNodeScale} // Removed the multiplier since we're using a better scale calculation
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
            maxDistance={sun.radius * sun.scale * 10000} // Increased from 100 to 1000 for extreme zoom out
            zoomSpeed={2.5} // Increased from 2.0 to 2.5 for even faster zooming
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
        onButtonClick={handlePromptButtonClick}
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

      {/* Zoom shortcuts helper */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          color: "white",
          zIndex: 1000,
          background: "rgba(0,0,0,0.7)",
          padding: "10px",
          borderRadius: "5px",
          fontFamily: "monospace",
          fontSize: "12px",
          textAlign: "left",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Zoom Controls:</div>
        <div>Mouse Wheel: Zoom in/out</div>
        <div>+ key: Zoom out 10x</div>
        <div>- key: Zoom in 2x</div>
        <div>0 key: Toggle object/system view</div>
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
      {/* 2D Sun representation in system view */}
      {(isWideView || zoomLevel === "extreme") && (
        <>
          
          {/* Sun */}
          <div 
            className={`sun-container ${selectedBody?.name === sun.name ? 'selected' : ''}`}
            style={{
              position: "absolute",
              left: `${sunScreenPosition.x - 5}px`,
              top: `${sunScreenPosition.y - 3}px`,
              transform: "translate(-50%, -50%)",
              width: "60px",
              height: "60px",
              zIndex: 900,
              cursor: "pointer",
              pointerEvents: "auto"
            }}
            onClick={() => handleSelectBody(sun)}
          >
            <div 
              className="sun-2d" 
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                animation: selectedBody?.name === sun.name ? "selectedSun 3s infinite alternate" : "sunPulse 4s infinite ease-in-out",
                pointerEvents: "auto"
              }}
              onClick={() => handleSelectBody(sun)}
            />
            <div 
              className="planet-label" 
              style={{
                position: "absolute",
                top: "-8px"
              }}
              onClick={() => handleSelectBody(sun)}
            >
              Sun
            </div>
          </div>
          
          {/* Mercury */}
          <div 
            className={`planet-container ${selectedBody?.name === mercury.name ? 'selected' : ''}`}
            style={{
              position: "absolute",
              left: `${planetScreenPositions.Mercury.x}px`,
              top: `${planetScreenPositions.Mercury.y}px`,
              transform: "translate(-50%, -50%)",
              width: "30px",
              height: "30px"
            }}
            onClick={() => handleSelectBody(mercury)}
          >
            <div className="planet-point mercury-point" onClick={() => handleSelectBody(mercury)}></div>
            <div className="planet-label" onClick={() => handleSelectBody(mercury)}>Mercury</div>
          </div>
          
          {/* Venus */}
          <div 
            className={`planet-container ${selectedBody?.name === venus.name ? 'selected' : ''}`}
            style={{
              position: "absolute", 
              left: `${planetScreenPositions.Venus.x}px`,
              top: `${planetScreenPositions.Venus.y}px`,
              transform: "translate(-50%, -50%)",
              width: "36px",
              height: "36px"
            }}
            onClick={() => handleSelectBody(venus)}
          >
            <div className="planet-point venus-point" onClick={() => handleSelectBody(venus)}></div>
            <div className="planet-label" onClick={() => handleSelectBody(venus)}>Venus</div>
          </div>
          
          {/* Earth */}
          <div 
            className={`planet-container ${selectedBody?.name === earth.name ? 'selected' : ''}`}
            style={{
              position: "absolute",
              left: `${planetScreenPositions.Earth.x}px`,
              top: `${planetScreenPositions.Earth.y}px`,
              transform: "translate(-50%, -50%)",
              width: "38px",
              height: "38px"
            }}
            onClick={() => handleSelectBody(earth)}
          >
            <div className="planet-point earth-point" onClick={() => handleSelectBody(earth)}></div>
            <div className="planet-label" onClick={() => handleSelectBody(earth)}>Earth</div>
          </div>
          
          {/* Moon */}
          <div 
            className={`planet-container ${selectedBody?.name === moon.name ? 'selected' : ''}`}
            style={{
              position: "absolute",
              left: `${planetScreenPositions.Moon.x}px`,
              top: `${planetScreenPositions.Moon.y}px`,
              transform: "translate(-50%, -50%)",
              width: "26px",
              height: "26px"
            }}
            onClick={() => handleSelectBody(moon)}
          >
            <div className="planet-point moon-point" onClick={() => handleSelectBody(moon)}></div>
            <div className="planet-label" onClick={() => handleSelectBody(moon)}>Moon</div>
          </div>
          
          {/* Mars */}
          <div 
            className={`planet-container ${selectedBody?.name === mars.name ? 'selected' : ''}`}
            style={{
              position: "absolute",
              left: `${planetScreenPositions.Mars.x}px`,
              top: `${planetScreenPositions.Mars.y}px`,
              transform: "translate(-50%, -50%)",
              width: "34px", 
              height: "34px"
            }}
            onClick={() => handleSelectBody(mars)}
          >
            <div className="planet-point mars-point" onClick={() => handleSelectBody(mars)}></div>
            <div className="planet-label" onClick={() => handleSelectBody(mars)}>Mars</div>
          </div>
          
          {/* Jupiter */}
          <div 
            className={`planet-container ${selectedBody?.name === jupiter.name ? 'selected' : ''}`}
            style={{
              position: "absolute",
              left: `${planetScreenPositions.Jupiter.x}px`,
              top: `${planetScreenPositions.Jupiter.y}px`,
              transform: "translate(-50%, -50%)",
              width: "48px",
              height: "48px"
            }}
            onClick={() => handleSelectBody(jupiter)}
          >
            <div className="planet-point jupiter-point" onClick={() => handleSelectBody(jupiter)}></div>
            <div className="planet-label" onClick={() => handleSelectBody(jupiter)}>Jupiter</div>
          </div>
          
          {/* Saturn */}
          <div 
            className={`planet-container ${selectedBody?.name === saturn.name ? 'selected' : ''}`}
            style={{
              position: "absolute",
              left: `${planetScreenPositions.Saturn.x}px`,
              top: `${planetScreenPositions.Saturn.y}px`,
              transform: "translate(-50%, -50%)",
              width: "45px",
              height: "45px"
            }}
            onClick={() => handleSelectBody(saturn)}
          >
            <div className="planet-point saturn-point" onClick={() => handleSelectBody(saturn)}></div>
            <div className="planet-label" onClick={() => handleSelectBody(saturn)}>Saturn</div>
          </div>
          
          {/* Uranus */}
          <div 
            className={`planet-container ${selectedBody?.name === uranus.name ? 'selected' : ''}`}
            style={{
              position: "absolute",
              left: `${planetScreenPositions.Uranus.x}px`,
              top: `${planetScreenPositions.Uranus.y}px`,
              transform: "translate(-50%, -50%)",
              width: "42px",
              height: "42px"
            }}
            onClick={() => handleSelectBody(uranus)}
          >
            <div className="planet-point uranus-point" onClick={() => handleSelectBody(uranus)}></div>
            <div className="planet-label" onClick={() => handleSelectBody(uranus)}>Uranus</div>
          </div>
          
          {/* Neptune */}
          <div 
            className={`planet-container ${selectedBody?.name === neptune.name ? 'selected' : ''}`}
            style={{
              position: "absolute",
              left: `${planetScreenPositions.Neptune.x}px`,
              top: `${planetScreenPositions.Neptune.y}px`,
              transform: "translate(-50%, -50%)",
              width: "42px",
              height: "42px"
            }}
            onClick={() => handleSelectBody(neptune)}
          >
            <div className="planet-point neptune-point" onClick={() => handleSelectBody(neptune)}></div>
            <div className="planet-label" onClick={() => handleSelectBody(neptune)}>Neptune</div>
          </div>
          
          {/* Spaceship */}
          <div 
            className={`planet-container ${selectedBody?.name === spaceship.name ? 'selected' : ''}`}
            style={{
              position: "absolute",
              left: `${planetScreenPositions.Spaceship.x}px`,
              top: `${planetScreenPositions.Spaceship.y}px`,
              transform: "translate(-50%, -50%)",
              width: "28px",
              height: "28px"
            }}
            onClick={() => handleSelectBody(spaceship)}
          >
            <div className="planet-point spaceship-point" onClick={() => handleSelectBody(spaceship)}></div>
            <div className="planet-label" onClick={() => handleSelectBody(spaceship)}>Spaceship</div>
          </div>
        </>
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

