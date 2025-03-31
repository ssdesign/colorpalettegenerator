import chroma from 'chroma-js';
import { Color, StrictnessLevel } from '../types';

export interface ColorSimilarityResult {
  similar: boolean;
  similarColors: { color: string; distance: number }[];
  minDistance: number;
}

// Minimum perceptual distance in LAB color space to consider colors distinct
export const MIN_PERCEPTUAL_DISTANCE = 40;

// Calculate the contrast ratio between two colors
export const calculateContrastRatio = (color1: string, color2: string): number => {
  return chroma.contrast(color1, color2);
};

// Check if a color meets WCAG compliance for different levels
export const checkWCAGCompliance = (
  foregroundColor: string, 
  backgroundColor: string
): { AALarge: boolean; AASmall: boolean; AAALarge: boolean; AAASmall: boolean } => {
  const contrastRatio = calculateContrastRatio(foregroundColor, backgroundColor);
  
  return {
    AALarge: contrastRatio >= 3.0,
    AASmall: contrastRatio >= 4.5,
    AAALarge: contrastRatio >= 4.5,
    AAASmall: contrastRatio >= 7.0,
  };
};

// Generate token name
export const generateToken = (prefix: string, paletteName: string, paletteType: string, index: number): string => {
  return `${prefix}.${paletteType}.${paletteName}.${index.toString().padStart(2, '0')}`;
};

// Optimize a color for a specific background to meet WCAG contrast requirements
export const optimizeColorForBackground = (
  baseColor: string,
  backgroundColor: string,
  targetContrast: number = 4.5 // Default to AA Small Text (4.5:1)
): string => {
  let resultColor = baseColor;
  let contrast = calculateContrastRatio(resultColor, backgroundColor);
  let attempts = 0;
  const MAX_ATTEMPTS = 20;

  // If we already meet the contrast requirement, return the color as is
  if (contrast >= targetContrast) {
    return resultColor;
  }

  const backgroundLightness = chroma(backgroundColor).get('lab.l');
  const isLightBackground = backgroundLightness > 50;
  
  // For light backgrounds, we need darker colors to achieve contrast
  if (isLightBackground) {
    // Try to preserve the hue and adjust lightness
    const hsl = chroma(baseColor).hsl();
    const h = hsl[0] || 0; // Handle NaN for grayscale colors
    const s = Math.min(1, Math.max(0.5, hsl[1] || 0.6)); // Ensure good saturation
    
    // Try different lightness values (darker)
    for (let l = 0.5; l >= 0; l -= 0.05) {
      const testColor = chroma.hsl(h, s, l).hex();
      const testContrast = calculateContrastRatio(testColor, backgroundColor);
      
      if (testContrast >= targetContrast) {
        return testColor;
      }
    }
    
    // If we still can't find a good match, try with higher saturation
    for (let s = 0.7; s <= 1; s += 0.1) {
      for (let l = 0.5; l >= 0; l -= 0.05) {
        const testColor = chroma.hsl(h, s, l).hex();
        const testContrast = calculateContrastRatio(testColor, backgroundColor);
        
        if (testContrast >= targetContrast) {
          return testColor;
        }
      }
    }
  } else {
    // For dark backgrounds, we need lighter colors
    const hsl = chroma(baseColor).hsl();
    const h = hsl[0] || 0; // Handle NaN for grayscale colors
    const s = Math.min(1, Math.max(0.5, hsl[1] || 0.6)); // Ensure good saturation
    
    // Try different lightness values (lighter)
    for (let l = 0.5; l <= 1; l += 0.05) {
      const testColor = chroma.hsl(h, s, l).hex();
      const testContrast = calculateContrastRatio(testColor, backgroundColor);
      
      if (testContrast >= targetContrast) {
        return testColor;
      }
    }
    
    // If we still can't find a good match, try with higher saturation
    for (let s = 0.7; s <= 1; s += 0.1) {
      for (let l = 0.5; l <= 1; l += 0.05) {
        const testColor = chroma.hsl(h, s, l).hex();
        const testContrast = calculateContrastRatio(testColor, backgroundColor);
        
        if (testContrast >= targetContrast) {
          return testColor;
        }
      }
    }
  }
  
  // Last resort - if we can't find a good color that preserves the hue, 
  // return black or white with the best contrast, but try to avoid black on light mode
  if (isLightBackground) {
    // For light backgrounds, first try a very dark version of the color
    const darkVersion = chroma(baseColor).darken(3).hex();
    const darkVersionContrast = calculateContrastRatio(darkVersion, backgroundColor);
    
    if (darkVersionContrast >= targetContrast) {
      return darkVersion;
    }
    
    // If that doesn't work, try dark gray before going to black
    const darkGray = '#333333';
    const darkGrayContrast = calculateContrastRatio(darkGray, backgroundColor);
    
    if (darkGrayContrast >= targetContrast) {
      return darkGray;
    }
  } else {
    // For dark backgrounds, try a very light version of the color
    const lightVersion = chroma(baseColor).brighten(3).hex();
    const lightVersionContrast = calculateContrastRatio(lightVersion, backgroundColor);
    
    if (lightVersionContrast >= targetContrast) {
      return lightVersion;
    }
  }
  
  // If all else fails, use black or white based on best contrast
  const blackContrast = calculateContrastRatio('#000000', backgroundColor);
  const whiteContrast = calculateContrastRatio('#FFFFFF', backgroundColor);
  
  return blackContrast > whiteContrast ? '#000000' : '#FFFFFF';
};

// Create a color object with both light and dark variants
export const createColorObject = (
  baseHue: number,
  saturation: number,
  lightness: number,
  index: number,
  lightModeBackground: string,
  darkModeBackground: string,
  strictnessLevel: StrictnessLevel,
  paletteType: 'categorical' | 'sequential' | 'diverging' = 'categorical'
): Color => {
  // Start with a base color
  const baseColor = chroma.hsl(baseHue, saturation, lightness).hex();
  
  // Get target contrast for the strictness level
  const targetContrast = getTargetContrastForLevel(strictnessLevel);
  
  let lightModeColor, darkModeColor;
  
  // For sequential and diverging palettes, we don't optimize for contrast
  // as they need to maintain their gradient appearance
  if (paletteType === 'sequential' || paletteType === 'diverging') {
    lightModeColor = baseColor;
    darkModeColor = baseColor;
  } else {
    // Only optimize categorical palettes for contrast
    lightModeColor = optimizeColorForBackground(baseColor, lightModeBackground, targetContrast);
    darkModeColor = optimizeColorForBackground(baseColor, darkModeBackground, targetContrast);
  }
  
  const lightModeContrast = calculateContrastRatio(lightModeColor, lightModeBackground);
  const lightModeCompliance = checkWCAGCompliance(lightModeColor, lightModeBackground);
  
  const darkModeContrast = calculateContrastRatio(darkModeColor, darkModeBackground);
  const darkModeCompliance = checkWCAGCompliance(darkModeColor, darkModeBackground);
  
  return {
    name: `Color ${index + 1}`,
    token: `color.${index}`,
    light: {
      hex: lightModeColor,
      contrastRatio: lightModeContrast,
      wcagCompliance: lightModeCompliance
    },
    dark: {
      hex: darkModeColor,
      contrastRatio: darkModeContrast,
      wcagCompliance: darkModeCompliance
    }
  };
};

// Calculate perceptual color distance between two colors
export const calculateColorDistance = (color1: string, color2: string): number => {
  // Convert colors to Lab color space which is perceptually uniform
  const lab1 = chroma(color1).lab();
  const lab2 = chroma(color2).lab();
  
  // Calculate Euclidean distance in Lab color space
  const deltaL = lab1[0] - lab2[0];
  const deltaA = lab1[1] - lab2[1];
  const deltaB = lab1[2] - lab2[2];
  
  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
};

// Check if a color is too similar to any color in a set
export const isColorTooSimilar = (
  color: string, 
  otherColors: string[], 
  threshold: number = MIN_PERCEPTUAL_DISTANCE // Use the defined constant for consistency
): { similar: boolean; similarColors: { color: string; distance: number }[] } => {
  const similarColors: { color: string; distance: number }[] = [];
  
  for (const otherColor of otherColors) {
    const distance = calculateColorDistance(color, otherColor);
    
    // Log the distances for debugging
    console.log(`Color distance check: ${color} vs ${otherColor} = ${distance}`);
    
    if (distance < threshold) {
      similarColors.push({ color: otherColor, distance });
    }
  }
  
  const result = {
    similar: similarColors.length > 0,
    similarColors
  };
  
  // Log the final result
  console.log(`Similarity check result for ${color}: ${result.similar ? 'Too similar' : 'Distinct enough'}`);
  
  return result;
};

