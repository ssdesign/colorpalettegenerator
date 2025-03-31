import { Palette } from '../types';

// Export palettes as JSON in Design Tokens format
export const exportAsJSON = (palettes: Palette[], tokenPrefix: string, mode: 'light' | 'dark' = 'light'): string => {
  const jsonData: Record<string, any> = {};
  
  palettes.forEach(palette => {
    const paletteKey = `${palette.type.toLowerCase()}-${palette.name.toLowerCase().replace(/\s+/g, '-')}`;
    jsonData[paletteKey] = {
      $type: "group",
      $description: `${palette.type} - ${palette.name}`,
    };
    
    palette.colors.forEach((color, index) => {
      const tokenName = `${index.toString().padStart(2, '0')}`;
      jsonData[paletteKey][tokenName] = {
        $type: "color",
        $description: `${palette.type} ${palette.name} color ${index}`,
        $value: {
          light: color.light.hex,
          dark: color.dark.hex
        }
      };
    });
  });
  
  return JSON.stringify(jsonData, null, 2);
};

// Export palettes as CSS variables with both modes
export const exportAsCSS = (palettes: Palette[], tokenPrefix: string): string => {
  let css = `:root {\n  /* Light mode colors */\n`;
  
  palettes.forEach(palette => {
    const paletteName = palette.name.toLowerCase().replace(/\s+/g, '-');
    
    palette.colors.forEach((color, index) => {
      const tokenName = `--${tokenPrefix}-${palette.type}-${paletteName}-${index.toString().padStart(2, '0')}`;
      css += `  ${tokenName}: ${color.light.hex};\n`;
    });
  });
  
  css += `\n  /* Dark mode colors */\n`;
  
  css += `}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n`;
  
  palettes.forEach(palette => {
    const paletteName = palette.name.toLowerCase().replace(/\s+/g, '-');
    
    palette.colors.forEach((color, index) => {
      const tokenName = `--${tokenPrefix}-${palette.type}-${paletteName}-${index.toString().padStart(2, '0')}`;
      css += `    ${tokenName}: ${color.dark.hex};\n`;
    });
  });
  
  css += `  }\n}\n`;
  return css;
};

// Export palettes as SCSS variables with both modes
export const exportAsSCSS = (palettes: Palette[], tokenPrefix: string): string => {
  let scss = '// Light mode colors\n$light-mode: true !default;\n\n';
  
  palettes.forEach(palette => {
    const paletteName = palette.name.toLowerCase().replace(/\s+/g, '-');
    
    palette.colors.forEach((color, index) => {
      const tokenName = `$${tokenPrefix}-${palette.type}-${paletteName}-${index.toString().padStart(2, '0')}`;
      scss += `${tokenName}-light: ${color.light.hex};\n`;
      scss += `${tokenName}-dark: ${color.dark.hex};\n`;
      scss += `${tokenName}: if($light-mode, ${tokenName}-light, ${tokenName}-dark);\n\n`;
    });
  });
  
  return scss;
};

// Export palettes as Design Tokens format (for Figma and other tools)
export const exportAsDesignTokens = (palettes: Palette[], tokenPrefix: string): string => {
  // Create the structure exactly matching the example format
  const figmaVariables: Record<string, any> = {
    "id": "VariableCollectionId:61:74",
    "name": tokenPrefix || "Color Palette",
    "modes": {
      "61:0": "Light",
      "61:1": "Dark"
    },
    "variableIds": [] as string[],
    "variables": [] as any[]
  };
  
  // Start variable ID counter
  let idCounter = 75;
  
  // Process all palettes and colors
  palettes.forEach(palette => {
    const paletteType = palette.type.toLowerCase();
    
    palette.colors.forEach((color, index) => {
      // Create variable ID and add to IDs array
      const variableId = `VariableID:61:${idCounter}`;
      figmaVariables.variableIds.push(variableId);
      idCounter++;
      
      // Create variable name with namespace, converting dots to slashes
      const formattedPrefix = tokenPrefix ? tokenPrefix.replace(/\./g, '/') : "com/dataviz";
      const varName = `${formattedPrefix}/${paletteType}/${index.toString().padStart(2, '0')}`;
      
      // Create light and dark mode color values
      const lightColor = rgbaFromHex(color.light.hex);
      const darkColor = rgbaFromHex(color.dark.hex);
      
      // Add the variable with full structure as in the example
      figmaVariables.variables.push({
        "id": variableId,
        "name": varName,
        "description": `${palette.type} ${palette.name} color ${index}`,
        "type": "COLOR",
        "valuesByMode": {
          "61:0": lightColor,
          "61:1": darkColor
        },
        "resolvedValuesByMode": {
          "61:0": {
            "resolvedValue": lightColor,
            "alias": null
          },
          "61:1": {
            "resolvedValue": darkColor,
            "alias": null
          }
        },
        "scopes": ["ALL_SCOPES"],
        "hiddenFromPublishing": false,
        "codeSyntax": {}
      });
    });
  });
  
  return JSON.stringify(figmaVariables);
};

// Helper function to convert hex to RGBA object format that Figma uses
function rgbaFromHex(hex: string): { r: number, g: number, b: number, a: number } {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values to numbers with precise decimal representation
  const r = Number((parseInt(hex.slice(0, 2), 16) / 255).toFixed(15));
  const g = Number((parseInt(hex.slice(2, 4), 16) / 255).toFixed(15));
  const b = Number((parseInt(hex.slice(4, 6), 16) / 255).toFixed(15));
  
  // Return rgba object with exact precision as in the sample
  return { r, g, b, a: 1 };
}

// Download a text file
export const downloadFile = (content: string, fileName: string, contentType: string): void => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  
  URL.revokeObjectURL(a.href);
};

// Export palettes in different formats
export const exportPalettes = (
  palettes: Palette[], 
  tokenPrefix: string, 
  format: 'json' | 'css' | 'scss' | 'figma',
  mode: 'light' | 'dark',
  triggerDownload = true
) => {
  let content = '';
  let fileName = '';
  let contentType = 'text/plain';
  
  // Generate content based on format
  switch (format) {
    case 'json':
      content = exportAsJSON(palettes, tokenPrefix);
      fileName = `color-palettes.json`;
      contentType = 'application/json';
      break;
    case 'css':
      content = exportAsCSS(palettes, tokenPrefix);
      fileName = `color-palettes.css`;
      contentType = 'text/css';
      break;
    case 'scss':
      content = exportAsSCSS(palettes, tokenPrefix);
      fileName = `color-palettes.scss`;
      contentType = 'text/scss';
      break;
    case 'figma':
      content = exportAsDesignTokens(palettes, tokenPrefix);
      fileName = `design-tokens.json`;
      contentType = 'application/json';
      break;
  }
  
  // If triggerDownload is false, just return the content
  if (!triggerDownload) {
    return {
      content,
      filename: fileName,
      contentType
    };
  }
  
  // Otherwise, trigger the download
  downloadFile(content, fileName, contentType);
  
  return {
    content,
    filename: fileName,
    contentType
  };
}; 