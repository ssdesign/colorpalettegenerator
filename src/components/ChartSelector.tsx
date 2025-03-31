import React from 'react';
import { ChartType } from '../types';

interface ChartSelectorProps {
  selectedChart: ChartType;
  onChange: (chartType: ChartType) => void;
}

const ChartSelector: React.FC<ChartSelectorProps> = ({ selectedChart, onChange }) => {
  const chartTypes: { value: ChartType; label: string }[] = [
    { value: 'bar', label: 'Bar Chart' },
    { value: 'line', label: 'Line Chart' },
    { value: 'stackedBar', label: 'Stacked Bar' },
    { value: 'pie', label: 'Pie Chart' },
    { value: 'scatter', label: 'Scatter Plot' },
  ];

  return (
    <div className="p-4 rounded-lg border mb-6 backdrop-blur-sm" 
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(0, 0, 0, 0.2)'
      }}
    >
      <h3 className="text-lg font-semibold mb-4">Chart Type</h3>
      <div className="flex flex-wrap gap-2">
        {chartTypes.map((chartType) => (
          <button
            key={chartType.value}
            className={`px-3 py-2 rounded-md transition-colors ${
              selectedChart === chartType.value
                ? 'bg-blue-500 text-white'
                : 'bg-white bg-opacity-10 hover:bg-opacity-20'
            }`}
            onClick={() => onChange(chartType.value)}
          >
            {chartType.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChartSelector; 