// Generate a categorical palette with 12 distinct colors
export const generateCategoricalPalette = (
  baseColor: string,
  lightBackground: string,
  darkBackground: string,
  strictnessLevel: StrictnessLevel
): Color[] => {
  // Initial pool of potential colors inspired by IBM, Google Material, and other design systems
  const potentialColors = [
    '#0F62FE', // IBM Blue 60
    '#DA1E28', // IBM Red 60
    '#198038', // IBM Green 60
    '#8A3FFC', // IBM Purple 60
    '#FF832B', // IBM Orange 40
    '#009D9A', // IBM Teal 50
    '#A56EFF', // IBM Purple 40
    '#FFAB00', // Amber 700
    '#6200EA', // Deep Purple A700
    '#00B8D4', // Cyan A700
    '#64DD17', // Light Green A700
    '#304FFE', // Indigo A700
    '#F44336', // Material Red 500
    '#2196F3', // Material Blue 500
    '#4CAF50', // Material Green 500
    '#FF9800', // Material Orange 500
    '#9C27B0', // Material Purple 500
    '#00BCD4', // Material Cyan 500
    '#CDDC39', // Material Lime 500
    '#795548', // Material Brown 500
    '#607D8B', // Material Blue Grey 500
    '#E91E63', // Material Pink 500
    '#673AB7', // Material Deep Purple 500
    '#8D6E63'  // Material Brown 400
  ];
  
  // Shuffle the array to get a random order
  const shuffledColors = [...potentialColors].sort(() => Math.random() - 0.5);
  
  // Use the same distance threshold as used in color similarity checks
  const MIN_DISTANCE = MIN_PERCEPTUAL_DISTANCE;
  
  // Algorithm to select colors with sufficient perceptual distance
  const selectedColors: string[] = [];
  
  // Always start with a random color
  selectedColors.push(shuffledColors[0]);
  
  // Introduce some randomness by slightly varying the base color
  const baseHsl = chroma(baseColor).hsl();
  const variedBaseColor = chroma.hsl(
    (baseHsl[0] + Math.random() * 30) % 360,  // Random hue shift
    Math.min(1, Math.max(0.5, baseHsl[1] + (Math.random() * 0.3 - 0.15))), // Random saturation adjustment
    Math.min(0.9, Math.max(0.3, baseHsl[2] + (Math.random() * 0.3 - 0.15)))  // Random lightness adjustment
  ).hex();
  
  selectedColors.push(variedBaseColor);
  
  // Select the rest of the colors from shuffled array
  for (let i = 1; i < shuffledColors.length && selectedColors.length < 12; i++) {
    const candidateColor = shuffledColors[i];
    let isTooSimilar = false;
    
    // Check against all previously selected colors
    for (const selectedColor of selectedColors) {
      const distance = calculateColorDistance(candidateColor, selectedColor);
      console.log(`Generation - comparing ${candidateColor} with ${selectedColor}: distance = ${distance.toFixed(2)}, threshold = ${MIN_DISTANCE}`);
      
      if (distance < MIN_DISTANCE) {
        isTooSimilar = true;
        console.log(`Generation - rejected ${candidateColor}: too similar to ${selectedColor}`);
        break;
      }
    }
    
    // Add the color if it's not too similar
    if (!isTooSimilar) {
      console.log(`Generation - accepted ${candidateColor}`);
      selectedColors.push(candidateColor);
    }
  }
  
  // If we don't have enough colors, we'll modify some colors to increase the distance
  while (selectedColors.length < 12) {
    // Generate a random color with reasonable saturation and lightness
    const hue = Math.floor(Math.random() * 360);
    const saturation = 0.6 + Math.random() * 0.3; // Between 0.6 and 0.9
    const lightness = 0.4 + Math.random() * 0.2;  // Between 0.4 and 0.6
    
    const candidateColor = chroma.hsl(hue, saturation, lightness).hex();
    console.log(`Generation (fallback) - trying random color ${candidateColor}`);
    
    let isTooSimilar = false;
    for (const selectedColor of selectedColors) {
      const distance = calculateColorDistance(candidateColor, selectedColor);
      console.log(`Generation (fallback) - comparing ${candidateColor} with ${selectedColor}: distance = ${distance.toFixed(2)}, threshold = ${MIN_DISTANCE}`);
      
      if (distance < MIN_DISTANCE) {
        isTooSimilar = true;
        console.log(`Generation (fallback) - rejected ${candidateColor}: too similar to ${selectedColor}`);
        break;
      }
    }
    
    if (!isTooSimilar) {
      console.log(`Generation (fallback) - accepted ${candidateColor}`);
      selectedColors.push(candidateColor);
    }
  }
  
  // Trim to exactly 12 colors if we have more
  const finalColors = selectedColors.slice(0, 12);
  
  // Create color objects for each selected design system color
  const colors: Color[] = [];
  for (let i = 0; i < finalColors.length; i++) {
    // Convert the hex to HSL to work with it
    const hsl = chroma(finalColors[i]).hsl();
    const hue = hsl[0] || 0; // Handle NaN for grayscale colors
    const saturation = hsl[1] || 0.7;
    const lightness = hsl[2] || 0.5;
    
    // Create a color object with light and dark mode variants
    const color = createColorObject(
      hue, 
      saturation, 
      lightness, 
      i, 
      lightBackground, 
      darkBackground, 
      strictnessLevel,
      'categorical'
    );
    
    colors.push(color);
  }
  
  return colors;
};

