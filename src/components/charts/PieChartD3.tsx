import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import chroma from 'chroma-js';

interface PieChartD3Props {
  colorHexes: string[];
  backgroundColor: string;
}

interface DataPoint {
  name: string;
  value: number;
}

const PieChartD3: React.FC<PieChartD3Props> = ({ colorHexes, backgroundColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isDarkMode = chroma(backgroundColor).get('lab.l') < 50;
  const textColor = isDarkMode ? '#FFFFFF' : '#333333';

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Generate sample data
    const data: DataPoint[] = d3.range(1, 6).map(i => ({
      name: `Series ${i}`,
      value: Math.floor(Math.random() * 50) + 10
    }));

    // Set up dimensions
    const margin = { top: 40, right: 80, bottom: 40, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .append("g")
      .attr("transform", `translate(${width / 2 + margin.left},${height / 2 + margin.top})`);

    // Create tooltip
    const tooltip = d3.select(containerRef.current)
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", isDarkMode ? '#1F2937' : 'white')
      .style("border", `1px solid ${isDarkMode ? '#444444' : '#DDDDDD'}`)
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("font-size", "12px")
      .style("color", textColor)
      .style("pointer-events", "none")
      .style("z-index", "100")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

    // Create pie generator
    const pie = d3.pie<DataPoint>()
      .value(d => d.value)
      .sort(null);

    // Create arc generator
    const arc = d3.arc<d3.PieArcDatum<DataPoint>>()
      .innerRadius(0)
      .outerRadius(radius);

    // Create arc generator for hover effect
    const arcHover = d3.arc<d3.PieArcDatum<DataPoint>>()
      .innerRadius(0)
      .outerRadius(radius * 1.1);

    // Draw pie slices
    const slices = svg.selectAll("path")
      .data(pie(data))
      .join("path")
      .attr("d", arc)
      .attr("fill", (_, i) => colorHexes[i])
      .attr("stroke", backgroundColor)
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        const slice = d3.select(event.currentTarget);
        slice.transition()
          .duration(200)
          .attr("d", (d: any) => arcHover(d));

        const total = d3.sum(data, d => d.value);
        const percentage = ((d.value / total) * 100).toFixed(1);

        const tooltipContent = `
          <div style="color: ${colorHexes[d.index]}"><strong>${d.data.name}</strong></div>
          <div>Value: ${d.value}</div>
          <div>Percentage: ${percentage}%</div>
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
      .on("mouseout", (event) => {
        const slice = d3.select(event.currentTarget);
        slice.transition()
          .duration(200)
          .attr("d", (d: any) => arc(d));

        tooltip.style("visibility", "hidden");
      });

    // Add percentage labels
    const total = d3.sum(data, d => d.value);
    svg.selectAll("text.percentage")
      .data(pie(data))
      .join("text")
      .attr("class", "percentage")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("fill", d => {
        // Get the color of the slice
        const sliceColor = colorHexes[d.index];
        // Calculate the luminance of the slice color
        const luminance = chroma(sliceColor).luminance();
        // Return white for dark slices, black for light slices
        return luminance < 0.5 ? '#FFFFFF' : '#000000';
      })
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("pointer-events", "none")
      .text(d => `${((d.value / total) * 100).toFixed(0)}%`);

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${radius + 20}, ${-radius})`);

    data.forEach((d, i) => {
      const g = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      g.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", colorHexes[i]);

      g.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .attr("fill", textColor)
        .text(d.name);
    });

    // Add title
    svg.append("text")
      .attr("x", 0)
      .attr("y", -radius - 20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("fill", textColor)
      .text("Pie Chart");

    // Cleanup function
    return () => {
      tooltip.remove();
    };

  }, [colorHexes, backgroundColor, isDarkMode, textColor]);

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

export default PieChartD3; 