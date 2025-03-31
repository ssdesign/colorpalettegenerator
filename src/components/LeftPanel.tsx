import React from 'react';
import PaletteDisplay from './PaletteDisplay';
import { AppState, StrictnessLevel } from '../types';
import chroma from 'chroma-js';

interface LeftPanelProps {
  state: AppState;
  onPaletteTypeChange: (type: 'categorical' | 'sequential' | 'diverging') => void;
  onEditPaletteName: (id: string, name: string) => void;
  onEditColorName: (id: string, index: number, name: string) => void;
  onEditColorHex: (id: string, index: number, hex: string, mode: 'light' | 'dark') => void;
  onReorderColors: (id: string, oldIndex: number, newIndex: number) => void;
  onRegeneratePalette: (id: string) => void;
  getCurrentBackground: () => string;
  onStrictnessLevelChange: (level: StrictnessLevel) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  state,
  onPaletteTypeChange,
  onEditPaletteName,
  onEditColorName,
  onEditColorHex,
  onReorderColors,
  onRegeneratePalette,
  getCurrentBackground,
  onStrictnessLevelChange
}) => {
  const currentBackground = getCurrentBackground();
  const isDarkMode = chroma(currentBackground).get('lab.l') < 50;
  const textColor = isDarkMode ? '#FFFFFF' : '#333333';
  const inactiveTextColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const borderColor = isDarkMode ? '#374151' : '#E5E7EB';
  const activeColor = isDarkMode ? '#60A5FA' : '#0066FF';

  return (
    <div className="w-[65%] border-r flex flex-col h-full pl-24" style={{ borderColor }}>
      <div className="container mx-auto px-6 py-4 border-b flex-shrink-0" style={{ borderColor }}>
        <div className="flex justify-between items-center py-3">
          <div className="flex gap-8">
            {[
              { display: 'Categorical', value: 'categorical' as const },
              { display: 'Sequential', value: 'sequential' as const },
              { display: 'Diverging', value: 'diverging' as const }
            ].map((tab) => (
              <button
                key={tab.display}
                className="pb-2 px-1 text-sm font-medium relative"
                style={{
                  color: state.selectedPaletteType === tab.value ? activeColor : inactiveTextColor
                }}
                onClick={() => onPaletteTypeChange(tab.value)}
              >
                {tab.display}
                {state.selectedPaletteType === tab.value && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: activeColor }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 py-4">
          {state.palettes
            .filter(p => p.type === state.selectedPaletteType)
            .map(palette => (
              <PaletteDisplay 
                key={palette.id}
                palette={palette}
                currentMode={state.currentMode}
                strictnessLevel={state.strictnessLevel}
                lightBackground={state.lightModeBaseColor}
                darkBackground={state.darkModeBaseColor}
                onEditName={(name) => onEditPaletteName(palette.id, name)}
                onEditColorName={(index, name) => onEditColorName(palette.id, index, name)}
                onEditColorHex={(index, hex, mode) => onEditColorHex(palette.id, index, hex, mode)}
                onReorderColors={(oldIndex, newIndex) => onReorderColors(palette.id, oldIndex, newIndex)}
                onRegeneratePalette={onRegeneratePalette}
                textColor={textColor}
                inactiveTextColor={inactiveTextColor}
                borderColor={borderColor}
                onStrictnessLevelChange={onStrictnessLevelChange}
                tokenPrefix={state.tokenSettings.prefix}
              />
          ))}
        </div>
      </div>
    </div>
  );
}; 