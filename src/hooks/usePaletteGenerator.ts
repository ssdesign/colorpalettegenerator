import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  AppState,
  Palette,
  StrictnessLevel,
  ChartType,
  Color,
  TokenSettings
} from '../types';
import {
  generateCategoricalPalette as generateOriginalCategoricalPalette,
  generateSequentialPalette as generateOriginalSequentialPalette,
  generateDivergingPalette,
  generateToken,
  checkWCAGCompliance,
  generateDistinctColors,
  getTargetContrastForLevel,
  optimizeColorForBackground
} from '../utils/colorUtils';
import chroma from 'chroma-js';

// Generate a unique ID
const generateId = (): string => {
  return uuidv4();
};

const initialState: AppState = {
  lightModeBaseColor: '#FFFFFF',
  darkModeBaseColor: '#121212',
  currentMode: 'light',
  palettes: [],
  tokenSettings: {
    prefix: 'color.dataviz'
  },
  selectedChartType: 'bar',
  strictnessLevel: 'AALarge',
  selectedPaletteType: 'categorical'
};

export const usePaletteGenerator = () => {
  const [state, setState] = useState<AppState>(initialState);

  // Update the token for a specific color in a palette
  const updateColorTokens = useCallback((palettes: Palette[], newPrefix?: string): Palette[] => {
    console.log("updateColorTokens called with", { 
      palettesCount: palettes.length,
      statePrefix: state.tokenSettings.prefix,
      newPrefix: newPrefix 
    });
    
    // Use the explicitly passed prefix if provided, otherwise use the one from state
    const prefixToUse = newPrefix !== undefined ? newPrefix : state.tokenSettings.prefix;
    console.log("Using prefix:", prefixToUse);
    
    return palettes.map(palette => {
      const updatedColors = palette.colors.map((color, index) => {
        const newToken = generateToken(
          prefixToUse,
          palette.name.toLowerCase().replace(/\s+/g, '-'),
          palette.type,
          index
        );
        
        if (index === 0) {
          console.log(`Sample token update: "${color.token}" -> "${newToken}"`);
        }
        
        return {
          ...color,
          token: newToken
        };
      });

      return {
        ...palette,
        colors: updatedColors
      };
    });
  }, []);  // Remove the dependency on state.tokenSettings.prefix to avoid stale closures

  // Set the light mode base color
  const setLightModeBaseColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, lightModeBaseColor: color }));
  }, []);

  // Set the dark mode base color
  const setDarkModeBaseColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, darkModeBaseColor: color }));
  }, []);

  // Toggle between light and dark mode
  const toggleMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentMode: prev.currentMode === 'light' ? 'dark' : 'light'
    }));
  }, []);

  // Set the current mode explicitly
  const setMode = useCallback((mode: 'light' | 'dark') => {
    setState(prev => ({ ...prev, currentMode: mode }));
  }, []);

  // Update token settings
  const updateTokenSettings = useCallback((settings: TokenSettings) => {
    console.log("updateTokenSettings called with", { 
      newPrefix: settings.prefix,
      currentPrefix: state.tokenSettings.prefix
    });
    
    setState(prev => {
      console.log("Inside setState with", {
        prevPrefix: prev.tokenSettings.prefix,
        newPrefix: settings.prefix,
        prefixChanged: prev.tokenSettings.prefix !== settings.prefix
      });
      
      // First update the token settings
      const newState = { ...prev, tokenSettings: settings };
      
      // Then update all palette color tokens
      if (prev.tokenSettings.prefix !== settings.prefix) {
        console.log("Prefix changed, updating color tokens");
        newState.palettes = updateColorTokens(prev.palettes, settings.prefix);
        console.log("Tokens updated for all palettes");
      } else {
        console.log("Prefix unchanged, skipping token update");
      }
      
      return newState;
    });
  }, [updateColorTokens]);

  // Set the selected chart type
  const setChartType = useCallback((chartType: ChartType) => {
    setState(prev => ({ ...prev, selectedChartType: chartType }));
  }, []);

  // Set the strictness level
  const setStrictnessLevel = useCallback((level: StrictnessLevel) => {
    setState(prev => ({ ...prev, strictnessLevel: level }));
  }, []);

  // Edit a palette name
  const editPaletteName = useCallback((paletteId: string, name: string) => {
    setState(prev => ({
      ...prev,
      palettes: prev.palettes.map(palette => 
        palette.id === paletteId 
          ? { ...palette, name }
          : palette
      )
    }));
  }, []);

  // Edit a color name
  const editColorName = useCallback((paletteId: string, colorIndex: number, name: string) => {
    setState(prev => ({
      ...prev,
      palettes: prev.palettes.map(palette => {
        if (palette.id === paletteId) {
          const newColors = [...palette.colors];
          newColors[colorIndex] = {
            ...newColors[colorIndex],
            name,
            token: `${name.toLowerCase().replace(/\s+/g, '-')}`
          };
          return { ...palette, colors: newColors };
        }
        return palette;
      })
    }));
  }, []);

  // Edit a color hex
  const editColorHex = useCallback((paletteId: string, colorIndex: number, hex: string, mode?: 'light' | 'dark') => {
    setState(prev => {
      // Determine current and other mode
      const currentMode = mode || prev.currentMode;
      const otherMode = currentMode === 'light' ? 'dark' : 'light';
      
      // Get background colors for contrast calculations
      const currentBgColor = currentMode === 'light' ? prev.lightModeBaseColor : prev.darkModeBaseColor;
      const otherBgColor = otherMode === 'light' ? prev.lightModeBaseColor : prev.darkModeBaseColor;
      
      // Get strictness level for contrast requirements
      const strictnessLevel = prev.strictnessLevel;
      let minContrast = 4.5; // Default AA
      if (strictnessLevel === 'AALarge') minContrast = 3.0;
      else if (strictnessLevel === 'AAASmall') minContrast = 7.0;
      else if (strictnessLevel === 'AAALarge') minContrast = 4.5;
      
      // Generate a true complementary color for the other mode
      const generateComplementaryColor = (sourceHex: string, targetBgColor: string): string => {
        // Extract HSL values from the color
        const colorHsl = chroma(sourceHex).hsl();
        const hue = colorHsl[0] || 0; // Handle NaN values
        const sat = colorHsl[1] || 0.5;
        const light = colorHsl[2] || 0.5;
        
        // Create a significantly different complementary color
        let targetHex: string;
        
        if (otherMode === 'dark') {
          // For dark mode: Same hue, much more saturated, much darker
          targetHex = chroma.hsl(
            hue,
            Math.min(1, sat + 0.4), // Even more saturated
            Math.max(0.1, light - 0.4) // Even darker
          ).hex();
        } else {
          // For light mode: Same hue, much less saturated, much lighter
          targetHex = chroma.hsl(
            hue,
            Math.max(0.05, sat - 0.3), // Even less saturated
            Math.min(0.97, light + 0.4) // Even lighter
          ).hex();
        }
        
        // Ensure colors are visibly different (minimum color distance)
        const colorDistance = chroma.distance(sourceHex, targetHex);
        console.log(`Initial color distance check: ${colorDistance}`);
        
        // Always ensure a minimum color distance
        const MIN_COLOR_DISTANCE = 50; // Force a larger minimum distance
        
        if (colorDistance < MIN_COLOR_DISTANCE) { 
          console.log(`Colors not different enough (distance: ${colorDistance}), applying extreme adjustment`);
          
          // Create a more extreme complementary color
          if (otherMode === 'dark') {
            // Force a very dark, saturated color for dark mode
            targetHex = chroma.hsl(
              hue,
              1.0, // Maximum saturation
              Math.max(0.05, Math.min(0.3, light - 0.5)) // Very dark (0.05-0.3)
            ).hex();
          } else {
            // Force a very light, desaturated color for light mode
            targetHex = chroma.hsl(
              hue,
              Math.max(0.0, Math.min(0.3, sat - 0.4)), // Very desaturated (0.0-0.3)
              Math.min(0.98, 0.9) // Very light (0.9-0.98)
            ).hex();
          }
          
          // Check the new distance
          const newDistance = chroma.distance(sourceHex, targetHex);
          console.log(`After extreme adjustment, color distance: ${newDistance}`);
          
          // If still too similar, shift the hue slightly as a last resort
          if (newDistance < MIN_COLOR_DISTANCE) {
            const hueShift = otherMode === 'dark' ? 15 : -15; // Small hue shift
            targetHex = chroma.hsl(
              (hue + hueShift + 360) % 360, // Ensure hue is within 0-360 range
              otherMode === 'dark' ? 1.0 : Math.max(0.0, sat - 0.4),
              otherMode === 'dark' ? Math.max(0.05, light - 0.5) : Math.min(0.98, 0.9)
            ).hex();
            
            console.log(`Applied hue shift, new distance: ${chroma.distance(sourceHex, targetHex)}`);
          }
        }
        
        // Optimize for contrast with background if needed
        const contrastWithBg = chroma.contrast(targetHex, targetBgColor);
        if (contrastWithBg < minContrast) {
          console.log(`Adjusting color to meet contrast ratio: ${contrastWithBg.toFixed(2)} → ${minContrast}`);
          return optimizeColorForBackground(targetHex, targetBgColor, minContrast);
        }
        
        // Final check to ensure we're returning a different color
        if (targetHex.toLowerCase() === sourceHex.toLowerCase()) {
          console.error("CRITICAL: Generated identical colors. Forcing difference.");
          // Force a completely different color as a last resort
          if (otherMode === 'dark') {
            return chroma.hsl((hue + 180) % 360, 1.0, 0.2).hex();
          } else {
            return chroma.hsl((hue + 180) % 360, 0.2, 0.9).hex();
          }
        }
        
        return targetHex;
      };
      
      return {
        ...prev,
        palettes: prev.palettes.map(palette => {
          if (palette.id !== paletteId) return palette;
          
          // Create a copy of colors array
          const newColors = JSON.parse(JSON.stringify(palette.colors));
          const color = newColors[colorIndex];
          
          console.log(`Editing color at index ${colorIndex} in ${palette.type} palette (${currentMode} mode)`);
          
          // Different handling based on palette type
          if (palette.type === 'categorical') {
            // For categorical palettes, we need to create a new object to avoid reference issues
            // This ensures React detects the change and triggers a re-render
            console.log(`BEFORE - Categorical color at index ${colorIndex}:`, {
              light: newColors[colorIndex].light.hex,
              dark: newColors[colorIndex].dark.hex
            });
            
            // Generate complementary color with extra contrast to ensure it's different
            let complementaryHex = generateComplementaryColor(hex, otherBgColor);
            
            // Extra check to ensure colors are visually different
            const colorDistance = chroma.distance(hex, complementaryHex);
            console.log(`Initial color distance check: ${colorDistance}`);
            
            // If colors are still too similar, create an even more distinct complementary color
            if (colorDistance < 40) {
              console.log(`WARNING: Colors still too similar, applying extreme contrast!`);
              
              // Get the hue of the selected color
              const hsl = chroma(hex).hsl();
              const hue = hsl[0] || 0;
              
              if (otherMode === 'dark') {
                // Create a much darker and more saturated color for dark mode
                complementaryHex = chroma.hsl(
                  hue,                    // Same hue
                  1,                      // Maximum saturation
                  Math.max(0.05, 0.2)     // Very dark (0.05-0.2)
                ).hex();
              } else {
                // Create a much lighter and less saturated color for light mode
                complementaryHex = chroma.hsl(
                  hue,                    // Same hue
                  Math.max(0.05, 0.3),    // Low saturation (0.05-0.3)
                  Math.min(0.95, 0.9)     // Very light (0.9-0.95)
                ).hex();
              }
              
              // Final check of the new complementary color
              const newDistance = chroma.distance(hex, complementaryHex);
              console.log(`After extreme adjustment, color distance: ${newDistance}`);
            }
            
            // Force the hex values to be strings and different from each other
            const safeHex = String(hex);
            let safeComplementaryHex = String(complementaryHex);
            
            // Final emergency check - if colors still look the same, force them to be visibly different
            if (safeHex.toLowerCase() === safeComplementaryHex.toLowerCase() || 
                chroma.distance(safeHex, safeComplementaryHex) < 30) {
              console.error("EMERGENCY: Colors still too similar, forcing complementary color!");
              
              // Use color's HSL but force extreme changes
              const hsl = chroma(safeHex).hsl();
              const hue = hsl[0] || 0;
              
              // Create a color with the same hue but extreme saturation/lightness difference
              if (otherMode === 'dark') {
                // For dark mode: very dark and saturated
                safeComplementaryHex = chroma.hsl(
                  hue, 
                  1.0,  // Full saturation
                  0.15  // Very dark
                ).hex();
              } else {
                // For light mode: very light and desaturated
                safeComplementaryHex = chroma.hsl(
                  hue,
                  0.15,  // Very desaturated
                  0.92   // Very light
                ).hex();
              }
              
              console.log(`FORCED complementary color: ${safeComplementaryHex}`);
            }
            
            // Update the colors with brand new objects to avoid reference issues
            if (currentMode === 'light') {
              newColors[colorIndex] = {
                ...newColors[colorIndex],
                light: {
                  ...newColors[colorIndex].light,
                  hex: safeHex,
                  contrastRatio: chroma.contrast(safeHex, prev.lightModeBaseColor)
                },
                dark: {
                  ...newColors[colorIndex].dark,
                  hex: safeComplementaryHex,
                  contrastRatio: chroma.contrast(safeComplementaryHex, prev.darkModeBaseColor)
                }
              };
            } else {
              newColors[colorIndex] = {
                ...newColors[colorIndex],
                dark: {
                  ...newColors[colorIndex].dark,
                  hex: safeHex,
                  contrastRatio: chroma.contrast(safeHex, prev.darkModeBaseColor)
                },
                light: {
                  ...newColors[colorIndex].light,
                  hex: safeComplementaryHex,
                  contrastRatio: chroma.contrast(safeComplementaryHex, prev.lightModeBaseColor)
                }
              };
            }
            
            // Update WCAG compliance information for both modes
            newColors[colorIndex].light.wcagCompliance = checkWCAGCompliance(
              newColors[colorIndex].light.hex, 
              prev.lightModeBaseColor
            );
            
            newColors[colorIndex].dark.wcagCompliance = checkWCAGCompliance(
              newColors[colorIndex].dark.hex, 
              prev.darkModeBaseColor
            );
            
            // Log the final colors to verify they're different
            console.log(`AFTER - Categorical color at index ${colorIndex}:`, {
              light: newColors[colorIndex].light.hex,
              dark: newColors[colorIndex].dark.hex,
              colorDistance: chroma.distance(
                newColors[colorIndex].light.hex, 
                newColors[colorIndex].dark.hex
              )
            });
          } else if (palette.type === 'sequential' || palette.type === 'diverging') {
            // Only allow editing key colors
            const isEditable = color.editable === true || (
              palette.type === 'sequential' ? 
                (colorIndex === 0 || colorIndex === newColors.length - 1) : 
                (colorIndex === 0 || colorIndex === Math.floor(newColors.length / 2) || colorIndex === newColors.length - 1)
            );
            
            if (!isEditable) {
              console.log('This color position is not editable in this palette type');
              return palette;
            }
            
            // Generate complementary color for the other mode
            let complementaryHex = generateComplementaryColor(hex, otherBgColor);
            
            // For sequential/diverging palettes, we need to ensure even more contrast between light/dark
            // colors at key positions to create distinct gradients
            if (palette.type === 'sequential' || palette.type === 'diverging') {
              // Get color properties
              const hsl = chroma(hex).hsl();
              const hue = hsl[0] || 0;
              const sat = hsl[1] || 0.5;
              const light = hsl[2] || 0.5;
              
              // Check current distance
              const currentDistance = chroma.distance(hex, complementaryHex);
              console.log(`Sequential key color initial distance: ${currentDistance}`);
              
              // Create more extreme version for key colors to enforce distinctness
              if (currentDistance < 60) {
                console.log("Enforcing stronger contrast for sequential/diverging key color");
                
                // Generate an entirely new complementary color with extreme differences
                if (otherMode === 'dark') {
                  // Much darker and more saturated for dark mode
                  complementaryHex = chroma.hsl(
                    hue,
                    Math.min(1.0, sat + 0.5),    // Much more saturated
                    Math.min(0.3, light - 0.4)   // Much darker
                  ).hex();
                } else {
                  // Much lighter and less saturated for light mode
                  complementaryHex = chroma.hsl(
                    hue,
                    Math.max(0.0, sat - 0.4),    // Much less saturated
                    Math.max(0.7, light + 0.3)   // Much lighter
                  ).hex();
                }
              }
            }
            
            // For sequential/diverging palettes, create extreme color differences
            // between light and dark modes to ensure distinct gradients
            if (palette.type === 'sequential' || palette.type === 'diverging') {
              // Force distinct colors for each mode to make key colors properly distinct
              // This is critical for sequential/diverging palettes to create proper gradients
              const hsl = chroma(hex).hsl();
              const hue = hsl[0] || 0;
              
              // Skip the standard complementary color and force extreme differences
              if (otherMode === 'dark') {
                // Always create a very dark, saturated version for dark mode
                complementaryHex = chroma.hsl(
                  hue,                  // Keep the same hue
                  1.0,                  // Full saturation 
                  0.2                   // Very dark
                ).hex();
              } else {
                // Always create a very light, less saturated version for light mode
                complementaryHex = chroma.hsl(
                  hue,                  // Keep the same hue
                  0.2,                  // Low saturation
                  0.85                  // Very light
                ).hex();
              }
              
              // Additional handling for yellow colors which can be problematic
              // (this helps with your specific example from the screenshot)
              if (hue >= 50 && hue <= 70) { // Yellow range
                if (otherMode === 'dark') {
                  // Make yellows darker and more saturated in dark mode
                  complementaryHex = chroma.hsl(hue, 1.0, 0.15).hex();
                } else {
                  // Make yellows lighter and less saturated in light mode
                  complementaryHex = chroma.hsl(hue, 0.15, 0.9).hex();
                }
              }
              
              // Check final contrast against the background
              const contrastWithBg = chroma.contrast(complementaryHex, otherBgColor);
              if (contrastWithBg < minContrast) {
                console.log(`Adjusting to meet contrast requirements (${contrastWithBg.toFixed(2)} → ${minContrast})`);
                complementaryHex = optimizeColorForBackground(complementaryHex, otherBgColor, minContrast);
              }
              
              // Log final color distance to verify
              console.log(`Final color distance: ${chroma.distance(hex, complementaryHex)}`);
            }
            
            // Ensure hex values are different strings and log them
            const safeHex = String(hex);
            const safeComplementaryHex = String(complementaryHex);
            console.log(`Final hex values: Current=${safeHex}, Complementary=${safeComplementaryHex}`);
            
            // Update the key color with user's selection and complementary color
            if (currentMode === 'light') {
              newColors[colorIndex].light.hex = safeHex;
              newColors[colorIndex].dark.hex = safeComplementaryHex;
            } else {
              newColors[colorIndex].dark.hex = safeHex;
              newColors[colorIndex].light.hex = safeComplementaryHex;
            }
            
            // Update contrast and WCAG info for the edited key color
            newColors[colorIndex].light.contrastRatio = chroma.contrast(
              newColors[colorIndex].light.hex, 
              prev.lightModeBaseColor
            );
            newColors[colorIndex].light.wcagCompliance = checkWCAGCompliance(
              newColors[colorIndex].light.hex, 
              prev.lightModeBaseColor
            );
            
            newColors[colorIndex].dark.contrastRatio = chroma.contrast(
              newColors[colorIndex].dark.hex, 
              prev.darkModeBaseColor
            );
            newColors[colorIndex].dark.wcagCompliance = checkWCAGCompliance(
              newColors[colorIndex].dark.hex, 
              prev.darkModeBaseColor
            );
            
            // For sequential palette
            if (palette.type === 'sequential') {
              const firstIndex = 0;
              const lastIndex = newColors.length - 1;
              
              // Regenerate scales independently for both modes
              // Light mode scale
              const lightFirstColor = newColors[firstIndex].light.hex;
              const lightLastColor = newColors[lastIndex].light.hex;
              const lightColorScale = chroma.scale([lightFirstColor, lightLastColor])
                .mode('lch')
                .colors(newColors.length);
              
              // Dark mode scale
              const darkFirstColor = newColors[firstIndex].dark.hex;
              const darkLastColor = newColors[lastIndex].dark.hex;
              const darkColorScale = chroma.scale([darkFirstColor, darkLastColor])
                .mode('lch')
                .colors(newColors.length);
              
              // Update intermediate colors
              for (let i = 1; i < newColors.length - 1; i++) {
                // Update colors
                newColors[i].light.hex = lightColorScale[i]; 
                newColors[i].dark.hex = darkColorScale[i];
                
                // Update contrast and compliance
                newColors[i].light.contrastRatio = chroma.contrast(
                  newColors[i].light.hex, 
                  prev.lightModeBaseColor
                );
                newColors[i].light.wcagCompliance = checkWCAGCompliance(
                  newColors[i].light.hex, 
                  prev.lightModeBaseColor
                );
                
                newColors[i].dark.contrastRatio = chroma.contrast(
                  newColors[i].dark.hex, 
                  prev.darkModeBaseColor
                );
                newColors[i].dark.wcagCompliance = checkWCAGCompliance(
                  newColors[i].dark.hex, 
                  prev.darkModeBaseColor
                );
              }
            } 
            // For diverging palette
            else if (palette.type === 'diverging') {
              const firstIndex = 0;
              const middleIndex = Math.floor(newColors.length / 2);
              const lastIndex = newColors.length - 1;
              
              // Generate scales independently for both modes
              
              // Light mode scales
              const lightColorScaleLeft = chroma.scale([
                newColors[firstIndex].light.hex, 
                newColors[middleIndex].light.hex
              ]).mode('lch').colors(middleIndex + 1);
              
              const lightColorScaleRight = chroma.scale([
                newColors[middleIndex].light.hex, 
                newColors[lastIndex].light.hex
              ]).mode('lch').colors(lastIndex - middleIndex + 1);
              
              // Dark mode scales
              const darkColorScaleLeft = chroma.scale([
                newColors[firstIndex].dark.hex, 
                newColors[middleIndex].dark.hex
              ]).mode('lch').colors(middleIndex + 1);
              
              const darkColorScaleRight = chroma.scale([
                newColors[middleIndex].dark.hex, 
                newColors[lastIndex].dark.hex
              ]).mode('lch').colors(lastIndex - middleIndex + 1);
              
              // Update first half (excluding first and middle)
              for (let i = 1; i < middleIndex; i++) {
                // Update colors
                newColors[i].light.hex = lightColorScaleLeft[i];
                newColors[i].dark.hex = darkColorScaleLeft[i];
                
                // Update contrast and compliance
                newColors[i].light.contrastRatio = chroma.contrast(
                  newColors[i].light.hex, 
                  prev.lightModeBaseColor
                );
                newColors[i].light.wcagCompliance = checkWCAGCompliance(
                  newColors[i].light.hex, 
                  prev.lightModeBaseColor
                );
                
                newColors[i].dark.contrastRatio = chroma.contrast(
                  newColors[i].dark.hex, 
                  prev.darkModeBaseColor
                );
                newColors[i].dark.wcagCompliance = checkWCAGCompliance(
                  newColors[i].dark.hex, 
                  prev.darkModeBaseColor
                );
              }
              
              // Update second half (excluding middle and last)
              for (let i = middleIndex + 1; i < lastIndex; i++) {
                const scaleIndex = i - middleIndex;
                
                // Update colors
                newColors[i].light.hex = lightColorScaleRight[scaleIndex];
                newColors[i].dark.hex = darkColorScaleRight[scaleIndex];
                
                // Update contrast and compliance
                newColors[i].light.contrastRatio = chroma.contrast(
                  newColors[i].light.hex, 
                  prev.lightModeBaseColor
                );
                newColors[i].light.wcagCompliance = checkWCAGCompliance(
                  newColors[i].light.hex, 
                  prev.lightModeBaseColor
                );
                
                newColors[i].dark.contrastRatio = chroma.contrast(
                  newColors[i].dark.hex, 
                  prev.darkModeBaseColor
                );
                newColors[i].dark.wcagCompliance = checkWCAGCompliance(
                  newColors[i].dark.hex, 
                  prev.darkModeBaseColor
                );
              }
            }
          }
          
          // Dispatch event to notify about the color change
          setTimeout(() => {
            const colorChangeEvent = new CustomEvent('colorChanged', {
              detail: { 
                paletteId,
                colorIndex,
                newColor: hex,
                mode: currentMode,
                otherModeColor: newColors[colorIndex][otherMode].hex,
                paletteType: palette.type
              }
            });
            document.dispatchEvent(colorChangeEvent);
          }, 0);
          
          return { ...palette, colors: newColors };
        })
      };
    });
  }, []);

  // Reorder colors within a palette
  const reorderColors = useCallback((paletteId: string, oldIndex: number, newIndex: number) => {
    console.log(`usePaletteGenerator.reorderColors: Moving color from index ${oldIndex} to ${newIndex} in palette ${paletteId}`);
    
    // Validate indices to prevent errors
    if (oldIndex === undefined || newIndex === undefined || 
        isNaN(oldIndex) || isNaN(newIndex) || 
        oldIndex < 0 || newIndex < 0) {
      console.error('Invalid indices for reorderColors', { oldIndex, newIndex });
      return;
    }
    
    setState(prev => {
      // Find the palette we're reordering
      const targetPalette = prev.palettes.find(p => p.id === paletteId);
      
      if (!targetPalette) {
        console.error(`Palette with ID ${paletteId} not found`);
        return prev;
      }
      
      if (oldIndex >= targetPalette.colors.length || newIndex >= targetPalette.colors.length) {
        console.error('Index out of bounds for reorderColors', { 
          oldIndex, 
          newIndex, 
          paletteLength: targetPalette.colors.length 
        });
        return prev;
      }
      
      // Log the colors being reordered for debugging
      console.log('Color being moved:', {
        name: targetPalette.colors[oldIndex].name,
        lightHex: targetPalette.colors[oldIndex].light.hex,
        darkHex: targetPalette.colors[oldIndex].dark.hex
      });
      
      return {
        ...prev,
        palettes: prev.palettes.map(palette => {
          if (palette.id === paletteId) {
            // Create a deep copy of the colors array to ensure no references are shared
            const newColors = palette.colors.map(color => ({
              ...color,
              light: { ...color.light },
              dark: { ...color.dark }
            }));
            
            // Remove the item at the old index
            const [movedColor] = newColors.splice(oldIndex, 1);
            
            // Insert the item at the new index
            newColors.splice(newIndex, 0, movedColor);
            
            console.log(`Moved color ${movedColor.name} from position ${oldIndex} to ${newIndex}`, {
              movedColorLight: movedColor.light.hex,
              movedColorDark: movedColor.dark.hex
            });
            
            // Dispatch an event to notify components that a color has been moved
            setTimeout(() => {
              const colorMovedEvent = new CustomEvent('colorMoved', {
                detail: { 
                  paletteId,
                  oldIndex,
                  newIndex,
                  color: movedColor
                }
              });
              document.dispatchEvent(colorMovedEvent);
            }, 0);
            
            // Return the updated palette with a complete new reference
            return { 
              ...palette, 
              colors: newColors 
            };
          }
          return palette;
        })
      };
    });
  }, []);

  // Generate a categorical palette with distinct colors
  const generateCategoricalPalette = (
    count: number,
    lightBackground: string,
    darkBackground: string,
    targetContrast: number
  ): Palette => {
    // Generate distinct colors that are coordinated between light and dark modes
    const { light: lightModeColors, dark: darkModeColors } = generateDistinctColors(
      count, 
      lightBackground, 
      darkBackground, 
      targetContrast
    );
    
    // Create colors array with both light and dark mode variations
    const colors: Color[] = lightModeColors.map((lightHex, index) => {
      const darkHex = darkModeColors[index];
      
      // Calculate compliance metrics
      const lightCompliance = checkWCAGCompliance(lightHex, lightBackground);
      const darkCompliance = checkWCAGCompliance(darkHex, darkBackground);
      
      // Calculate contrast ratios
      const lightContrastRatio = chroma.contrast(lightHex, lightBackground);
      const darkContrastRatio = chroma.contrast(darkHex, darkBackground);
      
      return {
        name: `Color ${index + 1}`,
        token: `color-${index + 1}`,
        light: {
          hex: lightHex,
          contrastRatio: lightContrastRatio,
          wcagCompliance: {
            AALarge: lightCompliance.AALarge,
            AASmall: lightCompliance.AASmall,
            AAALarge: lightCompliance.AAALarge,
            AAASmall: lightCompliance.AAASmall
          }
        },
        dark: {
          hex: darkHex,
          contrastRatio: darkContrastRatio,
          wcagCompliance: {
            AALarge: darkCompliance.AALarge,
            AASmall: darkCompliance.AASmall,
            AAALarge: darkCompliance.AAALarge,
            AAASmall: darkCompliance.AAASmall
          }
        }
      };
    });
    
    return {
      id: uuidv4(),
      name: 'Categorical Palette',
      type: 'categorical',
      colors,
      lightModeBackground: lightBackground,
      darkModeBackground: darkBackground
    };
  };

  // Generate a sequential palette with a color gradient
  const generateSequentialPalette = (
    count: number,
    lightBackground: string,
    darkBackground: string,
    targetContrast: number
  ): Palette => {
    // For sequential palettes, use the improved function from colorUtils
    const colors = generateOriginalSequentialPalette(
      '', // baseColor is not used in the updated implementation
      lightBackground,
      darkBackground,
      state.strictnessLevel
    );
    
    return {
      id: uuidv4(),
      name: 'Sequential Palette',
      type: 'sequential',
      colors,
      lightModeBackground: lightBackground,
      darkModeBackground: darkBackground
    };
  };

  // Generate diverging palette
  const createDivergingPalette = (
    count: number,
    lightBackground: string,
    darkBackground: string,
    targetContrast: number
  ): Palette => {
    // For diverging palettes, we'll use two gradients that meet in the middle
    
    // First random color (start)
    const hue1 = Math.random() * 360;
    const startColor = chroma.hsl(hue1, 0.8, 0.5).hex();
    
    // Second random color (end) - use complementary color for good contrast
    const hue2 = (hue1 + 180) % 360;
    const endColor = chroma.hsl(hue2, 0.8, 0.5).hex();
    
    // Create a diverging color scale
    const midColor = '#f5f5f5'; // Light neutral color in the middle
    const fullGradient = chroma.scale([
      startColor,
      midColor,
      endColor
    ]).mode('lab').colors(count);
    
    // Create color objects for each color in the gradient
    const colors: Color[] = fullGradient.map((baseHex, index) => {
      // For each base color, optimize for light and dark mode if needed
      let lightHex = baseHex;
      let darkHex = baseHex;
      
      // Calculate middle index
      const middleIndex = Math.floor(count / 2);
      
      // Determine if this is a key color (editable) - first, middle, or last
      const isKeyColor = index === 0 || index === middleIndex || index === count - 1;
      
      // Optimize colors for contrast if they're near the middle (which might be too light/dark)
      const isMiddleArea = index > Math.floor(count / 3) && index < Math.floor(count * 2 / 3);
      
      if (isMiddleArea) {
        // For light mode, make sure middle colors have enough contrast
        const lightContrast = chroma.contrast(lightHex, lightBackground);
        if (lightContrast < targetContrast) {
          lightHex = chroma(lightHex).darken(1).hex();
        }
        
        // For dark mode, adjust middle colors for dark background
        const darkContrast = chroma.contrast(darkHex, darkBackground);
        if (darkContrast < targetContrast) {
          darkHex = chroma(darkHex).brighten(1).hex();
        }
      }
      
      // Calculate compliance metrics for the optimized colors
      const lightCompliance = checkWCAGCompliance(lightHex, lightBackground);
      const darkCompliance = checkWCAGCompliance(darkHex, darkBackground);
      
      // Calculate contrast ratios
      const lightContrastRatio = chroma.contrast(lightHex, lightBackground);
      const darkContrastRatio = chroma.contrast(darkHex, darkBackground);
      
      // Set appropriate name based on position
      let colorName = `Auto ${index + 1}`;
      if (index === 0) {
        colorName = 'First';
      } else if (index === middleIndex) {
        colorName = 'Middle';
      } else if (index === count - 1) {
        colorName = 'Last';
      }
      
      return {
        name: colorName,
        token: `diverging-${index + 1}`,
        editable: isKeyColor, // Explicitly mark key colors as editable
        light: {
          hex: lightHex,
          contrastRatio: lightContrastRatio,
          wcagCompliance: {
            AALarge: lightCompliance.AALarge,
            AASmall: lightCompliance.AASmall,
            AAALarge: lightCompliance.AAALarge,
            AAASmall: lightCompliance.AAASmall
          }
        },
        dark: {
          hex: darkHex,
          contrastRatio: darkContrastRatio,
          wcagCompliance: {
            AALarge: darkCompliance.AALarge,
            AASmall: darkCompliance.AASmall,
            AAALarge: darkCompliance.AAALarge,
            AAASmall: darkCompliance.AAASmall
          }
        }
      };
    });
    
    return {
      id: uuidv4(),
      name: 'Diverging Palette',
      type: 'diverging',
      colors,
      lightModeBackground: lightBackground,
      darkModeBackground: darkBackground
    };
  };

  // Generate new palettes based on the current settings
  const generatePalettes = useCallback(() => {
    // Target contrast ratios for accessibility
    const targetContrastRatio = getTargetContrastForLevel(state.strictnessLevel);
    
    // Create palette types
    const newPalettes: Palette[] = [];
    
    // Generate a categorical palette with 12 colors
    const categoricalPalette = generateCategoricalPalette(
      12, // Number of colors
      state.lightModeBaseColor,
      state.darkModeBaseColor,
      targetContrastRatio
    );
    newPalettes.push(categoricalPalette);
    
    // Generate a sequential palette with 12 colors
    const sequentialPalette = generateSequentialPalette(
      12, // Number of colors
      state.lightModeBaseColor,
      state.darkModeBaseColor,
      targetContrastRatio
    );
    newPalettes.push(sequentialPalette);
    
    // Generate a diverging palette with 12 colors
    const divergingPalette = createDivergingPalette(
      12, // Number of colors
      state.lightModeBaseColor,
      state.darkModeBaseColor,
      targetContrastRatio
    );
    newPalettes.push(divergingPalette);
    
    // Update state with new palettes while preserving the selected palette type
    setState(prev => ({ 
      ...prev, 
      palettes: newPalettes,
      selectedPaletteType: prev.selectedPaletteType // Preserve the selected type
    }));
  }, [state.lightModeBaseColor, state.darkModeBaseColor, state.strictnessLevel]);
  
  // Regenerate a specific palette by ID
  const regeneratePalette = useCallback((paletteId: string) => {
    // Target contrast ratios for accessibility
    const targetContrastRatio = getTargetContrastForLevel(state.strictnessLevel);
    
    setState(prev => {
      // Find the palette to regenerate
      const paletteToRegenerate = prev.palettes.find(p => p.id === paletteId);
      
      if (!paletteToRegenerate) {
        console.error(`Palette with ID ${paletteId} not found`);
        return prev;
      }
      
      // Generate a new palette based on the type
      let newPalette: Palette;
      const paletteName = paletteToRegenerate.name;
      
      switch(paletteToRegenerate.type) {
        case 'categorical':
          newPalette = generateCategoricalPalette(
            12,
            prev.lightModeBaseColor,
            prev.darkModeBaseColor,
            targetContrastRatio
          );
          newPalette.id = paletteId; // Keep the same ID
          newPalette.name = paletteName; // Keep the same name
          break;
          
        case 'sequential':
          newPalette = generateSequentialPalette(
            12,
            prev.lightModeBaseColor,
            prev.darkModeBaseColor,
            targetContrastRatio
          );
          newPalette.id = paletteId; // Keep the same ID
          newPalette.name = paletteName; // Keep the same name
          break;
          
        case 'diverging':
          newPalette = createDivergingPalette(
            12,
            prev.lightModeBaseColor,
            prev.darkModeBaseColor,
            targetContrastRatio
          );
          newPalette.id = paletteId; // Keep the same ID
          newPalette.name = paletteName; // Keep the same name
          break;
          
        default:
          console.error(`Unknown palette type: ${paletteToRegenerate.type}`);
          return prev;
      }
      
      // Replace the old palette with the regenerated one
      return {
        ...prev,
        palettes: prev.palettes.map(p => 
          p.id === paletteId ? newPalette : p
        )
      };
    });
  }, [state.lightModeBaseColor, state.darkModeBaseColor, state.strictnessLevel]);

  // Set the selected palette type
  const setPaletteType = useCallback((type: 'categorical' | 'sequential' | 'diverging') => {
    setState(prev => ({ ...prev, selectedPaletteType: type }));
  }, []);

  // Return the state and the state-updating functions
  return {
    state,
    setLightModeBaseColor,
    setDarkModeBaseColor,
    toggleMode,
    setMode,
    updateTokenSettings,
    setChartType,
    setStrictnessLevel,
    editPaletteName,
    editColorName,
    editColorHex,
    reorderColors,
    generatePalettes,
    regeneratePalette,
    setPaletteType
  };
};

export default usePaletteGenerator; 