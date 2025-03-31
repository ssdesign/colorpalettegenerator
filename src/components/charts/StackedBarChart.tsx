import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import chroma from 'chroma-js';

interface StackedBarChartProps {
  colorHexes: string[];
  backgroundColor: string;
}

// Generate random data for the chart
const generateData = () => {
  const categories = ['Category 1', 'Category 2', 'Category 3', 'Category 4'];
  return categories.map(category => {
    const obj: Record<string, any> = { name: category };
    // Create stacked data with values that make sense for stacking
    for (let i = 1; i <= 5; i++) {
      obj[`value${i}`] = Math.floor(Math.random() * 30) + 5;
    }
    return obj;
  });
};

const StackedBarChart: React.FC<StackedBarChartProps> = ({ colorHexes, backgroundColor }) => {
  // Memoize the data so it only changes when the component mounts
  const data = useMemo(() => generateData(), []);
  
  // Determine if we're in dark mode based on the background color
  const isDarkMode = chroma(backgroundColor).get('lab.l') < 50;
  
  // Set the text and grid colors based on the mode
  const textColor = isDarkMode ? '#FFFFFF' : '#333333';
  const gridColor = isDarkMode ? '#444444' : '#DDDDDD';
  
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          // Set barSize to make stacked bars more visible
          barSize={25}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="name" tick={{ fill: textColor }} />
          <YAxis tick={{ fill: textColor }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: backgroundColor,
              color: textColor,
              border: `1px solid ${gridColor}`
            }}
            labelStyle={{ color: textColor }}
          />
          <Legend wrapperStyle={{ color: textColor }} />
          {colorHexes.slice(0, 5).map((color, index) => (
            <Bar 
              key={index} 
              dataKey={`value${index + 1}`} 
              fill={color} 
              name={`Series ${index + 1}`} 
              // This is the key difference: stacked bars
              stackId="a"
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StackedBarChart; 