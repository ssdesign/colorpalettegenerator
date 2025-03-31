import React from 'react';
import { DynamicLogo } from './DynamicLogo';
import { Header } from './Header';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { AppState, StrictnessLevel } from '../types';

interface LayoutProps {
  state: AppState;
  onPaletteTypeChange: (type: 'categorical' | 'sequential' | 'diverging') => void;
  onChartTypeChange: (type: 'bar' | 'line' | 'stackedBar' | 'pie') => void;
  onEditPaletteName: (id: string, name: string) => void;
  onEditColorName: (id: string, index: number, name: string) => void;
  onEditColorHex: (id: string, index: number, hex: string, mode: 'light' | 'dark') => void;
  onReorderColors: (id: string, oldIndex: number, newIndex: number) => void;
  onRegeneratePalette: (id: string) => void;
  onLightModeColorChange: (color: string) => void;
  onDarkModeColorChange: (color: string) => void;
  onTokenSettingsChange: (settings: { prefix: string }) => void;
  onModeChange: (mode: 'light' | 'dark') => void;
  onStrictnessLevelChange: (level: StrictnessLevel) => void;
  getCurrentPalette: () => any;
  getCurrentBackground: () => string;
  getContrastTextColor: () => string;
}

export const Layout: React.FC<LayoutProps> = ({
  state,
  onPaletteTypeChange,
  onChartTypeChange,
  onEditPaletteName,
  onEditColorName,
  onEditColorHex,
  onReorderColors,
  onRegeneratePalette,
  onLightModeColorChange,
  onDarkModeColorChange,
  onTokenSettingsChange,
  onModeChange,
  onStrictnessLevelChange,
  getCurrentPalette,
  getCurrentBackground,
  getContrastTextColor
}) => {
  // Footer height for calculations
  const footerHeight = 60;

  return (
    <div className="fixed inset-0 flex flex-col">
      <Header 
        state={state}
        onLightModeColorChange={onLightModeColorChange}
        onDarkModeColorChange={onDarkModeColorChange}
        onTokenSettingsChange={onTokenSettingsChange}
        onModeChange={onModeChange}
      />
      
      <div 
        className="flex flex-1 mt-[176px] pb-[60px]"
        style={{ 
          backgroundColor: getCurrentBackground(),
          color: getContrastTextColor(),
          position: 'relative', // For positioning content
          overflow: 'auto' // Allow scrolling if needed
        }}
      >
        <LeftPanel
          state={state}
          onPaletteTypeChange={onPaletteTypeChange}
          onEditPaletteName={onEditPaletteName}
          onEditColorName={onEditColorName}
          onEditColorHex={onEditColorHex}
          onReorderColors={onReorderColors}
          onRegeneratePalette={onRegeneratePalette}
          onStrictnessLevelChange={onStrictnessLevelChange}
          getCurrentBackground={getCurrentBackground}
        />

        <RightPanel
          state={state}
          onChartTypeChange={onChartTypeChange}
          getCurrentPalette={getCurrentPalette}
          getCurrentBackground={getCurrentBackground}
        />
      </div>
      
      {/* Footer */}
      <div 
        className="fixed bottom-0 left-0 right-0 flex flex-col shadow-sm z-10"
        style={{ 
          backgroundColor: getCurrentBackground(),
          borderTop: `1px solid ${state.currentMode === 'light' ? '#E5E7EB' : '#374151'}`,
          color: getContrastTextColor()
        }}
      >
        <div className="max-w-[1920px] mx-auto w-full flex items-center px-24">
          <div className="flex-1 py-2">
            <p className="text-sm">Check out more experiments on Crafx Labs website</p>
          </div>
          <div className="flex gap-4 text-sm py-2">
            <a href="#" className="hover:underline">Privacy</a>
            <span>|</span>
            <a href="#" className="hover:underline">Terms and </a>
            <span>|</span>
            <a href="#" className="hover:underline">Contact</a>
          </div>
        </div>
        <div 
          className="text-center text-xs py-1 max-w-[1920px] mx-auto w-full px-24"
          style={{ 
            borderTop: `1px solid ${state.currentMode === 'light' ? '#E5E7EB' : '#374151'}`,
            opacity: 0.8
          }}
        >
          © Crafx labs 2025
        </div>
      </div>
    </div>
  );
}; 