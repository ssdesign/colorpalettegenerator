import React from 'react';
import ChartDisplay from './ChartDisplay';
import ExportOptions from './ExportOptions';
import { AppState } from '../types';
import chroma from 'chroma-js';

interface RightPanelProps {
  state: AppState;
  onChartTypeChange: (type: 'bar' | 'line' | 'stackedBar' | 'pie') => void;
  getCurrentPalette: () => any;
  getCurrentBackground: () => string;
  onOpenExportModal: (format: 'json' | 'css' | 'scss' | 'figma') => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  state,
  onChartTypeChange,
  getCurrentPalette,
  getCurrentBackground,
  onOpenExportModal
}) => {
  const currentBackground = getCurrentBackground();
  const isDarkMode = chroma(currentBackground).get('lab.l') < 50;
  const textColor = isDarkMode ? '#FFFFFF' : '#333333';
  const inactiveTextColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const borderColor = isDarkMode ? '#374151' : '#E5E7EB';
  const activeColor = isDarkMode ? '#60A5FA' : '#0066FF';

  return (
    <div className="w-[35%] flex flex-col h-full pr-24">
      <div className="container mx-auto px-6 py-4 border-b flex-shrink-0" style={{ borderColor }}>
        <div className="flex gap-8 py-3">
          {[
            { display: 'Bar chart', value: 'bar' as const },
            { display: 'Line chart', value: 'line' as const },
            { display: 'Stacked bar chart', value: 'stackedBar' as const },
            { display: 'Pie chart', value: 'pie' as const }
          ].map((chart) => (
            <button
              key={chart.display}
              className={`pb-2 px-1 text-sm font-medium relative`}
              style={{
                color: state.selectedChartType === chart.value ? activeColor : inactiveTextColor
              }}
              onClick={() => onChartTypeChange(chart.value)}
            >
              {chart.display}
              {state.selectedChartType === chart.value && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: activeColor }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col flex-1">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-4">
            <ChartDisplay 
              chartType={state.selectedChartType} 
              palette={getCurrentPalette()}
              currentMode={state.currentMode}
              currentBackground={currentBackground}
            />
          </div>
        </div>

        {/* Export Options */}
        <div className="container mx-auto px-6 pb-4 pt-2 border-t flex-shrink-0" style={{ borderColor }}>
          <ExportOptions 
            palettes={state.palettes} 
            tokenPrefix={state.tokenSettings.prefix} 
            mode={state.currentMode}
            textColor={textColor}
            inactiveTextColor={inactiveTextColor}
            borderColor={borderColor}
            onOpenExportModal={onOpenExportModal}
          />
        </div>
      </div>
    </div>
  );
}; 