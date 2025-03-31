import React, { useCallback } from 'react';
import { Palette, ChartType } from '../types';
import BarChart from './charts/BarChart';
import LineChart from './charts/LineChart';
import PieChart from './charts/PieChart';

interface ChartDisplayProps {
  chartType: ChartType;
  palette?: Palette;
  currentMode: 'light' | 'dark';
  currentBackground: string;
}

const ChartDisplay: React.FC<ChartDisplayProps> = ({
  chartType,
  palette,
  currentMode,
  currentBackground
}) => {
  const chartContainerStyle = {
    backgroundColor: currentBackground,
    color: currentMode === 'light' ? '#000000' : '#FFFFFF',
    borderColor: currentMode === 'light' ? '#E5E7EB' : '#333333'
  };

  // Handle case when palette is not yet available
  if (!palette) {
    return (
      <div 
        className="rounded-lg border p-4 mb-6 shadow-sm flex items-center justify-center"
        style={chartContainerStyle}
      >
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Chart Preview</h2>
          <p>Please generate palettes to see chart preview</p>
        </div>
      </div>
    );
  }

  // Get color hexes based on the current mode
  const getColorHexes = useCallback(() => {
    return palette.colors.map(color => currentMode === 'light' ? color.light.hex : color.dark.hex);
  }, [palette, currentMode]);

  const colorHexes = getColorHexes();

  const renderChart = () => {
    switch(chartType) {
      case 'bar':
        return <BarChart colorHexes={colorHexes} backgroundColor={currentBackground} />;
      case 'line':
        return <LineChart colorHexes={colorHexes} backgroundColor={currentBackground} />;
      case 'pie':
        return <PieChart colorHexes={colorHexes} backgroundColor={currentBackground} />;
      case 'stackedBar':
        // We'll treat stacked bar the same as regular bar for now
        return <BarChart colorHexes={colorHexes} backgroundColor={currentBackground} />;
      case 'scatter':
        // We'll treat scatter the same as line for now
        return <LineChart colorHexes={colorHexes} backgroundColor={currentBackground} />;
      default:
        return <div>Select a chart type</div>;
    }
  };

  return (
    <div 
      className="rounded-lg border p-4 mb-6 shadow-sm"
      style={chartContainerStyle}
    >
      <h2 className="text-xl font-semibold mb-4">Chart Preview</h2>
      <div className="h-64">
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartDisplay; 