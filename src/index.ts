import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { IFileBrowserFactory, FileBrowser } from '@jupyterlab/filebrowser';
import { LabIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';

import * as d3 from 'd3';

import jupyrefsIconStr from './assets/iconmod.svg';

const jupyrefsIcon = new LabIcon({
  name: 'jupyrefs:icon',
  svgstr: jupyrefsIconStr
});

/**
 * Create the main content widget
 */
function createMainWidget(app: JupyterFrontEnd): Widget {
  const content = new Widget();
  const widget = new MainAreaWidget({ content });
  widget.id = 'jupyrefs:main';
  widget.title.label = 'Reference Manager';
  widget.title.closable = true;

  if (!widget.isAttached) {
    app.shell.add(widget, 'main');
  }

  return content;
}

/**
 * Create the file browser widget
 */
function createFileBrowserWidget(
  app: JupyterFrontEnd,
  factory: IFileBrowserFactory
): FileBrowser {
  const widget = factory.createFileBrowser('jupyrefs:browse');
  widget.title.icon = jupyrefsIcon;

  if (!widget.isAttached) {
    app.shell.add(widget, 'left');
  }

  return widget;
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
function ForceGraph(
  nodes: any[], // an iterable of node objects (typically [{id}, …])
  links: any[], // an iterable of link objects (typically [{source, target}, …])
  nodeId = (d: any) => d.id, // given d in nodes, returns a unique identifier (string)
  nodeGroup: any = null, // given d in nodes, returns an (ordinal) value for color
  nodeGroups?: number[], // an array of ordinal values representing the node groups
  nodeTitle: any = null, // given d in nodes, a title string
  nodeFill = 'currentColor', // node stroke fill (if not using a group color encoding)
  nodeStroke = '#fff', // node stroke color
  nodeStrokeWidth = 1.5, // node stroke width, in pixels
  nodeStrokeOpacity = 1, // node stroke opacity
  nodeRadius = 5, // node radius, in pixels
  nodeStrength?: number,
  linkSource = (d: any) => d.source, // given d in links, returns a node identifier string
  linkTarget = (d: any) => d.target, // given d in links, returns a node identifier string
  linkStroke = '#999', // link stroke color
  linkStrokeOpacity = 0.6, // link stroke opacity
  linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
  linkStrokeLinecap = 'round', // link stroke linecap
  linkStrength?: number,
  colors: string[] = d3.schemeTableau10, // an array of color strings, for the node groups
  width = 640, // outer width, in pixels
  height = 400 // outer height, in pixels
) {
  // Compute values.
  const N = d3.map(nodes, nodeId).map(intern);
  const LS = d3.map(links, linkSource).map(intern);
  const LT = d3.map(links, linkTarget).map(intern);
  if (nodeTitle === undefined) {
    nodeTitle = (d: any, i: number) => N[i];
  }
  const T = nodeTitle === null ? null : d3.map(nodes, nodeTitle);
  const G = nodeGroup === null ? null : d3.map(nodes, nodeGroup).map(intern);
  const W =
    typeof linkStrokeWidth !== 'function'
      ? null
      : d3.map(links, linkStrokeWidth);
  const L = typeof linkStroke !== 'function' ? null : d3.map(links, linkStroke);

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
  const color = nodeGroup === null ? null : d3.scaleOrdinal(nodeGroups, colors);

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

  const svg = d3
    .create('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [-width / 2, -height / 2, width, height])
    .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

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
    link.attr('stroke-width', (d: any) => W[d.index]);
  }
  if (L) {
    link.attr('stroke', (d: any) => L[d.index]);
  }
  if (G) {
    node.attr('fill', (d: any) => color(G[d.index]));
  }
  if (T) {
    node.append('title').text((d: any) => T[d.index]);
  }

  function intern(value: any) {
    return value !== null && typeof value === 'object'
      ? value.valueOf()
      : value;
  }

  function ticked() {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);

    node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
  }

  function drag(simulation: any) {
    function dragstarted(event: any) {
      if (!event.active) {
        simulation.alphaTarget(0.3).restart();
      }
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) {
        simulation.alphaTarget(0);
      }
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3
      .drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  return Object.assign(svg.node(), { scales: { color } });
}

async function buildReferences(doi: string, level: number, maxLevel: number) {
  const allnodes = new Set<string>([doi]);
  const alllinks = new Set<string[]>();

  if (level < maxLevel) {
    const url = `https://opencitations.net/index/coci/api/v1/references/${doi}?format=json`;
    const response = await fetch(url);
    const data = await response.json();
    data.forEach(async (d: any) => {
      const refs = await buildReferences(d.cited, level + 1, maxLevel);
      refs.nodes.forEach((item: string) => {
        allnodes.add(item);
        alllinks.add([doi, item]);
      });
      refs.links.forEach((item: string[]) => alllinks.add(item));
    });
  }

  return { nodes: allnodes, links: alllinks };
}

async function buildCitations(doi: string, level: number, maxLevel: number) {
  const allnodes = new Set<string>([doi]);
  const alllinks = new Set<string[]>();

  if (level < maxLevel) {
    const url = `https://opencitations.net/index/coci/api/v1/citations/${doi}?format=json`;
    const response = await fetch(url);
    const data = await response.json();
    data.forEach(async (d: any) => {
      const refs = await buildCitations(d.citing, level + 1, maxLevel);
      refs.nodes.forEach((item: string) => {
        allnodes.add(item);
        alllinks.add([doi, item]);
      });
      refs.links.forEach((item: string[]) => alllinks.add(item));
    });
  }

  return { nodes: allnodes, links: alllinks };
}

/**
 * Put something cool in the main widget
 */
async function awesomePlot(main: Widget) {
  const doi = '10.1088/0004-637X/744/2/162';
  const refs: { nodes: Set<string>; links: Set<string[]> } =
    await buildReferences(doi, 0, 1);
  const cits: { nodes: Set<string>; links: Set<string[]> } =
    await buildCitations(doi, 0, 1);

  const nodes = new Set<string>();
  refs.nodes.forEach((item: string) => nodes.add(item));
  cits.nodes.forEach((item: string) => nodes.add(item));

  const links = new Set<string[]>();
  refs.links.forEach((item: string[]) => links.add(item));
  cits.links.forEach((item: string[]) => links.add(item));

  const n = Array<{ id: string }>();
  const l = Array<{ source: string; target: string }>();

  nodes.forEach(async (item: string) => {
    const doi: string = item.toUpperCase();
    n.push({ id: doi });
  });
  links.forEach((item: string[]) => {
    const doi1: string = item[0].toUpperCase();
    const doi2: string = item[1].toUpperCase();
    l.push({ source: doi1, target: doi2 });
  });

  const chart = ForceGraph(n, l);
  main.node.appendChild(chart);
}

/**
 * Initialization data for the jupyrefs extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyrefs:plugin',
  autoStart: true,
  requires: [ILauncher, IFileBrowserFactory],
  activate: async (
    app: JupyterFrontEnd,
    launcher: ILauncher,
    factory: IFileBrowserFactory
  ) => {
    // Add the command to the app
    const command = 'jupyrefs:open';
    app.commands.addCommand(command, {
      label: 'Start Reference Manager',
      icon: jupyrefsIcon,
      execute: () => {
        const browser = createFileBrowserWidget(app, factory);
        const main = createMainWidget(app);

        awesomePlot(main);

        // Define the cleanup for the main widget
        main.disposed.connect((sender, args) => {
          browser.dispose();
        });

        // All done -- activate!
        app.shell.activateById(main.id);
        app.shell.activateById(browser.id);
      }
    });

    // Add the command to the launcher
    launcher.add({
      command: command,
      category: 'Reference Manager',
      rank: 0
    });
  }
};

export default plugin;

// vim: set ft=typescript:
