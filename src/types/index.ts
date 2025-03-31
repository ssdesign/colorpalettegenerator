export interface Color {
  name: string;
  token: string;
  editable?: boolean; // Flag to determine if this color is editable
  // Light mode-specific color data
  light: {
    hex: string;
    contrastRatio: number;
    wcagCompliance: {
      AALarge: boolean;
      AASmall: boolean;
      AAALarge: boolean;
      AAASmall: boolean;
    };
  };
  // Dark mode-specific color data
  dark: {
    hex: string;
    contrastRatio: number;
    wcagCompliance: {
      AALarge: boolean;
      AASmall: boolean;
      AAALarge: boolean;
      AAASmall: boolean;
    };
  };
}

export interface Palette {
  id: string;
  name: string;
  type: 'categorical' | 'sequential' | 'diverging';
  colors: Color[];
  lightModeBackground: string;
  darkModeBackground: string;
}

export type StrictnessLevel = 'AALarge' | 'AASmall' | 'AAALarge' | 'AAASmall';

export type ChartType = 'bar' | 'line' | 'stackedBar' | 'pie' | 'scatter';

export interface TokenSettings {
  prefix: string;
}

export interface AppState {
  lightModeBaseColor: string;
  darkModeBaseColor: string;
  currentMode: 'light' | 'dark';
  palettes: Palette[];
  tokenSettings: TokenSettings;
  selectedChartType: ChartType;
  strictnessLevel: StrictnessLevel;
  selectedPaletteType: 'categorical' | 'sequential' | 'diverging';
} 