import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import chroma from 'chroma-js';

interface HeatmapChartProps {
  colorHexes: string[];
  backgroundColor: string;
}

interface DataPoint {
  row: string;
  col: string;
  value: number;
}

const HeatmapChart: React.FC<HeatmapChartProps> = ({ colorHexes, backgroundColor }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDarkMode = chroma(backgroundColor).get('lab.l') < 50;
  const textColor = isDarkMode ? '#FFFFFF' : '#333333';

  useEffect(() => {
    if (!svgRef.current) return;

    // Generate sample data
    const rows = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i)); // A to L
    const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString()); // 1 to 12
    const data: DataPoint[] = [];

    // Generate data with a pattern (could be replaced with real data)
    rows.forEach((row, i) => {
      cols.forEach((col, j) => {
        // Generate random value between 0 and 10
        const value = Math.random() * 10;
        data.push({ row, col, value });
      });
    });

    // Set up dimensions
    const margin = { top: 30, right: 20, bottom: 35, left: 40 };
    const containerWidth = 400;
    const containerHeight = 250; // Reduced height to match Choropleth better
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("width", "100%")
      .attr("height", "100%")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Build X scales and axis
    const x = d3.scaleBand()
      .range([0, width])
      .domain(cols)
      .padding(0.02); // Reduced padding for smaller cells

    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", textColor)
      .style("font-size", "10px") // Smaller font for more numbers
      .style("text-anchor", "middle");

    // Build Y scales and axis
    const y = d3.scaleBand()
      .range([height, 0])
      .domain(rows)
      .padding(0.02); // Reduced padding for smaller cells

    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .attr("fill", textColor)
      .style("font-size", "10px"); // Smaller font for more letters

    // Create color scale
    const colorScale = chroma.scale(colorHexes).domain([0, 10]);

    // Add the squares
    svg.selectAll()
      .data(data)
      .join("rect")
      .attr("x", d => x(d.col) || 0)
      .attr("y", d => y(d.row) || 0)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => colorScale(d.value).hex())
      .style("stroke", isDarkMode ? "#444444" : "#DDDDDD")
      .style("stroke-width", 0.5); // Thinner borders for smaller cells

    // Add title with adjusted y-position
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2 + 5)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("fill", textColor)
      .text("Heatmap");

    // Add legend with adjusted positioning
    const legendWidth = width * 0.8;
    const legendHeight = 8;
    const legendX = (width - legendWidth) / 2;
    const legendY = height + 10; // Adjusted to be closer to the chart

    // Create gradient for legend
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    // Add color stops
    colorHexes.forEach((color, i) => {
      gradient.append("stop")
        .attr("offset", `${(i / (colorHexes.length - 1)) * 100}%`)
        .attr("stop-color", color);
    });

    // Create a group for the legend
    const legendGroup = svg.append("g")
      .attr("class", "legend-group")
      .attr("transform", `translate(0, ${margin.bottom/2})`);

    // Add gradient rectangle
    legendGroup.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)")
      .style("stroke", isDarkMode ? "#444444" : "#DDDDDD")
      .style("stroke-width", 1);

    // Add legend axis with more ticks and formatted numbers
    const legendScale = d3.scaleLinear()
      .domain([0, 10])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5) // Reduced ticks for better readability
      .tickFormat(d => d3.format(".0f")(d)); // Removed decimal places for cleaner look

    legendGroup.append("g")
      .attr("class", "legend-axis")
      .attr("transform", `translate(${legendX}, ${legendY + legendHeight})`)
      .call(legendAxis)
      .selectAll("text")
      .attr("fill", textColor)
      .style("font-size", "12px"); // Increased font size

    // Style the axis lines
    legendGroup.select(".legend-axis")
      .select(".domain")
      .style("stroke", isDarkMode ? "#444444" : "#DDDDDD");

    legendGroup.select(".legend-axis")
      .selectAll(".tick line")
      .style("stroke", isDarkMode ? "#444444" : "#DDDDDD");

    // Add legend title
    legendGroup.append("text")
      .attr("x", legendX)
      .attr("y", legendY - 8)
      .attr("text-anchor", "start")
      .attr("fill", textColor)
      .style("font-size", "12px")
      .text("Value");

  }, [colorHexes, backgroundColor, isDarkMode, textColor]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export default HeatmapChart; 