// Generate a sequential palette with 12 colors
export const generateSequentialPalette = (
  baseColor: string,
  lightBackground: string,
  darkBackground: string,
  strictnessLevel: StrictnessLevel
): Color[] => {
  const colors: Color[] = [];
  
  // Multiple options for sequential palettes
  const sequentialPaletteOptions = [
    // Blue scale
    {
      startColor: '#E3F2FD', // Light blue (first)
      endColor: '#0D47A1'    // Dark blue (last)
    },
    // Green scale
    {
      startColor: '#E8F5E9', // Light green (first)
      endColor: '#1B5E20'    // Dark green (last)
    },
    // Purple scale
    {
      startColor: '#F3E5F5', // Light purple (first)
      endColor: '#4A148C'    // Dark purple (last)
    },
    // Orange scale
    {
      startColor: '#FFF3E0', // Light orange (first)
      endColor: '#E65100'    // Dark orange (last)
    }
  ];
  
  // Randomly select one of the sequential palette options
  const randomIndex = Math.floor(Math.random() * sequentialPaletteOptions.length);
  const selectedPalette = sequentialPaletteOptions[randomIndex];
  
  // Extract key colors for light mode
  const firstLightColor = selectedPalette.startColor;
  let lastLightColor = selectedPalette.endColor;
  
  // Check if colors are perceptually distinct enough
  const colorDistance = calculateColorDistance(firstLightColor, lastLightColor);
  console.log(`Sequential palette: start-end distance=${colorDistance.toFixed(2)}, min=${MIN_PERCEPTUAL_DISTANCE}`);
  
  // If the colors are too similar, adjust the last color
  if (colorDistance < MIN_PERCEPTUAL_DISTANCE) {
    console.log('Sequential palette: start and end colors too similar, adjusting...');
    // Shift the hue of the last color
    const lastHsl = chroma(lastLightColor).hsl();
    lastLightColor = chroma.hsl(
      (lastHsl[0] + 45) % 360, 
      lastHsl[1], 
      lastHsl[2]
    ).hex();
    console.log(`Updated end color to ${lastLightColor}, new distance: ${calculateColorDistance(firstLightColor, lastLightColor).toFixed(2)}`);
  }
  
  // Extract HSL values from light mode colors to create related dark mode colors
  const firstLightHsl = chroma(firstLightColor).hsl();
  const lastLightHsl = chroma(lastLightColor).hsl();
  
  // For first color: in dark mode, use same hue but darker and more saturated
  const firstDarkColor = chroma.hsl(
    firstLightHsl[0] || 0, 
    Math.min(1, (firstLightHsl[1] || 0) + 0.2),
    Math.max(0.2, (firstLightHsl[2] || 0) - 0.2)
  ).hex();
  
  // For last color: in dark mode, use same hue but brighter and more saturated
  const lastDarkColor = chroma.hsl(
    lastLightHsl[0] || 0, 
    Math.min(1, (lastLightHsl[1] || 0) + 0.15),
    Math.min(0.9, Math.max(0.3, (lastLightHsl[2] || 0) + 0.1))
  ).hex();
  
  // Check contrast on dark background and adjust if needed
  const firstDarkContrast = chroma.contrast(firstDarkColor, darkBackground);
  const lastDarkContrast = chroma.contrast(lastDarkColor, darkBackground);
  
  const firstDarkFinal = firstDarkContrast >= 3.0 
    ? firstDarkColor 
    : optimizeColorForBackground(firstDarkColor, darkBackground, 3.0);
    
  const lastDarkFinal = lastDarkContrast >= 3.0 
    ? lastDarkColor 
    : optimizeColorForBackground(lastDarkColor, darkBackground, 3.0);
  
  // Create color scales for both light and dark modes
  const lightScale = chroma.scale([firstLightColor, lastLightColor])
    .mode('lch')
    .colors(12);
    
  const darkScale = chroma.scale([firstDarkFinal, lastDarkFinal])
    .mode('lch')
    .colors(12);
  
  // Log the colors for debugging
  console.log('Sequential palette light mode colors:', 
    `First: ${firstLightColor}, Last: ${lastLightColor}`);
  console.log('Sequential palette dark mode colors:', 
    `First: ${firstDarkFinal}, Last: ${lastDarkFinal}`);
  
  // Create color objects for each step in the scale
  for (let i = 0; i < lightScale.length; i++) {
    const lightHex = lightScale[i];
    const darkHex = darkScale[i];
    
    // Determine if this is a key color (editable) - first or last
    const isKeyColor = i === 0 || i === lightScale.length - 1;
    
    // Create a color object
    const color: Color = {
      name: isKeyColor ? 
           (i === 0 ? 'First' : 'Last') : 
           `Auto ${i}`,
      token: `shade-${i + 1}`,
      editable: isKeyColor,
      light: {
        hex: lightHex,
        contrastRatio: chroma.contrast(lightHex, lightBackground),
        wcagCompliance: checkWCAGCompliance(lightHex, lightBackground)
      },
      dark: {
        hex: darkHex,
        contrastRatio: chroma.contrast(darkHex, darkBackground),
        wcagCompliance: checkWCAGCompliance(darkHex, darkBackground)
      }
    };
    
    colors.push(color);
  }
  
  return colors;
};

