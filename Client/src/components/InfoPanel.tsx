import { CelestialBody } from '../types/CelestialBody';
import './InfoPanel.css';

interface InfoPanelProps {
  selectedBody: CelestialBody | null;
  onClose: () => void;
}

export function InfoPanel({ selectedBody, onClose }: InfoPanelProps) {
  if (!selectedBody) return null;

  const formatMass = (mass: number) => {
    if (mass >= 1e24) return `${(mass / 1e24).toFixed(2)} × 10²⁴ kg`;
    if (mass >= 1e21) return `${(mass / 1e21).toFixed(2)} × 10²¹ kg`;
    return `${mass.toExponential(2)} kg`;
  };

  const formatDistance = (distance: number) => {
    if (distance >= 1000) return `${(distance / 1000).toFixed(2)} million km`;
    return `${distance.toFixed(2)} km`;
  };

  return (
    <div className="info-panel">
      <div className="info-panel-header">
        <h2>{selectedBody.name}</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="info-panel-body">
        <div className="info-section">
          <div className="info-row">
            <span className="info-label">Radius:</span>
            <span className="info-value">{formatDistance(selectedBody.radius)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Mass:</span>
            <span className="info-value">{formatMass(selectedBody.mass)}</span>
          </div>
        </div>

        <div className="info-section">
          <h3>Orbital Parameters</h3>
          <div className="info-row">
            <span className="info-label">Semi-major axis:</span>
            <span className="info-value">{formatDistance(selectedBody.orbit.semi_major_axis)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Eccentricity:</span>
            <span className="info-value">{selectedBody.orbit.eccentricity.toFixed(4)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Orbital period:</span>
            <span className="info-value">{(selectedBody.orbit.orbital_period / 86400).toFixed(2)} days</span>
          </div>
          <div className="info-row">
            <span className="info-label">Apoapsis:</span>
            <span className="info-value">{formatDistance(selectedBody.orbit.apoapsis)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Periapsis:</span>
            <span className="info-value">{formatDistance(selectedBody.orbit.periapsis)}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 