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

// Calculate centroid of points in LAB space
const calculateCentroid = (points: number[][]): number[] => {
  const sum = points.reduce((acc, point) => [
    acc[0] + point[0],
    acc[1] + point[1],
    acc[2] + point[2]
  ], [0, 0, 0]);
  
  return sum.map(v => v / points.length);
};

// Generate perceptually distinct colors using K-means clustering
const generatePerceptuallyDistinctColors = (count: number): string[] => {
  // Generate a large pool of candidate colors
  const candidateCount = count * 20; // Generate 20x more colors than needed
  const candidates: number[][] = []; // Store colors in LAB space
  
  // Generate candidates with good spread in LAB space
  for (let i = 0; i < candidateCount; i++) {
    const hue = (i * 137.508) % 360; // Use golden angle for even hue distribution
    const saturation = 0.75 + (Math.random() * 0.15); // 0.75-0.90
    const lightness = 0.45 + (Math.random() * 0.15);  // 0.45-0.60
    const lab = chroma.hsl(hue, saturation, lightness).lab();
    candidates.push([lab[0], lab[1], lab[2]]);
  }
  
  // Initialize cluster centers randomly from candidates
  let centers: number[][] = [];
  const usedIndices = new Set<number>();
  
  while (centers.length < count) {
    const index = Math.floor(Math.random() * candidates.length);
    if (!usedIndices.has(index)) {
      usedIndices.add(index);
      centers.push([...candidates[index]]);
    }
  }
  
  // K-means clustering
  const maxIterations = 50;
  let iterations = 0;
  let changed = true;
  
  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;
    
    // Assign points to nearest center
    const clusters: number[][][] = Array(count).fill(null).map(() => []);
    
    candidates.forEach(point => {
      let minDist = Infinity;
      let nearestCenter = 0;
      
      centers.forEach((center, i) => {
        const dist = Math.sqrt(
          Math.pow(point[0] - center[0], 2) +
          Math.pow(point[1] - center[1], 2) +
          Math.pow(point[2] - center[2], 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestCenter = i;
        }
      });
      
      clusters[nearestCenter].push(point);
    });
    
    // Update centers
    const newCenters = clusters.map((cluster, i) => {
      if (cluster.length === 0) return centers[i];
      return calculateCentroid(cluster);
    });
    
    // Check if centers changed significantly
    centers.forEach((center, i) => {
      const diff = Math.sqrt(
        Math.pow(center[0] - newCenters[i][0], 2) +
        Math.pow(center[1] - newCenters[i][1], 2) +
        Math.pow(center[2] - newCenters[i][2], 2)
      );
      if (diff > 0.1) changed = true;
    });
    
    centers = newCenters;
  }
  
  // Convert LAB centers back to hex colors
  let colors = centers.map(center => 
    chroma.lab(center[0], center[1], center[2]).hex()
  );
  
  // Optimize color order using nearest neighbor algorithm
  const optimizeOrder = (colors: string[]): string[] => {
    const result: string[] = [colors[0]];
    const remaining = new Set(colors.slice(1));
    
    while (remaining.size > 0) {
      const lastColor = result[result.length - 1];
      let maxDistance = -Infinity;
      let furthestColor = '';
      
      // Find the color that's furthest from both the last color and all other remaining colors
      for (const candidate of remaining) {
        const distToLast = chroma.distance(lastColor, candidate, 'lab');
        
        // Calculate minimum distance to all other remaining colors
        let minDistToOthers = Infinity;
        for (const other of remaining) {
          if (other !== candidate) {
            const dist = chroma.distance(candidate, other, 'lab');
            minDistToOthers = Math.min(minDistToOthers, dist);
          }
        }
        
        // Use a weighted combination of both distances
        const combinedDistance = distToLast * 0.7 + minDistToOthers * 0.3;
        
        if (combinedDistance > maxDistance) {
          maxDistance = combinedDistance;
          furthestColor = candidate;
        }
      }
      
      result.push(furthestColor);
      remaining.delete(furthestColor);
    }
    
    return result;
  };
  
  // Return optimized color order
  return optimizeOrder(colors);
};

// Generate a categorical palette with 12 distinct colors
export const generateCategoricalPalette = (
  baseColor: string,
  lightBackground: string,
  darkBackground: string,
  strictnessLevel: StrictnessLevel
): Color[] => {
  // Generate perceptually distinct base colors
  const baseColors = generatePerceptuallyDistinctColors(12);
  
  // Create color objects with light and dark variants
  const colors: Color[] = baseColors.map((baseColor, i) => {
    // Get target contrast for the strictness level
    const targetContrast = getTargetContrastForLevel(strictnessLevel);
    
    // Optimize colors for light and dark backgrounds
    const lightModeColor = optimizeColorForBackground(baseColor, lightBackground, targetContrast);
    const darkModeColor = optimizeColorForBackground(baseColor, darkBackground, targetContrast);
    
    return {
      name: `Color ${i + 1}`,
      token: `color.${i}`,
      light: {
        hex: lightModeColor,
        contrastRatio: calculateContrastRatio(lightModeColor, lightBackground),
        wcagCompliance: checkWCAGCompliance(lightModeColor, lightBackground)
      },
      dark: {
        hex: darkModeColor,
        contrastRatio: calculateContrastRatio(darkModeColor, darkBackground),
        wcagCompliance: checkWCAGCompliance(darkModeColor, darkBackground)
      }
    };
  });
  
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