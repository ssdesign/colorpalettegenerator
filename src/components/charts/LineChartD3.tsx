import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import chroma from 'chroma-js';

interface LineChartD3Props {
  colorHexes: string[];
  backgroundColor: string;
}

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

const LineChartD3: React.FC<LineChartD3Props> = ({ colorHexes, backgroundColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isDarkMode = chroma(backgroundColor).get('lab.l') < 50;
  const textColor = isDarkMode ? '#FFFFFF' : '#333333';
  const gridColor = isDarkMode ? '#444444' : '#DDDDDD';

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Generate sample data
    const categories = ['A', 'B', 'C', 'D', 'E'];
    const data: DataPoint[] = categories.map(category => {
      const values: DataPoint = { name: category };
      for (let i = 1; i <= 5; i++) {
        values[`value${i}`] = Math.floor(Math.random() * 50) + 10;
      }
      return values;
    });

    // Set up dimensions
    const margin = { top: 40, right: 80, bottom: 40, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip
    const tooltip = d3.select(containerRef.current)
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", isDarkMode ? '#1F2937' : 'white')
      .style("border", `1px solid ${gridColor}`)
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("font-size", "12px")
      .style("color", textColor)
      .style("pointer-events", "none")
      .style("z-index", "100")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

    // Create scales
    const x = d3.scalePoint<string>()
      .domain(categories)
      .range([0, width])
      .padding(0.5);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => 
        d3.max(Object.entries(d)
          .filter(([key]) => key.startsWith('value'))
          .map(([_, value]) => value as number)
        ) || 0
      ) || 0])
      .nice()
      .range([height, 0]);

    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", textColor);

    // Add Y axis
    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .attr("fill", textColor);

    // Add grid lines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(() => '')
      )
      .attr("stroke", isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)')
      .attr("stroke-opacity", 0.1);

    // Create line generator
    const line = d3.line<[string, number]>()
      .x(d => x(d[0]) || 0)
      .y(d => y(d[1]));

    // Create a group for hover effects
    const hoverGroup = svg.append("g")
      .style("pointer-events", "none");

    // Create vertical line for hover effect
    const verticalLine = hoverGroup.append("line")
      .attr("stroke", gridColor)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .style("visibility", "hidden");

    // Draw lines for each series
    for (let i = 1; i <= 5; i++) {
      const seriesData = data.map(d => [d.name, d[`value${i}`] as number] as [string, number]);
      
      svg.append("path")
        .datum(seriesData)
        .attr("fill", "none")
        .attr("stroke", colorHexes[i - 1])
        .attr("stroke-width", 2)
        .attr("d", line);

      // Add interactive dots
      svg.selectAll(`dot-series-${i}`)
        .data(seriesData)
        .join("circle")
        .attr("cx", d => x(d[0]) || 0)
        .attr("cy", d => y(d[1]))
        .attr("r", 4)
        .attr("fill", colorHexes[i - 1])
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
          const [category, _] = d;
          const xPos = x(category) || 0;

          // Show and position vertical line
          verticalLine
            .attr("x1", xPos)
            .attr("x2", xPos)
            .attr("y1", 0)
            .attr("y2", height)
            .style("visibility", "visible");

          // Create tooltip content with all series values at this x-position
          const tooltipContent = `
            <div style="margin-bottom: 4px"><strong>${category}</strong></div>
            ${colorHexes.slice(0, 5).map((color, idx) => {
              const value = data.find(d => d.name === category)?.[`value${idx + 1}`] as number;
              return `<div style="color: ${color}">Series ${idx + 1}: ${value}</div>`;
            }).join('')}
          `;

          tooltip
            .style("visibility", "visible")
            .html(tooltipContent);

          // Get mouse position relative to the container
          const mouseX = event.offsetX;
          const mouseY = event.offsetY;

          // Position tooltip with offset
          tooltip
            .style("left", `${mouseX + 10}px`)
            .style("top", `${mouseY - 40}px`);
        })
        .on("mouseout", () => {
          verticalLine.style("visibility", "hidden");
          tooltip.style("visibility", "hidden");
        });
    }

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width + 10}, 0)`);

    colorHexes.slice(0, 5).forEach((color, i) => {
      const g = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      g.append("line")
        .attr("x1", 0)
        .attr("y1", 7)
        .attr("x2", 15)
        .attr("y2", 7)
        .attr("stroke", color)
        .attr("stroke-width", 2);

      g.append("circle")
        .attr("cx", 7.5)
        .attr("cy", 7)
        .attr("r", 4)
        .attr("fill", color);

      g.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .attr("fill", textColor)
        .text(`Series ${i + 1}`);
    });

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("fill", textColor)
      .text("Line Chart");

    // Cleanup function to remove tooltip when component unmounts
    return () => {
      tooltip.remove();
    };

  }, [colorHexes, backgroundColor, isDarkMode, textColor, gridColor]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full" 
      style={{ position: 'relative' }}
    >
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
};

export default LineChartD3; 