// Generate a diverging palette with 12 colors
export const generateDivergingPalette = (
  baseColor: string,
  lightBackground: string,
  darkBackground: string,
  strictnessLevel: StrictnessLevel
): Color[] => {
  const colors: Color[] = [];
  
  // Multiple options for diverging palettes to choose from randomly
  const divergingPaletteOptions = [
    // Purple to Red
    {
      startColor: '#8A3FFC', // Purple (first)
      midColor: '#F1F1F1',   // Light gray (middle)
      endColor: '#DA1E28'    // Red (last)
    },
    // Blue to Orange
    {
      startColor: '#1565C0', // Blue (first)
      midColor: '#F5F5F5',   // Light gray (middle)
      endColor: '#E65100'    // Orange (last)
    },
    // Green to Purple
    {
      startColor: '#2E7D32', // Green (first)
      midColor: '#F5F5F5',   // Light gray (middle)
      endColor: '#6A1B9A'    // Purple (last)
    },
    // Teal to Brown
    {
      startColor: '#00838F', // Teal (first)
      midColor: '#F5F5F5',   // Light gray (middle)
      endColor: '#4E342E'    // Brown (last)
    }
  ];
  
  // Randomly select one of the diverging palette options
  const randomIndex = Math.floor(Math.random() * divergingPaletteOptions.length);
  const selectedPalette = divergingPaletteOptions[randomIndex];
  
  // Extract key colors for light mode
  let startLightColor = selectedPalette.startColor;
  const midLightColor = selectedPalette.midColor;
  let endLightColor = selectedPalette.endColor;
  
  // Ensure key colors are perceptually distinct enough
  const startMidDistance = calculateColorDistance(startLightColor, midLightColor);
  const midEndDistance = calculateColorDistance(midLightColor, endLightColor);
  const startEndDistance = calculateColorDistance(startLightColor, endLightColor);
  
  console.log(`Diverging palette distances: start-mid=${startMidDistance.toFixed(2)}, mid-end=${midEndDistance.toFixed(2)}, start-end=${startEndDistance.toFixed(2)}, min=${MIN_PERCEPTUAL_DISTANCE}`);
  
  // Adjust colors if they're too similar
  if (startMidDistance < MIN_PERCEPTUAL_DISTANCE) {
    console.log('Diverging palette: start and middle colors too similar, adjusting...');
    // Shift the hue of the start color
    const startHsl = chroma(startLightColor).hsl();
    startLightColor = chroma.hsl(
      (startHsl[0] + 45) % 360, 
      startHsl[1], 
      startHsl[2]
    ).hex();
  }
  
  if (midEndDistance < MIN_PERCEPTUAL_DISTANCE) {
    console.log('Diverging palette: middle and end colors too similar, adjusting...');
    // Shift the hue of the end color
    const endHsl = chroma(endLightColor).hsl();
    endLightColor = chroma.hsl(
      (endHsl[0] + 45) % 360, 
      endHsl[1], 
      endHsl[2]
    ).hex();
  }
  
  // Create dark mode variants that are related to light mode colors
  const startColorHsl = chroma(startLightColor).hsl();
  const midColorHsl = chroma(midLightColor).hsl();
  const endColorHsl = chroma(endLightColor).hsl();
  
  // For dark mode, adjust the colors to be a bit brighter and maintain relationships
  const startDarkColor = chroma.hsl(
    startColorHsl[0] || 0, 
    Math.min(1, (startColorHsl[1] || 0.6) + 0.1), 
    Math.min(0.8, Math.max(0.4, (startColorHsl[2] || 0.5) + 0.2))
  ).hex();
  
  // For middle color in dark mode, use a dark gray
  const midDarkColor = '#555555';
  
  const endDarkColor = chroma.hsl(
    endColorHsl[0] || 0, 
    Math.min(1, (endColorHsl[1] || 0.6) + 0.1), 
    Math.min(0.8, Math.max(0.4, (endColorHsl[2] || 0.5) + 0.2))
  ).hex();
  
  // Create color scales for light and dark modes
  const lightColorScaleFirstHalf = chroma.scale([
    chroma(startLightColor).saturate(1.2),
    midLightColor
  ]).mode('lab').colors(6);
  
  const lightColorScaleSecondHalf = chroma.scale([
    midLightColor,
    chroma(endLightColor).saturate(1.2)
  ]).mode('lab').colors(7); // 7 to include midpoint
  
  const darkColorScaleFirstHalf = chroma.scale([
    chroma(startDarkColor).saturate(1.2),
    midDarkColor
  ]).mode('lab').colors(6);
  
  const darkColorScaleSecondHalf = chroma.scale([
    midDarkColor,
    chroma(endDarkColor).saturate(1.2)
  ]).mode('lab').colors(7); // 7 to include midpoint
  
  // Combine scales, removing duplicate middle point
  const lightColorScale = [...lightColorScaleFirstHalf, ...lightColorScaleSecondHalf.slice(1)];
  const darkColorScale = [...darkColorScaleFirstHalf, ...darkColorScaleSecondHalf.slice(1)];
  
  // Create color objects for each step in the scale
  for (let i = 0; i < lightColorScale.length; i++) {
    const lightHex = lightColorScale[i];
    const darkHex = darkColorScale[i];
    
    // Determine if this is a key color (editable) - first, middle, or last
    const middleIndex = Math.floor(lightColorScale.length / 2);
    const isKeyColor = i === 0 || i === middleIndex || i === lightColorScale.length - 1;
    
    // Create a color object
    const color: Color = {
      name: isKeyColor ? 
            (i === 0 ? 'First' : i === middleIndex ? 'Middle' : 'Last') : 
            `Auto ${i}`,
      token: `diverging-${i + 1}`,
      editable: isKeyColor,
      light: {
        hex: lightHex,
        contrastRatio: calculateContrastRatio(lightHex, lightBackground),
        wcagCompliance: checkWCAGCompliance(lightHex, lightBackground)
      },
      dark: {
        hex: darkHex,
        contrastRatio: calculateContrastRatio(darkHex, darkBackground),
        wcagCompliance: checkWCAGCompliance(darkHex, darkBackground)
      }
    };
    
    colors.push(color);
  }
  
  return colors;
};

