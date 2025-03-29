import { CelestialBody } from '../types/CelestialBody';
import { OrbitData2 } from '../types/Orbit2';
import './InfoPanel.css';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

interface InfoPanelProps {
  selectedBody: CelestialBody | null;
  onClose: () => void;
}

export function InfoPanel({ selectedBody, onClose }: InfoPanelProps) {
  const [headerStyle, setHeaderStyle] = useState<React.CSSProperties>({});
  const [lightAccentColor, setLightAccentColor] = useState<string>("");
  const [textAccentColor, setTextAccentColor] = useState<string>("");

  useEffect(() => {
    if (selectedBody) {
      // Create a Three.js color from the body's color (handles both hex and named colors)
      const bodyColor = new THREE.Color(selectedBody.color);
      
      // Create slightly different shades for various UI elements
      const darkerColor = new THREE.Color(bodyColor).multiplyScalar(0.7);
      const lighterColor = new THREE.Color(bodyColor).multiplyScalar(1.3);
      
      // Convert to CSS-compatible rgba strings
      const mainColorRGBA = `rgba(${Math.floor(bodyColor.r * 255)}, ${Math.floor(bodyColor.g * 255)}, ${Math.floor(bodyColor.b * 255)}, 0.7)`;
      const darkerColorRGBA = `rgba(${Math.floor(darkerColor.r * 255)}, ${Math.floor(darkerColor.g * 255)}, ${Math.floor(darkerColor.b * 255)}, 0.7)`;
      const lighterColorRGBA = `rgba(${Math.floor(lighterColor.r * 255)}, ${Math.floor(lighterColor.g * 255)}, ${Math.floor(lighterColor.b * 255)}, 0.5)`;
      const textColorHex = `#${lighterColor.getHexString()}`;
      
      // Set the header gradient using the body's color
      setHeaderStyle({
        background: `linear-gradient(to right, ${mainColorRGBA}, ${darkerColorRGBA})`,
        borderBottom: `1px solid ${lighterColorRGBA}`
      });
      
      // Set accent colors for other elements
      setLightAccentColor(lighterColorRGBA);
      setTextAccentColor(textColorHex);
    }
  }, [selectedBody]);

  if (!selectedBody) return null;

  const formatMass = (mass: number) => {
    const superscriptMap: { [key: string]: string } = {
      '0': '⁰',
      '1': '¹',
      '2': '²',
      '3': '³',
      '4': '⁴',
      '5': '⁵',
      '6': '⁶',
      '7': '⁷',
      '8': '⁸',
      '9': '⁹',
    };
  
    const toSuperscript = (exponent: number) => {
      return exponent.toString().split('').map(digit => superscriptMap[digit] || digit).join('');
    };
  
    const exponents = [
      { threshold: 1e24 },
      { threshold: 1e21 }
    ];
  
    for (const { threshold } of exponents) {
      if (mass >= threshold) {
        const exponent = Math.floor(Math.log10(mass));
        const base = mass / Math.pow(10, exponent);
        return `${base.toFixed(2)} × 10${toSuperscript(exponent)} kg`;
      }
    }
  
    return `${mass.toExponential(2)} kg`; // For smaller masses
  };
  
  

  const formatDistance = (distance: number) => {
    if (distance >= 1000) return `${(distance / 1000).toFixed(2)}k km`;
    return `${distance.toFixed(2)} km`;
  };

  // Calculate orbital parameters from OrbitData2
  const calculateOrbitalParameters = (orbit: OrbitData2) => {
    const timestamps = Object.keys(orbit).map(Number).sort((a, b) => a - b);
    if (timestamps.length < 2) return null;

    // Get all positions
    const positions = timestamps.map(t => orbit[t.toFixed(1)]);
    
    // Find apoapsis and periapsis
    let maxDist = 0;
    let minDist = Infinity;
    
    positions.forEach(pos => {
        const dist = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]);
        maxDist = Math.max(maxDist, dist);
        minDist = Math.min(minDist, dist);
    });

    // Calculate orbital period
    const period = timestamps[timestamps.length - 1] - timestamps[0];

    // Calculate semi-major axis
    const semiMajorAxis = (maxDist + minDist) / 2;

    // Calculate eccentricity
    const eccentricity = (maxDist - minDist) / (maxDist + minDist);

    return {
        apoapsis: maxDist,
        periapsis: minDist,
        semiMajorAxis,
        eccentricity,
        period
    };
  };

  // Custom styles for the panel based on the celestial body
  const panelStyle: React.CSSProperties = {
    border: `1px solid ${lightAccentColor}`
  };

  // Custom styles for section dividers
  const sectionStyle: React.CSSProperties = {
    borderBottom: `1px solid ${lightAccentColor}`
  };

  // Custom styles for section headers
  const sectionHeaderStyle: React.CSSProperties = {
    color: textAccentColor
  };

  const orbitalParams = calculateOrbitalParameters(selectedBody.orbit);

  return (
    <div className="info-panel" style={panelStyle}>
      <div className="info-panel-header" style={headerStyle}>
        <h2>{selectedBody.name}</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="info-panel-body">
        <div className="info-section" style={sectionStyle}>
          <div className="info-row">
            <span className="info-label">Radius:</span>
            <span className="info-value">{formatDistance(selectedBody.radius)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Mass:</span>
            <span className="info-value">{formatMass(selectedBody.mass)}</span>
          </div>
        </div>

        {orbitalParams && (
          <div className="info-section">
            <h3 style={sectionHeaderStyle}>Orbital Parameters</h3>
            <div className="info-row">
              <span className="info-label">Semi-major axis:</span>
              <span className="info-value">{formatDistance(orbitalParams.semiMajorAxis)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Eccentricity:</span>
              <span className="info-value">{orbitalParams.eccentricity.toFixed(4)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Orbital period:</span>
              <span className="info-value">{(orbitalParams.period / 86400).toFixed(2)} days</span>
            </div>
            <div className="info-row">
              <span className="info-label">Apoapsis:</span>
              <span className="info-value">{formatDistance(orbitalParams.apoapsis)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Periapsis:</span>
              <span className="info-value">{formatDistance(orbitalParams.periapsis)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 