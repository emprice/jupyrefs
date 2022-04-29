import * as d3 from 'd3';

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
// (minor modifications made by @emprice)
export function ForceGraph(
  nodes: any[], // an iterable of node objects (typically [{id}, …])
  links: any[], // an iterable of link objects (typically [{source, target}, …])
  nodeId = (d: any) => d.id, // given d in nodes, returns a unique identifier (string)
  nodeGroup: any = null, // given d in nodes, returns an (ordinal) value for color
  colors: readonly string[] = d3.schemeTableau10, // an array of color strings, for the node groups
  nodeRadius = 5, // node radius, in pixels
  nodeGroups?: number[], // an array of ordinal values representing the node groups
  nodeTitle: any = null, // given d in nodes, a title string
  nodeFill = 'currentColor', // node stroke fill (if not using a group color encoding)
  nodeStroke = '#fff', // node stroke color
  nodeStrokeWidth = 1.5, // node stroke width, in pixels
  nodeStrokeOpacity = 1, // node stroke opacity
  nodeStrength?: number,
  linkSource = (d: any) => d.source, // given d in links, returns a node identifier string
  linkTarget = (d: any) => d.target, // given d in links, returns a node identifier string
  linkStroke = '#999', // link stroke color
  linkStrokeOpacity = 0.6, // link stroke opacity
  linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
  linkStrokeLinecap = 'round', // link stroke linecap
  linkStrength?: number,
  width = 400, // outer width, in pixels
  height = 400 // outer height, in pixels
): SVGElement | null {
  // Compute values.
  const N = d3.map(nodes, nodeId).map(intern);
  const LS = d3.map(links, linkSource).map(intern);
  const LT = d3.map(links, linkTarget).map(intern);
  if (nodeTitle === undefined) {
    nodeTitle = (d: any, i: number) => N[i];
  }
  const T: string[] | null =
    nodeTitle === null ? null : d3.map(nodes, nodeTitle);
  const G: number[] | null =
    nodeGroup === null ? null : d3.map(nodes, nodeGroup).map(intern);
  const W: number[] | null =
    typeof linkStrokeWidth !== 'function'
      ? null
      : d3.map(links, linkStrokeWidth);
  const L: string[] | null =
    typeof linkStroke !== 'function' ? null : d3.map(links, linkStroke);

  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (d: any, i: number) => ({ id: N[i] }));
  links = d3.map(links, (d: any, i: number) => ({
    source: LS[i],
    target: LT[i]
  }));

  // Compute default domains.
  if (G && nodeGroups === undefined) {
    nodeGroups = d3.sort(G);
  }

  // Construct the scales.
  const color = nodeGroups ? d3.scaleOrdinal(nodeGroups, colors) : null;

  // Construct the forces.
  const forceNode = d3.forceManyBody();
  const forceLink = d3.forceLink(links).id((d: any) => N[d.index]);
  if (nodeStrength !== undefined) {
    forceNode.strength(nodeStrength);
  }
  if (linkStrength !== undefined) {
    forceLink.strength(linkStrength);
  }

  const simulation = d3
    .forceSimulation(nodes)
    .force('link', forceLink)
    .force('charge', forceNode)
    .force('center', d3.forceCenter())
    .on('tick', ticked);

  const style = [
    'max-width: 100%;',
    'height: auto;',
    'position: absolute;',
    'top: 50%;',
    'transform: translateY(-50%);'
  ];

  const svg = d3
    .create('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [-width / 2, -height / 2, width, height])
    .attr('style', style.join(' '));

  const link = svg
    .append('g')
    .attr('stroke', typeof linkStroke !== 'function' ? linkStroke : null)
    .attr('stroke-opacity', linkStrokeOpacity)
    .attr(
      'stroke-width',
      typeof linkStrokeWidth !== 'function' ? linkStrokeWidth : null
    )
    .attr('stroke-linecap', linkStrokeLinecap)
    .selectAll('line')
    .data(links)
    .join('line');

  const node = svg
    .append('g')
    .attr('fill', nodeFill)
    .attr('stroke', nodeStroke)
    .attr('stroke-opacity', nodeStrokeOpacity)
    .attr('stroke-width', nodeStrokeWidth)
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', nodeRadius)
    .call(drag(simulation));

  if (W) {
    link.attr('stroke-width', (d: any): number => W[d.index]);
  }
  if (L) {
    link.attr('stroke', (d: any): string => L[d.index]);
  }
  if (G && color) {
    node.attr('fill', (d: any): string => color(G[d.index]));
  }
  if (T) {
    node.append('title').text((d: any): string => T[d.index]);
  }

  function intern(value: any) {
    return value !== null && typeof value === 'object'
      ? value.valueOf()
      : value;
  }

  function ticked(): void {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);

    node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
  }

  function drag(simulation: any) {
    function dragstarted(event: any): void {
      if (!event.active) {
        simulation.alphaTarget(0.3).restart();
      }
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any): void {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any): void {
      if (!event.active) {
        simulation.alphaTarget(0);
      }
      event.subject.fx = null;
      event.subject.fy = null;
    }

    const fn = d3
      .drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
    return (elem: any, ...args: any) => fn(elem);
  }

  return Object.assign(svg.node(), { scales: { color } });
}

// vim: set ft=typescript:
