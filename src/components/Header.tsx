import React from 'react';
import { DynamicLogo } from './DynamicLogo';
import ModeToggle from './ModeToggle';
import { AppState } from '../types';

interface HeaderProps {
  state: AppState;
  onLightModeColorChange: (color: string) => void;
  onDarkModeColorChange: (color: string) => void;
  onTokenSettingsChange: (settings: any) => void;
  onModeChange: (mode: 'light' | 'dark') => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onLightModeColorChange,
  onDarkModeColorChange,
  onTokenSettingsChange,
  onModeChange
}) => {
  // Refs to store temporary color values
  const lightColorRef = React.useRef(state.lightModeBaseColor);
  const darkColorRef = React.useRef(state.darkModeBaseColor);

  // Color change timeout ref
  const colorChangeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle color picker changes
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>, isLightMode: boolean) => {
    const newColor = e.target.value;
    
    // Update the ref for visual feedback
    if (isLightMode) {
      lightColorRef.current = newColor;
    } else {
      darkColorRef.current = newColor;
    }
    
    // Clear any existing timeout
    if (colorChangeTimeoutRef.current) {
      clearTimeout(colorChangeTimeoutRef.current);
    }
    
    // Set a new timeout to update the state
    colorChangeTimeoutRef.current = setTimeout(() => {
      if (isLightMode) {
        onLightModeColorChange(newColor);
      } else {
        onDarkModeColorChange(newColor);
      }
    }, 200);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 py-6">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <DynamicLogo />
          
          <div className="flex items-start gap-16">
            {/* Background Colors */}
            <div className="flex items-start gap-16">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-500 h-5">Light mode background :</span>
                <div className="flex flex-col items-start">
                  <div className="w-[64px] h-[40px] bg-white rounded shadow-md p-1.5 relative">
                    <div 
                      className="w-full h-full rounded cursor-pointer"
                      style={{ backgroundColor: lightColorRef.current }}
                      onClick={() => document.getElementById('lightModeColor')?.click()}
                    />
                    <input 
                      id="lightModeColor"
                      type="color"
                      value={state.lightModeBaseColor}
                      onChange={(e) => handleColorChange(e, true)}
                      className="absolute top-0 left-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={'#' + state.lightModeBaseColor.substring(1).toUpperCase()}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.startsWith('#') && value.length <= 7) {
                        onLightModeColorChange(value);
                        lightColorRef.current = value;
                      }
                    }}
                    className="text-xs text-gray-500 font-mono mt-1.5 w-20 text-center bg-transparent"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-500 h-5">Dark mode background :</span>
                <div className="flex flex-col items-start">
                  <div className="w-[64px] h-[40px] bg-white rounded shadow-md p-1.5 relative">
                    <div 
                      className="w-full h-full rounded cursor-pointer"
                      style={{ backgroundColor: darkColorRef.current }}
                      onClick={() => document.getElementById('darkModeColor')?.click()}
                    />
                    <input 
                      id="darkModeColor"
                      type="color"
                      value={state.darkModeBaseColor}
                      onChange={(e) => handleColorChange(e, false)}
                      className="absolute top-0 left-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={'#' + state.darkModeBaseColor.substring(1).toUpperCase()}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.startsWith('#') && value.length <= 7) {
                        onDarkModeColorChange(value);
                        darkColorRef.current = value;
                      }
                    }}
                    className="text-xs text-gray-500 font-mono mt-1.5 w-20 text-center bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Token Settings */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-500 h-5">Token prefix :</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={state.tokenSettings.prefix}
                  onChange={(e) => {
                    // Update token settings immediately when typing
                    const newPrefix = e.target.value;
                    onTokenSettingsChange({ ...state.tokenSettings, prefix: newPrefix });
                  }}
                  className="px-3 py-1.5 border border-gray-200 rounded text-sm w-48"
                  placeholder="e.g. color.dataviz.categorical.palette-name.01"
                />
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center self-center gap-2">
              
              <ModeToggle 
                mode={state.currentMode} 
                onChange={onModeChange}
              />
             
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}; 