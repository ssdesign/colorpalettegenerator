import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import chroma from 'chroma-js';

interface ChoroplethChartProps {
  colorHexes: string[];
  backgroundColor: string;
}

interface GeometryObject {
  type: string;
  geometries: Array<{
    type: string;
    id: string;
    properties: { [key: string]: any };
  }>;
}

interface Topology {
  type: string;
  objects: {
    counties: GeometryObject;
    states: GeometryObject;
  };
  arcs: Array<Array<[number, number]>>;
  transform: {
    scale: [number, number];
    translate: [number, number];
  };
}

type CountyFeature = Feature<Geometry, GeoJsonProperties> & { id: string };

const ChoroplethChart: React.FC<ChoroplethChartProps> = ({ colorHexes, backgroundColor }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDarkMode = chroma(backgroundColor).get('lab.l') < 50;
  const textColor = isDarkMode ? '#FFFFFF' : '#333333';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json"
        );
        const topology = await response.json() as Topology;

        if (!topology || !svgRef.current) return;

        // Generate random data for counties
        const counties = new Map<string, number>();
        topology.objects.counties.geometries.forEach(d => {
          counties.set(d.id, Math.random() * 10);
        });

        // Set up dimensions
        const width = 975;
        const height = 610;
        const marginTop = 20;
        const marginRight = 20;

        // Clear previous content
        d3.select(svgRef.current).selectAll("*").remove();

        // Create the SVG container
        const svg = d3.select(svgRef.current)
          .attr("viewBox", `0 0 ${width} ${height}`)
          .attr("width", "100%")
          .attr("height", "100%")
          .attr("style", "max-width: 100%; height: auto;");

        // Create color scale
        const color = chroma.scale(colorHexes);

        // Create path generator
        const path = d3.geoPath();

        // Draw counties
        const countyFeatures = topojson.feature(topology as any, topology.objects.counties) as unknown as FeatureCollection<Geometry, GeoJsonProperties>;
        svg.append("g")
          .selectAll("path")
          .data(countyFeatures.features)
          .join("path")
          .attr("fill", (d: CountyFeature) => {
            const value = counties.get(d.id);
            return value !== undefined ? color(value / 10).hex() : backgroundColor;
          })
          .attr("d", path)
          .attr("stroke", isDarkMode ? "#444444" : "#DDDDDD")
          .attr("stroke-width", 0.25);

        // Draw state borders
        const stateBorders = topojson.mesh(topology as any, topology.objects.states, (a, b) => a !== b);
        svg.append("path")
          .datum(stateBorders)
          .attr("fill", "none")
          .attr("stroke", isDarkMode ? "#666666" : "#BBBBBB")
          .attr("stroke-width", 1)
          .attr("d", path);

        // Add legend
        const legendWidth = 260;
        const legendHeight = 40;
        const legendX = width - legendWidth - marginRight;
        const legendY = marginTop;

        const legend = svg.append("g")
          .attr("transform", `translate(${legendX},${legendY})`);

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

        // Add gradient rectangle
        legend.append("rect")
          .attr("width", legendWidth)
          .attr("height", 10)
          .style("fill", "url(#legend-gradient)");

        // Add legend axis
        const legendScale = d3.scaleLinear()
          .domain([0, 10])
          .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
          .ticks(5)
          .tickSize(13);

        legend.append("g")
          .attr("transform", "translate(0,10)")
          .call(legendAxis)
          .call(g => g.select(".domain").remove())
          .selectAll("text")
          .attr("fill", textColor);

        // Add legend title
        legend.append("text")
          .attr("y", -6)
          .attr("fill", textColor)
          .attr("text-anchor", "start")
          .attr("font-weight", "bold")
          .text("Value");

      } catch (error) {
        console.error("Error loading or rendering data:", error);
      }
    };

    fetchData();
  }, [colorHexes, backgroundColor, isDarkMode, textColor]);

  return (
    <div className="w-full h-full" style={{ aspectRatio: '975/610' }}>
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

export default ChoroplethChart; 