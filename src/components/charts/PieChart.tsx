import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  Sector
} from 'recharts';
import chroma from 'chroma-js';

interface PieChartProps {
  colorHexes: string[];
  backgroundColor: string;
}

// Generate random data for the chart
const generateData = (numPieces: number) => {
  const data = [];
  const labels = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];
  
  for (let i = 0; i < Math.min(numPieces, labels.length); i++) {
    data.push({
      name: labels[i],
      value: Math.floor(Math.random() * 100) + 20
    });
  }
  
  return data;
};

// Custom label renderer that keeps labels inside the chart area
const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, fill } = props;
  
  // Calculate the position of the label
  const RADIAN = Math.PI / 180;
  // Use a smaller radius to keep labels closer to the pie
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Only show percentage for significant slices (more than 5%)
  if (percent < 0.05) return null;
  
  // Calculate the luminance of the fill color to determine if we should use white or black text
  const luminance = chroma(fill).luminance();
  const textColor = luminance > 0.5 ? '#000000' : '#FFFFFF';
  
  return (
    <text 
      x={x} 
      y={y} 
      fill={textColor}
      textAnchor="middle" 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
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
    <div className="w-full h-64 rounded-lg">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            // Reduce outer radius to leave more space
            outerRadius={65}
            // Add inner radius for a donut chart look which helps with label space
            innerRadius={30}
            fill="#8884d8"
            dataKey="value"
            // Use custom label renderer
            label={renderCustomizedLabel}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]} 
                stroke={backgroundColor}
                strokeWidth={1}
              />
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
          <Legend 
            formatter={renderColorfulLegendText}
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart; 