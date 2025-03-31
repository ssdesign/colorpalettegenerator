import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import chroma from 'chroma-js';

interface PieChartProps {
  colorHexes: string[];
  backgroundColor: string;
}

// Generate random data for the chart
const generateData = (numPieces: number) => {
  const data = [];
  const labels = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta'];
  
  for (let i = 0; i < Math.min(numPieces, labels.length); i++) {
    data.push({
      name: labels[i],
      value: Math.floor(Math.random() * 100) + 20
    });
  }
  
  return data;
};

const PieChart: React.FC<PieChartProps> = ({ colorHexes, backgroundColor }) => {
  // Use up to 6 colors for the pie chart
  const numSlices = Math.min(colorHexes.length, 6);
  
  // Memoize the data so it only changes when the component mounts
  const data = useMemo(() => generateData(numSlices), [numSlices]);
  const colors = colorHexes.slice(0, numSlices);
  
  // Determine if we're in dark mode based on the background color
  const isDarkMode = chroma(backgroundColor).get('lab.l') < 50;
  
  // Set the text color based on the mode
  const textColor = isDarkMode ? '#FFFFFF' : '#333333';
  
  // Custom renderer for the legend to ensure text color is correct
  const renderColorfulLegendText = (value: string) => {
    return <span style={{ color: textColor }}>{value}</span>;
  };

  return (
    <div className="w-full h-64 rounded-lg p-4">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: backgroundColor,
              color: textColor,
              border: `1px solid ${isDarkMode ? '#444444' : '#DDDDDD'}`
            }}
            labelStyle={{ color: textColor }}
          />
          <Legend formatter={renderColorfulLegendText} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart; 