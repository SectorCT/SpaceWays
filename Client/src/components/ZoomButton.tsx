import React from 'react';

interface ZoomButtonProps {
  onZoom: () => void;
  isZoomedIn: boolean;
}

export const ZoomButton: React.FC<ZoomButtonProps> = ({ onZoom, isZoomedIn }) => {
  return (
    <div className={`zoom-button ${isZoomedIn ? 'zoomed-in' : ''}`} onClick={onZoom} title={isZoomedIn ? "Zoom Out" : "Zoom In"}>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        {isZoomedIn ? (
          <line x1="8" y1="11" x2="14" y2="11"></line>
        ) : (
          <>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </>
        )}
      </svg>
    </div>
  );
} 