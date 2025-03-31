import React, { useCallback } from 'react';
import { Palette, ChartType } from '../types';
import BarChart from './charts/BarChart';
import BarChartD3 from './charts/BarChartD3';
import LineChart from './charts/LineChart';
import LineChartD3 from './charts/LineChartD3';
import PieChart from './charts/PieChart';
import PieChartD3 from './charts/PieChartD3';
import StackedBarChart from './charts/StackedBarChart';
import StackedBarChartD3 from './charts/StackedBarChartD3';
import ChoroplethChart from './charts/ChoroplethChart';
import HeatmapChart from './charts/HeatmapChart';
import DensityChart from './charts/DensityChart';

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
        return <BarChartD3 colorHexes={colorHexes} backgroundColor={currentBackground} />;
      case 'line':
        return <LineChartD3 colorHexes={colorHexes} backgroundColor={currentBackground} />;
      case 'pie':
        return <PieChartD3 colorHexes={colorHexes} backgroundColor={currentBackground} />;
      case 'stackedBar':
        return <StackedBarChartD3 colorHexes={colorHexes} backgroundColor={currentBackground} />;
      case 'choropleth':
        return <ChoroplethChart colorHexes={colorHexes} backgroundColor={currentBackground} />;
      case 'heatmap':
        return <HeatmapChart colorHexes={colorHexes} backgroundColor={currentBackground} />;
      case 'density':
        return <DensityChart colorHexes={colorHexes} backgroundColor={currentBackground} />;
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