// Get target contrast ratio for a strictness level
export const getTargetContrastForLevel = (strictnessLevel: StrictnessLevel): number => {
  switch (strictnessLevel) {
    case 'AALarge': return 3.0;
    case 'AASmall': return 4.5;
    case 'AAALarge': return 4.5;
    case 'AAASmall': return 7.0;
    default: return 4.5;
  }
};

// Calculate luminance of a color (for determining if it's dark or light)
export const getLuminance = (color: string): number => {
  return chroma(color).luminance();
};

// Generate a color with a specific contrast ratio against a background
export const generateColorWithContrast = (
  backgroundColor: string,
  targetContrast: number,
  baseHue?: number
): string => {
  // Start with a random color or use provided hue
  let testColor;
  if (baseHue !== undefined) {
    // Use the base hue but randomize saturation and lightness
    const s = 0.7 + Math.random() * 0.3; // High saturation for vibrant colors
    const l = 0.4 + Math.random() * 0.3; // Mid lightness
    testColor = chroma.hsl(baseHue, s, l);
  } else {
    // Completely random color
    testColor = chroma.random();
  }
  
  // Check if the contrast is already good
  let contrast = chroma.contrast(testColor, backgroundColor);
  
  // If contrast is too low, adjust the color
  if (contrast < targetContrast) {
    // Determine if we need to lighten or darken
    const bgLuminance = chroma(backgroundColor).luminance();
    const adjustDirection = bgLuminance > 0.5 ? 'darken' : 'brighten';
    
    // Gradually adjust the color until we reach the target contrast
    let attempts = 0;
    const maxAttempts = 100;
    
    while (contrast < targetContrast && attempts < maxAttempts) {
      testColor = adjustDirection === 'darken'
        ? chroma(testColor).darken(0.1)
        : chroma(testColor).brighten(0.1);
      
      contrast = chroma.contrast(testColor, backgroundColor);
      attempts++;
    }
  }
  
  return testColor.hex();
};

