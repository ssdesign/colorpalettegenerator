import React, { useState, useEffect, useRef } from 'react';
import { CheckCircleIcon, XCircleIcon, ArrowUturnLeftIcon, ExclamationTriangleIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { Color, StrictnessLevel } from '../types';
import chroma from 'chroma-js';
import { isColorTooSimilar, MIN_PERCEPTUAL_DISTANCE, calculateContrastRatio } from '../utils/colorUtils';

interface PaletteDisplayProps {
  palette: {
    id: string;
    name: string;
    type: 'categorical' | 'sequential' | 'diverging';
    colors: Color[];
  };
  currentMode: 'light' | 'dark';
  strictnessLevel: StrictnessLevel;
  lightBackground?: string;
  darkBackground?: string;
  onEditName: (name: string) => void;
  onEditColorName: (index: number, name: string) => void;
  onEditColorHex: (index: number, hex: string, mode: 'light' | 'dark') => void;
  onReorderColors: (oldIndex: number, newIndex: number) => void;
  onRegeneratePalette: (paletteId: string) => void;
  textColor: string;
  inactiveTextColor: string;
  borderColor: string;
  onStrictnessLevelChange: (level: StrictnessLevel) => void;
  tokenPrefix?: string;
}

interface SortableItemProps {
  id: string;
  color: Color;
  index: number;
  currentMode: 'light' | 'dark';
  position: number;
  paletteType?: 'categorical' | 'sequential' | 'diverging';
  paletteName: string;
  tokenPrefix: string;
  allColors: Color[];
  onEditColorName: (index: number, name: string) => void;
  onEditColorHex: (index: number, hex: string, mode: 'light' | 'dark') => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst: boolean;
  isLast: boolean;
  strictnessLevel: StrictnessLevel;
  onStrictnessLevelChange: (level: StrictnessLevel) => void;
  textColor: string;
  inactiveTextColor: string;
  borderColor: string;
}

const SortableItem: React.FC<SortableItemProps> = ({ 
  id, 
  color, 
  index, 
  currentMode,
  position,
  paletteType = 'categorical',
  paletteName,
  tokenPrefix,
  allColors,
  onEditColorName, 
  onEditColorHex,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  strictnessLevel,
  onStrictnessLevelChange,
  textColor,
  inactiveTextColor,
  borderColor
}) => {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(color.name);
  const [originalColor, setOriginalColor] = useState<string | null>(null);
  const [tempColor, setTempColor] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [tooSimilarWarning, setTooSimilarWarning] = useState<{
    active: boolean;
    similarColors: { color: string; distance: number }[];
  }>({ active: false, similarColors: [] });
  const colorChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const modeColor = currentMode === 'light' ? color.light : color.dark;
  const contrastRatio = modeColor.contrastRatio;
  
  // Check compliance for different text sizes based on WCAG guidelines
  const isAALargeCompliant = modeColor.wcagCompliance.AALarge;
  const isAASmallCompliant = modeColor.wcagCompliance.AASmall;
  const isAAALargeCompliant = modeColor.wcagCompliance.AAALarge;
  const isAAASmallCompliant = modeColor.wcagCompliance.AAASmall;

  const style = {};

  // Reset states when color changes from external sources
  useEffect(() => {
    setTempName(color.name);
    // If we're not in the middle of editing (no originalColor set), reset warning states
    if (!originalColor) {
      setTooSimilarWarning({ active: false, similarColors: [] });
      setTempColor(null);
    }
  }, [color, originalColor]);

  // Add event listener for reset colors event
  useEffect(() => {
    const handleResetColors = (e: CustomEvent) => {
      const eventDetail = e.detail as { paletteId: string };
      // Extract the paletteId from the id format "color-{paletteId}-{index}"
      const idParts = id.split('-');
      const itemPaletteId = idParts.length >= 3 ? idParts[1] : '';
      
      console.log(`Reset event received for palette ${eventDetail.paletteId}, this item's palette: ${itemPaletteId}, has originalColor: ${!!originalColor}`);
      
      // Only handle this event if we have an originalColor to reset to and the palette matches
      if (originalColor && eventDetail.paletteId === itemPaletteId) {
        console.log(`Resetting color at index ${index} to ${originalColor}`);
        onEditColorHex(index, originalColor, currentMode);
        setOriginalColor(null);
        setTempColor(null);
        setTooSimilarWarning({ active: false, similarColors: [] });
      }
    };

    // Listen for reset event
    document.addEventListener('resetAllColors', handleResetColors as EventListener);

    // Clean up
    return () => {
      document.removeEventListener('resetAllColors', handleResetColors as EventListener);
    };
  }, [id, index, originalColor, onEditColorHex, currentMode]);

  // Replace with improved version that handles both prepare move and color move events:
  useEffect(() => {
    // Handler for preparing to move colors - captures state before move
    const handlePrepareMoveColor = (e: CustomEvent) => {
      const { paletteId, oldIndex, newIndex, originalColor: movedOriginalColor } = e.detail;
      const idParts = id.split('-');
      const itemPaletteId = idParts.length >= 3 ? idParts[1] : '';
      
      // If this event is for our palette
      if (itemPaletteId === paletteId) {
        if (index === oldIndex) {
          console.log(`This color at index ${index} is about to be moved to ${newIndex}`);
          
          // Store all state in data attributes for later recovery
          const element = document.querySelector(`[data-color-id="${id}"]`);
          if (element) {
            // If we have original color state, save it
            if (originalColor) {
              (element as HTMLElement).dataset.wasModified = 'true';
              (element as HTMLElement).dataset.originalColor = originalColor;
              console.log(`Saving originalColor ${originalColor} for item moving from ${oldIndex} to ${newIndex}`);
            }
          }
        }
        
        if (index === newIndex) {
          console.log(`This position ${index} will receive a color from ${oldIndex}`);
        }
      }
    };
    
    // Handler for after color move - recovers state
    const handleColorMoved = (e: CustomEvent) => {
      const { 
        paletteId, 
        oldIndex, 
        newIndex, 
        originalColor: movedOriginalColor, 
        modifiedMode,
        modifiedColor
      } = e.detail;
      
      const idParts = id.split('-');
      const itemPaletteId = idParts.length >= 3 ? idParts[1] : '';
      
      // Only process the event if it's for this palette
      if (itemPaletteId !== paletteId) {
        return;
      }
      
      // Clear state from the old position
      if (index === oldIndex) {
        console.log(`Clearing state at previous position ${oldIndex}`);
        setOriginalColor(null);
        setTempColor(null);
      }
      
      // Set state at the new position
      if (index === newIndex && movedOriginalColor) {
        console.log(`Setting originalColor ${movedOriginalColor} at new position ${newIndex}`);
        
        // Use setTimeout to ensure React state batching works properly
        setTimeout(() => {
          setOriginalColor(movedOriginalColor);
          if (modifiedColor) {
            setTempColor(modifiedColor);
          }
        }, 0);
      }
    };

    // Listen for prepare move events
    document.addEventListener('prepareColorMove', handlePrepareMoveColor as EventListener);
    
    // Listen for color move events
    document.addEventListener('colorMoved', handleColorMoved as EventListener);

    // Clean up
    return () => {
      document.removeEventListener('prepareColorMove', handlePrepareMoveColor as EventListener);
      document.removeEventListener('colorMoved', handleColorMoved as EventListener);
    };
  }, [id, index, originalColor]);

  // Add effect to monitor color changes from parent to ensure state consistency
  useEffect(() => {
    // Reset tracking state ONLY if the color is reset to the original value from outside
    const currentHex = modeColor.hex;
    
    // Only reset originalColor if the current color matches the original
    // This allows the reset button to remain visible for any modified color
    if (originalColor && !tempColor && currentHex === originalColor) {
      console.log(`Color reset to original detected, clearing tracking state`);
      setOriginalColor(null);
    }
  }, [modeColor.hex, originalColor, tempColor]);

  // Add this effect to recover original color state when component mounts or remounts
  useEffect(() => {
    // Check if there's stored original color data from a previous drag operation
    setTimeout(() => {
      const element = document.querySelector(`[data-color-id="${id}"]`);
      if (element) {
        const storedOriginalColor = (element as HTMLElement).dataset.originalColor;
        if (storedOriginalColor && !originalColor) {
          console.log(`Recovering stored original color: ${storedOriginalColor}`);
          setOriginalColor(storedOriginalColor);
        }
      }
    }, 0); // Run after render to ensure the element exists
  }, [id]); // Only when ID changes (component is mounted/remounted)

  // Add a new effect that syncs data attributes with React state on every render
  useEffect(() => {
    // Check if there's a DOM data attribute but no React state
    const element = document.querySelector(`[data-color-index="${index}"]`);
    if (element) {
      const storedOriginalColor = (element as HTMLElement).dataset.originalColor;
      if (storedOriginalColor && !originalColor) {
        console.log(`Syncing originalColor state from DOM attribute for index ${index}`);
        setOriginalColor(storedOriginalColor);
      }
    }
  }, [index, originalColor]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempName(e.target.value);
  };

  const saveName = () => {
    onEditColorName(index, tempName);
    setEditingName(false);
  };

  const checkColorSimilarity = (newColor: string) => {
    // Get other relevant colors to check against based on palette type
    let otherColors: string[] = [];
    
    if (paletteType === 'categorical') {
      // For categorical palettes, check against all other colors
      otherColors = allColors
        .filter((_, i) => i !== index)
        .map(c => currentMode === 'light' ? c.light.hex : c.dark.hex);
    } 
    else if (paletteType === 'sequential') {
      // For sequential, only check first vs last
      const firstIndex = 0;
      const lastIndex = allColors.length - 1;
      
      // If editing first color, check against last (and vice versa)
      if (index === firstIndex) {
        otherColors = [currentMode === 'light' ? 
          allColors[lastIndex].light.hex : 
          allColors[lastIndex].dark.hex];
      } else if (index === lastIndex) {
        otherColors = [currentMode === 'light' ? 
          allColors[firstIndex].light.hex : 
          allColors[firstIndex].dark.hex];
      }
    }
    else if (paletteType === 'diverging') {
      // For diverging, check key colors against each other
      const firstIndex = 0;
      const middleIndex = Math.floor(allColors.length / 2);
      const lastIndex = allColors.length - 1;
      
      // If editing first, check against middle and last
      if (index === firstIndex) {
        otherColors = [
          currentMode === 'light' ? allColors[middleIndex].light.hex : allColors[middleIndex].dark.hex,
          currentMode === 'light' ? allColors[lastIndex].light.hex : allColors[lastIndex].dark.hex
        ];
      } 
      // If editing middle, check against first and last
      else if (index === middleIndex) {
        otherColors = [
          currentMode === 'light' ? allColors[firstIndex].light.hex : allColors[firstIndex].dark.hex,
          currentMode === 'light' ? allColors[lastIndex].light.hex : allColors[lastIndex].dark.hex
        ];
      }
      // If editing last, check against first and middle
      else if (index === lastIndex) {
        otherColors = [
          currentMode === 'light' ? allColors[firstIndex].light.hex : allColors[firstIndex].dark.hex,
          currentMode === 'light' ? allColors[middleIndex].light.hex : allColors[middleIndex].dark.hex
        ];
      }
    }
    
    // Check if the new color is too similar to any of the other colors
    const similarityResult = isColorTooSimilar(newColor, otherColors);
    
    return {
      active: similarityResult.similar,
      similarColors: similarityResult.similarColors
    };
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.type === 'color') {
      const newColor = e.target.value;
      console.log(`Color change initiated: ${newColor} at index ${index}`);
      
      // Save original color for reset functionality if not already saved
      if (!originalColor) {
        const currentHex = modeColor.hex;
        console.log(`Setting original color: ${currentHex}`);
        setOriginalColor(currentHex);
        
        // Also store it in the data attribute for persistence across drag operations
        const element = document.querySelector(`[data-color-id="${id}"]`);
        if (element) {
          (element as HTMLElement).dataset.originalColor = currentHex;
          // Also store which mode was edited
          (element as HTMLElement).dataset.modifiedMode = currentMode;
        }
      }
      
      // Always store the temporary color
      setTempColor(newColor);
      
      // Check if color is editable based on palette type
      let isEditable = true;
      
      if (paletteType === 'sequential') {
        // For sequential palettes, only allow changes to first and last colors
        isEditable = index === 0 || index === allColors.length - 1;
      } else if (paletteType === 'diverging') {
        // For diverging palettes, only allow changes to first, middle, and last colors
        const middleIndex = Math.floor(allColors.length / 2);
        isEditable = index === 0 || index === middleIndex || index === allColors.length - 1;
      }
      
      // If not editable, don't apply the change
      if (!isEditable) {
        console.log('Color not editable for this position in the palette');
        setOriginalColor(null); // Reset the original color if not editable
        setTempColor(null);
        
        // Clear the data attributes
        const element = document.querySelector(`[data-color-id="${id}"]`);
        if (element) {
          delete (element as HTMLElement).dataset.originalColor;
          delete (element as HTMLElement).dataset.modifiedMode;
        }
        return;
      }
      
      // Check for color similarity for all palette types when changing editable key colors
      const similarityWarning = checkColorSimilarity(newColor);
      console.log(`Similarity check result: ${similarityWarning.active ? 'Too similar' : 'OK'}`);
      
      // Always update the visual feedback about similarity
      setTooSimilarWarning(similarityWarning);
      
      if (colorChangeTimeoutRef.current) {
        clearTimeout(colorChangeTimeoutRef.current);
      }
      
      // If the colors are too similar, don't auto-apply the change
      if (similarityWarning.active) {
        // Log which colors are too similar for debugging
        console.log('Color too similar to existing colors. Similarity warning active:', 
          similarityWarning.similarColors.map(c => `${c.color} (distance: ${c.distance.toFixed(2)})`).join(', '));
        return;
      }
      
      // Apply the change after a delay if there are no similarity warnings
      colorChangeTimeoutRef.current = setTimeout(() => {
        console.log(`Applying color change: ${newColor} in mode ${currentMode}`);
        
        // Make sure the current mode is explicitly passed
        // This ensures we generate the right complementary color
        onEditColorHex(index, newColor, currentMode);
        
        // Store the modified state in the dataset so it persists across drag operations
        const element = document.querySelector(`[data-color-id="${id}"]`);
        if (element) {
          (element as HTMLElement).dataset.modifiedColor = 'true';
          (element as HTMLElement).dataset.modifiedMode = currentMode;
          
          console.log(`Stored mode ${currentMode} in data attribute for index ${index}`);
          
          // Return focus to the color picker if needed
          if (paletteType === 'categorical') {
            const picker = document.getElementById(`color-picker-${index}`);
            if (picker && document.activeElement !== picker) {
              requestAnimationFrame(() => {
                picker.focus();
              });
            }
          }
        }
      }, 100); // Reduced delay for faster response
    }
  };

  // Generate token name using proper naming convention
  const sanitizedPaletteName = paletteName.toLowerCase().replace(/\s+/g, '-');
  const sanitizedColorName = color.name.toLowerCase().replace(/\s+/g, '-');
  const tokenName = `${tokenPrefix}.${paletteType}.${sanitizedPaletteName}.${sanitizedColorName}`;
  
  console.log("PaletteDisplay tokenName:", {
    tokenPrefix,
    tokenFromColor: color.token,
    regeneratedToken: tokenName,
    colorIndex: index,
    paletteName: sanitizedPaletteName
  });

  const activeColor = currentMode === 'light' ? '#0066FF' : '#60A5FA';

  const handleStrictnessLevelChange = (level: StrictnessLevel) => {
    onStrictnessLevelChange(level);
  };

  return (
    <div 
      style={style} 
      className="flex items-center p-2 relative"
      data-color-id={id}
      data-color-index={index}
      data-color-name={color.name}
      data-color-hex={modeColor.hex}
    >
      {paletteType === 'categorical' && (
        <div className="w-8 flex-shrink-0 flex flex-col items-center">
          <button
            className={`text-gray-400 hover:text-gray-600 p-1 ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}`}
            onClick={() => !isFirst && onMoveUp && onMoveUp()}
            disabled={isFirst}
            title="Move color up"
          >
            <ChevronUpIcon className="w-4 h-4" />
          </button>
          <button
            className={`text-gray-400 hover:text-gray-600 p-1 ${isLast ? 'opacity-30 cursor-not-allowed' : ''}`}
            onClick={() => !isLast && onMoveDown && onMoveDown()}
            disabled={isLast}
            title="Move color down"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      {paletteType !== 'categorical' && (
        <div className="w-8 flex-shrink-0"></div>
      )}
      <div className="flex-1 px-4">
        <div className="flex flex-col">
          <div className="flex items-center">
            <div className="relative color-picker-container">
              <input
                id={`color-picker-${index}`}
                type="color"
                value={tempColor || modeColor.hex}
                onChange={handleColorChange}
                className="absolute opacity-0 w-10 h-10 cursor-pointer"
                style={{ zIndex: 1 }}
                disabled={(paletteType === 'sequential' || paletteType === 'diverging') && !color.editable}
                onFocus={() => {
                  console.log('Color picker focused');
                  setIsPicking(true);
                }}
                onBlur={(e) => {
                  console.log('Color picker blur event');
                  // Add a small delay to prevent immediate closing
                  // This allows the onChange to complete first
                  setTimeout(() => {
                    setIsPicking(false);
                  }, 300);
                }}
              />
              <div 
                className={`w-10 h-10 rounded-md shadow-sm cursor-pointer border ${
                  isPicking ? 'border-blue-500 ring-2 ring-blue-200' :
                  tooSimilarWarning.active ? 'border-yellow-500 border-2 ring-2 ring-yellow-300' : 
                  ((paletteType === 'sequential' || paletteType === 'diverging') && color.editable) ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
                style={{ backgroundColor: tempColor || modeColor.hex }} 
                title={(paletteType === 'sequential' || paletteType === 'diverging') && !color.editable ? 
                  "This color is auto-generated and cannot be edited directly" :
                  tooSimilarWarning.active ? "This color is too similar to other colors in the palette" :
                  "Click to edit color"
                }
              />
            </div>
            
            {/* Show reset button when color is different from original */}
            {originalColor && (
              <div className="ml-2 flex items-center">
                <button
                  onClick={() => {
                    // Get the mode that was used when editing (stored in data attribute)
                    // or fall back to current mode if not available
                    const element = document.querySelector(`[data-color-id="${id}"]`);
                    const editedMode = element ? 
                      (element as HTMLElement).dataset.modifiedMode as ('light' | 'dark') || currentMode : 
                      currentMode;
                    
                    console.log(`Manually resetting color at index ${index} to ${originalColor} with mode ${editedMode}`);
                    
                    // Make sure to pass the mode parameter explicitly
                    onEditColorHex(index, originalColor, editedMode);
                    
                    setOriginalColor(null);
                    setTempColor(null);
                    setTooSimilarWarning({ active: false, similarColors: [] });
                    
                    // Clear the data attributes to ensure they don't persist after reset
                    if (element) {
                      delete (element as HTMLElement).dataset.originalColor;
                      delete (element as HTMLElement).dataset.modifiedMode;
                      delete (element as HTMLElement).dataset.modifiedColor;
                    }
                  }}
                  className="text-xs text-red-500 hover:text-red-700"
                  title="Reset this color to original"
                >
                  <ArrowUturnLeftIcon className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          
          {tooSimilarWarning.active && (
            <div className="mt-1 text-xs font-semibold text-yellow-600 bg-yellow-50 p-1 rounded border border-yellow-300">
              Too similar to {tooSimilarWarning.similarColors.length} other color(s)!
            </div>
          )}
          <div className="mt-1">
            {editingName ? (
              <input
                type="text"
                value={tempName}
                onChange={handleNameChange}
                onBlur={saveName}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="text-sm border rounded-sm px-1 w-full"
                autoFocus
                disabled={(paletteType === 'sequential' || paletteType === 'diverging') && !color.editable}
              />
            ) : (
              <div 
                className="text-sm font-medium cursor-pointer"
                onClick={() => {
                  if ((paletteType !== 'sequential' && paletteType !== 'diverging') || color.editable) {
                    setTempName(color.name);
                    setEditingName(true);
                  }
                }}
              >
                {color.name}
                {(paletteType === 'sequential' || paletteType === 'diverging') && color.editable && (
                  <span className="ml-1 text-xs text-blue-500 font-normal">(editable)</span>
                )}
                {(paletteType === 'sequential' || paletteType === 'diverging') && !color.editable && (
                  <span className="ml-1 text-xs text-gray-400 font-normal">(auto)</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 px-4">
        <div className="font-mono text-xs">{tokenName}</div>
      </div>
      <div className="w-24 text-center px-4">
        <div className="text-2xl font-bold">{contrastRatio.toFixed(1)}:1</div>
      </div>
      <div className="w-48 px-4 whitespace-nowrap">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center">
            {isAALargeCompliant ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-1 flex-shrink-0" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500 mr-1 flex-shrink-0" />
            )}
            <span className="text-sm whitespace-nowrap">AA: 3:1</span>
          </div>
          <div className="flex items-center">
            {isAAALargeCompliant ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-1 flex-shrink-0" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500 mr-1 flex-shrink-0" />
            )}
            <span className="text-sm whitespace-nowrap">AAA: 4.5:1</span>
          </div>
        </div>
      </div>
      <div className="w-48 px-4 whitespace-nowrap">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center">
            {isAASmallCompliant ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-1 flex-shrink-0" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500 mr-1 flex-shrink-0" />
            )}
            <span className="text-sm whitespace-nowrap">AA: 4.5:1</span>
          </div>
          <div className="flex items-center">
            {isAAASmallCompliant ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-1 flex-shrink-0" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500 mr-1 flex-shrink-0" />
            )}
            <span className="text-sm whitespace-nowrap">AAA: 7:1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaletteDisplay: React.FC<PaletteDisplayProps> = ({
  palette,
  currentMode,
  strictnessLevel,
  lightBackground = '#FFFFFF',
  darkBackground = '#1E1E1E',
  onEditName,
  onEditColorName,
  onEditColorHex,
  onReorderColors,
  onRegeneratePalette,
  textColor: propTextColor,
  inactiveTextColor: propInactiveTextColor,
  borderColor: propBorderColor,
  onStrictnessLevelChange,
  tokenPrefix: propTokenPrefix
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [paletteName, setPaletteName] = useState(palette.name);
  const tokenPrefix = propTokenPrefix || 'color.dataviz'; // Fallback for safety
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [editingColorName, setEditingColorName] = useState('');
  const [editingColorHex, setEditingColorHex] = useState('');
  
  // Use a stable ID for drag and drop that doesn't change when the name changes
  const getStableId = (color: Color, index: number) => {
    // Create a stable ID using the color hex value which is unique per color
    // This ensures the ID remains the same even when the position changes
    const lightHex = color.light.hex.replace('#', '');
    const darkHex = color.dark.hex.replace('#', '');
    
    // Combine both hex values to ensure uniqueness even if one mode matches another color
    const hexFingerprint = `${lightHex}-${darkHex}`;
    
    // Also include the name (without spaces) for better debugging
    const safeName = color.name.replace(/\s+/g, '-').toLowerCase();
    
    // The index is only used as a fallback, not as the primary identifier
    return `color-${palette.id}-${safeName}-${hexFingerprint}`;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaletteName(e.target.value);
  };

  const saveNameChange = () => {
    onEditName(paletteName);
    setIsEditingName(false);
  };

  const handleColorNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingColorName(e.target.value);
  };

  const saveColorNameChange = (index: number) => {
    if (editingColorName.trim() !== '') {
      onEditColorName(index, editingColorName.trim());
      setEditingColorIndex(null);
    }
  };

  const handleColorHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.startsWith('#') && value.length <= 7) {
      setEditingColorHex(value);
    }
  };

  const saveColorHexChange = (index: number) => {
    if (editingColorHex.startsWith('#') && editingColorHex.length === 7) {
      onEditColorHex(index, editingColorHex, currentMode);
      setEditingColorIndex(null);
    }
  };

  // Use the exact light/dark mode background colors
  const cardBackground = currentMode === 'light' ? lightBackground : darkBackground;
  const textColor = propTextColor;
  const inactiveTextColor = propInactiveTextColor;
  const borderColor = propBorderColor;
  const activeColor = currentMode === 'light' ? '#0066FF' : '#60A5FA';

  // Replace with completely new implementation without any DND code
  const renderColorItems = () => {
    return (
      <div className="color-items-container">
        {palette.colors.map((color, index) => {
          const itemId = `color-${palette.id}-${index}`;
          const isFirst = index === 0;
          const isLast = index === palette.colors.length - 1;
          
          return (
            <SortableItem
              key={itemId}
              id={itemId}
              color={color}
              index={index}
              position={index}
              paletteType={palette.type}
              paletteName={palette.name}
              tokenPrefix={tokenPrefix}
              allColors={palette.colors}
              currentMode={currentMode}
              onEditColorName={onEditColorName}
              onEditColorHex={onEditColorHex}
              onMoveUp={palette.type === 'categorical' ? () => handleMoveColor(index, index - 1) : undefined}
              onMoveDown={palette.type === 'categorical' ? () => handleMoveColor(index, index + 1) : undefined}
              isFirst={isFirst}
              isLast={isLast}
              strictnessLevel={strictnessLevel}
              onStrictnessLevelChange={onStrictnessLevelChange}
              textColor={textColor}
              inactiveTextColor={inactiveTextColor}
              borderColor={borderColor}
            />
          );
        })}
      </div>
    );
  };

  // Replace with an improved version that also tracks modified state:
  const handleMoveColor = (oldIndex: number, newIndex: number) => {
    if (newIndex < 0 || newIndex >= palette.colors.length) {
      return; // Prevent moving out of bounds
    }
    
    console.log(`Moving color from position ${oldIndex} to ${newIndex}`);
    
    // Use data-color-index to find the element, which is more reliable than ID
    const sourceElement = document.querySelector(`[data-color-index="${oldIndex}"]`);
    let originalColorValue = null;
    let modifiedMode = null;
    let modifiedColor = null;
    
    if (sourceElement) {
      // Capture all the modification state
      originalColorValue = (sourceElement as HTMLElement).dataset.originalColor;
      modifiedMode = (sourceElement as HTMLElement).dataset.modifiedMode;
      modifiedColor = (sourceElement as HTMLElement).dataset.modifiedColor;
      
      console.log(`Moving color with modification state:`, {
        originalColor: originalColorValue,
        modifiedMode: modifiedMode,
        modifiedColor: modifiedColor
      });
    } else {
      console.error(`Could not find source element at index ${oldIndex}`);
    }
    
    // Store modification data globally to ensure it's available
    if (originalColorValue) {
      // Create a global variable to persist during DOM updates
      (window as any).__tempMoveColorState = {
        originalColor: originalColorValue,
        modifiedMode,
        modifiedColor,
        oldIndex,
        newIndex
      };
    }
    
    // Perform the reordering AFTER we've captured state
    onReorderColors(oldIndex, newIndex);
    
    // After reordering, use a custom event to notify all color items
    // This is more reliable than trying to find DOM elements directly
    setTimeout(() => {
      // Create and dispatch a custom event with all necessary details
      const prepareEvent = new CustomEvent('prepareColorMove', {
        detail: {
          paletteId: palette.id,
          oldIndex,
          newIndex,
          originalColor: originalColorValue,
          modifiedMode,
          modifiedColor
        }
      });
      document.dispatchEvent(prepareEvent);
      
      // Use a second setTimeout to ensure components have time to prepare
      setTimeout(() => {
        const colorMovedEvent = new CustomEvent('colorMoved', {
          detail: {
            paletteId: palette.id,
            oldIndex,
            newIndex,
            originalColor: originalColorValue,
            modifiedMode,
            modifiedColor
          }
        });
        document.dispatchEvent(colorMovedEvent);
        
        // Clean up global storage
        delete (window as any).__tempMoveColorState;
      }, 100);
    }, 50);
  };

  const renderPaletteHeader = () => {
    return (
      <div className="p-4 flex justify-between items-center border-b" style={{ borderColor }}>
        <div className="flex items-center space-x-2">
          {isEditingName ? (
            <input
              type="text"
              value={paletteName}
              onChange={handleNameChange}
              onBlur={saveNameChange}
              onKeyDown={(e) => e.key === 'Enter' && saveNameChange()}
              className="border rounded-md px-2 py-1"
              autoFocus
            />
          ) : (
            <h2 
              className="text-xl font-bold cursor-pointer"
              style={{ color: textColor }}
              onClick={() => setIsEditingName(true)}
            >
              {palette.name}
            </h2>
          )}
        </div>

        {palette.type === 'categorical' && (
          <div className="flex gap-4">
            <div className="flex gap-2">
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  strictnessLevel === 'AASmall' ? 'border-2' : ''
                }`}
                style={{
                  color: strictnessLevel === 'AASmall' ? activeColor : inactiveTextColor,
                  borderColor: strictnessLevel === 'AASmall' ? activeColor : borderColor,
                  backgroundColor: 'transparent'
                }}
                onClick={() => onStrictnessLevelChange('AASmall')}
              >
                AA
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  strictnessLevel === 'AAASmall' ? 'border-2' : ''
                }`}
                style={{
                  color: strictnessLevel === 'AAASmall' ? activeColor : inactiveTextColor,
                  borderColor: strictnessLevel === 'AAASmall' ? activeColor : borderColor,
                  backgroundColor: 'transparent'
                }}
                onClick={() => onStrictnessLevelChange('AAASmall')}
              >
                AAA
              </button>
            </div>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                  strictnessLevel === 'AALarge' ? 'border-2' : ''
                }`}
                style={{
                  color: strictnessLevel === 'AALarge' ? activeColor : inactiveTextColor,
                  borderColor: strictnessLevel === 'AALarge' ? activeColor : borderColor,
                  backgroundColor: 'transparent'
                }}
                onClick={() => onStrictnessLevelChange('AALarge')}
              >
                AA
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                  strictnessLevel === 'AAALarge' ? 'border-2' : ''
                }`}
                style={{
                  color: strictnessLevel === 'AAALarge' ? activeColor : inactiveTextColor,
                  borderColor: strictnessLevel === 'AAALarge' ? activeColor : borderColor,
                  backgroundColor: 'transparent'
                }}
                onClick={() => onStrictnessLevelChange('AAALarge')}
              >
                AAA
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onRegeneratePalette(palette.id)}
            className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ 
              borderColor,
              color: textColor
            }}
            title="Regenerate this palette"
          >
            Regenerate
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="rounded-xl shadow-sm mb-6 overflow-hidden"
      style={{
        backgroundColor: cardBackground,
        color: textColor
      }}
    >
      {renderPaletteHeader()}
      
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div className="flex items-center px-2 py-2" style={{ borderColor }}>
            <div className="w-8 flex-shrink-0"></div>
            <div className="flex-1 px-4" style={{ color: textColor }}>Color</div>
            <div className="flex-1 px-4" style={{ color: textColor }}>Token</div>
            <div className="w-24 text-center px-4" style={{ color: textColor }}>Contrast</div>
            <div className="w-48 px-4" style={{ color: textColor }}>Large text</div>
            <div className="w-48 px-4" style={{ color: textColor }}>Small text</div>
          </div>
          <div>
            {renderColorItems()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaletteDisplay;