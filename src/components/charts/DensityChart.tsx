import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import chroma from 'chroma-js';

interface DensityChartProps {
  colorHexes: string[];
  backgroundColor: string;
}

const DensityChart: React.FC<DensityChartProps> = ({ colorHexes, backgroundColor }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDarkMode = chroma(backgroundColor).get('lab.l') < 50;
  const textColor = isDarkMode ? '#FFFFFF' : '#333333';

  useEffect(() => {
    if (!svgRef.current) return;

    // Generate sample data with a bimodal distribution
    const generateData = () => {
      const data: number[] = [];
      // First peak
      for (let i = 0; i < 500; i++) {
        data.push(d3.randomNormal(3, 0.5)());
      }
      // Second peak
      for (let i = 0; i < 300; i++) {
        data.push(d3.randomNormal(7, 0.8)());
      }
      return data.filter(d => d >= 0 && d <= 10); // Keep values between 0 and 10
    };

    const data = generateData();

    // Set up dimensions
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
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

    // Create scales
    const x = d3.scaleLinear()
      .domain([0, 10])
      .range([0, width]);

    // Create kernel density estimator
    const kde = (kernel: (v: number) => number, thresholds: number[], data: number[]) => {
      return thresholds.map(t => [t, d3.mean(data, d => kernel(t - d)) || 0]);
    };

    // Epanechnikov kernel function
    const epanechnikov = (bandwidth: number) => {
      return (x: number) => {
        return Math.abs(x /= bandwidth) <= 1 ? 0.75 * (1 - x * x) / bandwidth : 0;
      };
    };

    // Compute the density data
    const density = kde(epanechnikov(0.5), x.ticks(50), data);
    const maxDensity = d3.max(density, d => d[1]) || 0;

    const y = d3.scaleLinear()
      .domain([0, maxDensity])
      .range([height, 0]);

    // Create histogram
    const histogram = d3.histogram<number, number>()
      .domain(x.domain() as [number, number])
      .thresholds(x.ticks(30));

    const bins = histogram(data);
    const maxBinHeight = d3.max(bins, d => d.length) || 0;

    const yHistogram = d3.scaleLinear()
      .domain([0, maxBinHeight])
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

    // Create color gradient
    const gradientColor = chroma.scale(colorHexes);

    // Add the violin plot
    const violinPath = svg.append("path")
      .datum(density)
      .attr("fill", "none")
      .attr("stroke", colorHexes[1])
      .attr("stroke-width", 2)
      .attr("d", d3.line()
        .curve(d3.curveBasis)
        .x(d => x(d[0]))
        .y(d => y(d[1])) as any
      );

    // Mirror the violin plot
    const mirroredDensity = density.map(d => [d[0], -d[1]]);
    const violinPathMirrored = svg.append("path")
      .datum(mirroredDensity)
      .attr("fill", "none")
      .attr("stroke", colorHexes[1])
      .attr("stroke-width", 2)
      .attr("d", d3.line()
        .curve(d3.curveBasis)
        .x(d => x(d[0]))
        .y(d => y(-d[1])) as any
      );

    // Fill the violin
    const allDensity = [...density, ...mirroredDensity.reverse()];
    svg.append("path")
      .datum(allDensity)
      .attr("fill", colorHexes[1])
      .attr("fill-opacity", 0.4)
      .attr("stroke", "none")
      .attr("d", d3.line()
        .curve(d3.curveBasis)
        .x(d => x(d[0]))
        .y(d => y(d[1])) as any
      );

    // Add histogram bars
    svg.selectAll("rect")
      .data(bins)
      .join("rect")
      .attr("x", d => x(d.x0 || 0))
      .attr("y", d => yHistogram(d.length))
      .attr("width", d => x(d.x1 || 0) - x(d.x0 || 0))
      .attr("height", d => height - yHistogram(d.length))
      .attr("fill", (d, i) => gradientColor(i / bins.length).hex())
      .attr("fill-opacity", 0.8)
      .attr("stroke", isDarkMode ? "#444444" : "#DDDDDD")
      .attr("stroke-width", 1);

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("fill", textColor)
      .text("Density Distribution");

    // Add axis labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .attr("text-anchor", "middle")
      .style("fill", textColor)
      .text("Value");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .style("fill", textColor)
      .text("Density");

  }, [colorHexes, backgroundColor, isDarkMode, textColor]);

  return (
    <div className="w-full h-full" style={{ aspectRatio: '3/2' }}>
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

export default DensityChart; 