// Generate perceptually distinct colors with coordinated light/dark variants
export const generateDistinctColors = (
  count: number,
  lightBackground: string,
  darkBackground: string,
  targetContrast: number = 4.5,
  existingColors: string[] = []
): { light: string[]; dark: string[] } => {
  const lightColors: string[] = [...existingColors];
  const darkColors: string[] = [];
  const hueStep = 360 / count;
  
  // Start with a random hue
  let hue = Math.random() * 360;
  
  for (let i = 0; i < count; i++) {
    let newLightColor = '';
    let newDarkColor = '';
    let attempts = 0;
    const maxAttempts = 30;
    let isDistinct = false;
    
    while (!isDistinct && attempts < maxAttempts) {
      // Generate a base color using the current hue
      const baseHue = hue;
      const baseSaturation = 0.7 + Math.random() * 0.3; // High saturation for vibrant colors
      const baseLightness = 0.5; // Middle lightness as starting point
      
      // Create a base color
      const baseColor = chroma.hsl(baseHue, baseSaturation, baseLightness).hex();
      
      // Optimize for light background
      newLightColor = optimizeColorForBackground(baseColor, lightBackground, targetContrast);
      
      // Create a dark mode variant that's related to the light mode color
      // Modify the base color to work well on dark backgrounds but keep the relationship
      const lightColorHsl = chroma(newLightColor).hsl();
      
      // Keep the same hue, but adjust saturation and lightness for dark mode
      const darkHue = lightColorHsl[0] || baseHue; // Use light color's hue
      const darkSaturation = Math.min(1, (lightColorHsl[1] || baseSaturation) + 0.1); // Slightly more saturated
      const darkLightness = Math.min(0.8, Math.max(0.4, (lightColorHsl[2] || baseLightness) + 0.2)); // Lighter for dark mode
      
      const darkModeBaseColor = chroma.hsl(darkHue, darkSaturation, darkLightness).hex();
      newDarkColor = optimizeColorForBackground(darkModeBaseColor, darkBackground, targetContrast);
      
      // Check if the light color is distinct from all previously generated light colors
      const similarityResultLight = isColorTooSimilar(newLightColor, lightColors);
      
      if (!similarityResultLight.similar) {
        isDistinct = true;
      } else {
        // If too similar, slightly adjust the hue and try again
        hue = (hue + 10) % 360;
        attempts++;
      }
    }
    
    lightColors.push(newLightColor);
    darkColors.push(newDarkColor);
    
    // Advance to the next hue for the next color
    hue = (hue + hueStep) % 360;
  }
  
  return { light: lightColors, dark: darkColors };
}; 