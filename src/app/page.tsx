'use client';

import React from 'react';
import { Layout } from '../components/Layout';
import { usePaletteGenerator } from '../hooks/usePaletteGenerator';

export default function Home() {
  const {
    state,
    setLightModeBaseColor,
    setDarkModeBaseColor,
    setMode,
    updateTokenSettings,
    setChartType,
    setPaletteType,
    editPaletteName,
    editColorName,
    editColorHex,
    reorderColors,
    generatePalettes,
    regeneratePalette,
    setStrictnessLevel
  } = usePaletteGenerator();

  // Generate palettes on initial load if none exist
  React.useEffect(() => {
    if (state.palettes.length === 0) {
      generatePalettes();
    }
  }, [state.palettes.length, generatePalettes]);

  // Regenerate palettes when background colors or strictness level changes
  React.useEffect(() => {
    if (state.palettes.length > 0) {
      generatePalettes();
    }
  }, [state.lightModeBaseColor, state.darkModeBaseColor, state.strictnessLevel, generatePalettes]);

  // Get the current background color based on mode
  const getCurrentBackground = () => {
    return state.currentMode === 'light' ? 
      state.lightModeBaseColor : 
      state.darkModeBaseColor;
  };

  // Get contrasting text color for current background
  const getContrastTextColor = () => {
    return state.currentMode === 'light' ? '#333333' : '#EEEEEE';
  };

  // Get current palette for chart display
  const getCurrentPalette = () => {
    return state.palettes.find(palette => palette.type === state.selectedPaletteType) || state.palettes[0];
  };

  return (
    <Layout
      state={state}
      onPaletteTypeChange={setPaletteType}
      onChartTypeChange={setChartType}
      onEditPaletteName={editPaletteName}
      onEditColorName={editColorName}
      onEditColorHex={editColorHex}
      onReorderColors={reorderColors}
      onRegeneratePalette={regeneratePalette}
      onLightModeColorChange={setLightModeBaseColor}
      onDarkModeColorChange={setDarkModeBaseColor}
      onTokenSettingsChange={updateTokenSettings}
      onModeChange={setMode}
      onStrictnessLevelChange={setStrictnessLevel}
      getCurrentPalette={getCurrentPalette}
      getCurrentBackground={getCurrentBackground}
      getContrastTextColor={getContrastTextColor}
    />
  );
}
