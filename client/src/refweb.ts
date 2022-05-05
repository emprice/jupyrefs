import { makeForceGraph } from './forcegraph';

import { Widget } from '@lumino/widgets';
import { Signal } from '@lumino/signaling';

const colors: string[] = [
  '#bf616a',
  '#8fbcbb',
  '#d08770',
  '#88c0d0',
  '#ebcb8b',
  '#81a1c1',
  '#a3be8c',
  '#5e81ac',
  '#b48ead'
];

export class JupyrefsReferenceWeb extends Widget {
  constructor() {
    super();

    this._ready = new Signal<JupyrefsReferenceWeb, void>(this);

    const options = {
      nodeId: (d: any) => d.id,
      nodeGroup: (d: any) => d.group,
      colors: colors
    };

    this.buildNodesAndLinks().then(obj => {
      const graph = makeForceGraph(obj.nodes, obj.links, options);
      if (graph) {
        this.node.appendChild(graph);
        this._ready.emit();
      }
    });
  }

  public get ready(): Signal<JupyrefsReferenceWeb, void> {
    return this._ready;
  }

  protected async buildNodesAndLinks(): Promise<{ nodes: Array<any>, links: Array<any> }> {
    const doi = '10.1088/0004-637X/744/2/162';
    const refs: { nodes: Set<string>; links: Set<string[]> } =
      await this.buildReferences(doi, 0, 1);
    const cits: { nodes: Set<string>; links: Set<string[]> } =
      await this.buildCitations(doi, 0, 1);

    const nodes = new Set<string>();
    refs.nodes.forEach((item: string) => nodes.add(item));
    cits.nodes.forEach((item: string) => nodes.add(item));

    const links = new Set<string[]>();
    refs.links.forEach((item: string[]) => links.add(item));
    cits.links.forEach((item: string[]) => links.add(item));

    const n = Array<{ id: string; group: string }>();
    const l = Array<{ source: string; target: string }>();

    nodes.forEach(async (item: string) => {
      const doi: string = item.toUpperCase();
      const grp: string = doi.split('/')[0];
      n.push({ id: doi, group: grp });
    });

    links.forEach((item: string[]) => {
      const doi1: string = item[0].toUpperCase();
      const doi2: string = item[1].toUpperCase();
      l.push({ source: doi1, target: doi2 });
    });

    return {
      nodes: n,
      links: l
    };
  }

  protected async buildReferences(
    doi: string,
    level: number,
    maxLevel: number
  ) {
    const allnodes = new Set<string>([doi]);
    const alllinks = new Set<string[]>();

    if (level < maxLevel) {
      const url = `https://opencitations.net/index/coci/api/v1/references/${doi}?format=json`;
      const response = await fetch(url);
      const data = await response.json();
      data.forEach(async (d: any) => {
        const refs = await this.buildReferences(d.cited, level + 1, maxLevel);
        refs.nodes.forEach((item: string) => {
          allnodes.add(item);
          alllinks.add([doi, item]);
        });
        refs.links.forEach((item: string[]) => alllinks.add(item));
      });
    }

    return { nodes: allnodes, links: alllinks };
  }

  protected async buildCitations(doi: string, level: number, maxLevel: number) {
    const allnodes = new Set<string>([doi]);
    const alllinks = new Set<string[]>();

    if (level < maxLevel) {
      const url = `https://opencitations.net/index/coci/api/v1/citations/${doi}?format=json`;
      const response = await fetch(url);
      const data = await response.json();
      data.forEach(async (d: any) => {
        const refs = await this.buildCitations(d.citing, level + 1, maxLevel);
        refs.nodes.forEach((item: string) => {
          allnodes.add(item);
          alllinks.add([doi, item]);
        });
        refs.links.forEach((item: string[]) => alllinks.add(item));
      });
    }

    return { nodes: allnodes, links: alllinks };
  }

  protected _ready: Signal<JupyrefsReferenceWeb, void>;
}

// vim: set ft=typescript:
