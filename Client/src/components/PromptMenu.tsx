import React, { useEffect } from 'react';

interface PromptButton {
    label: string;
    onClick: (params?: any) => void;
}

interface PromptMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    buttons: PromptButton[];
    onClose: () => void;
    onButtonClick: (button: PromptButton) => void;
}

export function PromptMenu({ isOpen, position, buttons, onClose, onButtonClick }: PromptMenuProps) {
    useEffect(() => {
        if (isOpen) {
            const handleClickOutside = (event: MouseEvent) => {
                const promptElement = document.getElementById('orbit-prompt');
                if (promptElement && !promptElement.contains(event.target as Node)) {
                    onClose();
                }
            };

            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handlePromptClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div
            id="orbit-prompt"
            onClick={handlePromptClick}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid #444',
                borderRadius: '8px',
                padding: '8px',
                zIndex: 1000,
                minWidth: '200px'
            }}
        >
            {buttons.map((button, index) => (
                <button
                    key={index}
                    onClick={(e) => {
                        e.stopPropagation();
                        onButtonClick(button);
                    }}
                    className="orbit-prompt-button"
                >
                    {button.label}
                </button>
            ))}
        </div>
    );
} 