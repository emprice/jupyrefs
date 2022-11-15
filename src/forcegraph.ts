import * as d3 from 'd3';

interface IOptions {
  nodeId: (d: any) => string; // given d in nodes, returns a unique identifier (string)
  nodeGroup?: (d: any) => number; // given d in nodes, returns an (ordinal) value for color
  colors: readonly string[]; // an array of color strings, for the node groups
  nodeRadius: number; // node radius, in pixels
  nodeGroups?: number[]; // an array of ordinal values representing the node groups
  nodeTitle?: (d: any) => string; // given d in nodes, a title string
  nodeFill: string; // node stroke fill (if not using a group color encoding)
  nodeStroke: string; // node stroke color
  nodeStrokeWidth: number; // node stroke width, in pixels
  nodeStrokeOpacity: number; // node stroke opacity
  nodeStrength?: number; // node strength
  linkSource: (d: any) => string; // given d in links, returns a node identifier string
  linkTarget: (d: any) => string; // given d in links, returns a node identifier string
  linkStroke: string | ((d: any) => string); // link stroke color
  linkStrokeOpacity: number; // link stroke opacity
  linkStrokeWidth: number | ((d: any) => number); // given d in links, returns a stroke width in pixels
  linkStrokeLinecap: string; // link stroke linecap
  linkStrength?: number; // link strength
  width: number; // outer width, in pixels
  height: number; // outer height, in pixels
}

function defaultOptions(): IOptions {
  return {
    nodeId: (d: any) => d.id,
    colors: d3.schemeTableau10,
    nodeRadius: 5,
    nodeFill: 'currentColor',
    nodeStroke: '#fff',
    nodeStrokeWidth: 1.5,
    nodeStrokeOpacity: 1,
    linkSource: (d: any) => d.source,
    linkTarget: (d: any) => d.target,
    linkStroke: '#999',
    linkStrokeOpacity: 0.6,
    linkStrokeWidth: 1.5,
    linkStrokeLinecap: 'round',
    width: 400,
    height: 400
  };
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
// (minor modifications made by @emprice)
export function makeForceGraph(
  nodes: any[], // an iterable of node objects (typically [{id}, …])
  links: any[], // an iterable of link objects (typically [{source, target}, …])
  useropts: Partial<IOptions>
): SVGElement | null {
  const options = { ...defaultOptions(), ...useropts };

  // Compute values.
  const N = d3.map(nodes, options.nodeId).map(intern);
  const LS = d3.map(links, options.linkSource).map(intern);
  const LT = d3.map(links, options.linkTarget).map(intern);

  if (options.nodeTitle === undefined) {
    options.nodeTitle = (d: any) => intern(options.nodeId(d));
  }

  const T: string[] | null =
    options.nodeTitle === undefined ? null : d3.map(nodes, options.nodeTitle);
  const G: number[] | null =
    options.nodeGroup === undefined
      ? null
      : d3.map(nodes, options.nodeGroup).map(intern);
  const W: number[] | null =
    typeof options.linkStrokeWidth !== 'function'
      ? null
      : d3.map(links, options.linkStrokeWidth);
  const L: string[] | null =
    typeof options.linkStroke !== 'function'
      ? null
      : d3.map(links, options.linkStroke);

  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (d: any, i: number) => ({ id: N[i] }));
  links = d3.map(links, (d: any, i: number) => ({
    source: LS[i],
    target: LT[i]
  }));

  // Compute default domains.
  if (G && options.nodeGroups === undefined) {
    options.nodeGroups = d3.sort(G);
  }

  // Construct the scales.
  const color = options.nodeGroups
    ? d3.scaleOrdinal(options.nodeGroups, options.colors)
    : null;

  // Construct the forces.
  const forceNode = d3.forceManyBody();
  const forceLink = d3.forceLink(links).id((d: any) => N[d.index]);
  if (options.nodeStrength !== undefined) {
    forceNode.strength(options.nodeStrength);
  }
  if (options.linkStrength !== undefined) {
    forceLink.strength(options.linkStrength);
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
    .attr('viewBox', [
      -options.width / 2,
      -options.height / 2,
      options.width,
      options.height
    ])
    .attr('style', style.join(' '));

  const link = svg
    .append('g')
    .attr(
      'stroke',
      typeof options.linkStroke !== 'function' ? options.linkStroke : null
    )
    .attr('stroke-opacity', options.linkStrokeOpacity)
    .attr(
      'stroke-width',
      typeof options.linkStrokeWidth !== 'function'
        ? options.linkStrokeWidth
        : null
    )
    .attr('stroke-linecap', options.linkStrokeLinecap)
    .selectAll('line')
    .data(links)
    .join('line');

  const node = svg
    .append('g')
    .attr('fill', options.nodeFill)
    .attr('stroke', options.nodeStroke)
    .attr('stroke-opacity', options.nodeStrokeOpacity)
    .attr('stroke-width', options.nodeStrokeWidth)
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', options.nodeRadius)
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

  return Object.assign(Object.assign({}, svg.node()), { scales: { color } });
}

// vim: set ft=typescript:
