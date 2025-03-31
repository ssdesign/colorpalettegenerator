import React, { useState } from 'react';
import chroma from 'chroma-js';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  contrastColor?: string;
}

const ColorInput: React.FC<ColorInputProps> = ({ 
  label, 
  value, 
  onChange,
  contrastColor
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [error, setError] = useState('');

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setTempValue(newColor);
    onChange(newColor);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTempValue(newValue);
    setError('');
  };

  const applyHexColor = () => {
    try {
      if (tempValue.trim()) {
        // Only validate and apply if there's actual content
        const validHex = chroma(tempValue).hex();
        onChange(validHex);
        setError('');
      }
    } catch (e) {
      setError('Invalid hex color');
    }
    setIsEditing(false);
  };

  const calculateContrast = () => {
    if (!contrastColor) return null;
    
    try {
      const contrast = chroma.contrast(value, contrastColor);
      return contrast.toFixed(2);
    } catch (e) {
      return null;
    }
  };

  const contrast = calculateContrast();

  return (
    <div className="flex flex-col">
      <label className="text-sm mb-1">{label}</label>
      <div className="flex items-center space-x-2">
        <div className="relative flex-shrink-0">
          <input
            type="color"
            value={value}
            onChange={handleColorPickerChange}
            className="absolute opacity-0 w-8 h-8 cursor-pointer"
            style={{ zIndex: 1 }}
          />
          <div 
            className="w-8 h-8 rounded border cursor-pointer" 
            style={{ backgroundColor: value }}
          ></div>
        </div>
        
        <div className="flex-grow relative">
          {isEditing ? (
            <div className="flex space-x-1">
              <input
                type="text"
                value={tempValue}
                onChange={handleHexInputChange}
                onBlur={applyHexColor}
                onKeyDown={(e) => e.key === 'Enter' && applyHexColor()}
                className={`border px-2 py-1 text-sm font-mono w-28 ${error ? 'border-red-500' : 'border-gray-300'}`}
                autoFocus
              />
              {error && <span className="text-red-500 text-xs absolute -bottom-5">{error}</span>}
            </div>
          ) : (
            <div 
              className="text-sm px-2 py-1 font-mono bg-gray-100 dark:bg-gray-800 rounded cursor-pointer" 
              onClick={() => {
                setTempValue(value);
                setIsEditing(true);
              }}
            >
              {value}
            </div>
          )}
        </div>

        {contrast && (
          <div className="text-xs">
            <span 
              className={
                Number(contrast) >= 4.5 
                  ? 'text-green-600 dark:text-green-400' 
                  : Number(contrast) >= 3 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-red-600 dark:text-red-400'
              }
            >
              {contrast}:1
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorInput; 