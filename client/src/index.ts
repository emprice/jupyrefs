import config from '../../jupyrefs.config.js';

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';
import { URLExt } from '@jupyterlab/coreutils';
import { ILauncher } from '@jupyterlab/launcher';
import { IStateDB } from '@jupyterlab/statedb';
import { ServerConnection, Contents } from '@jupyterlab/services';
import { ModelDB } from '@jupyterlab/observables';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IRenderMimeRegistry, IRenderMime } from '@jupyterlab/rendermime';
import {
  FileBrowser,
  FilterFileBrowserModel,
  DirListing
} from '@jupyterlab/filebrowser';
import { LabIcon } from '@jupyterlab/ui-components';

import { Widget, SingletonLayout } from '@lumino/widgets';
import { Signal } from '@lumino/signaling';
import { Message } from '@lumino/messaging';
import {
  ReadonlyPartialJSONArray,
  ReadonlyPartialJSONValue
} from '@lumino/coreutils';

import * as pdfjsLib from 'pdfjs-dist';
import { PDFViewer } from 'pdfjs-dist/lib/web/pdf_viewer.js';
import { EventBus } from 'pdfjs-dist/lib/web/event_utils.js';
import { PDFLinkService } from 'pdfjs-dist/lib/web/pdf_link_service.js';
import { NullL10n } from 'pdfjs-dist/lib/web/l10n_utils.js';
import workerSrc from 'pdfjs-dist/build/pdf.worker.js';
//import { AnnotationFactory } from 'annotpdf';

import extIconStr from '!./assets/iconmod.svg';
import { ForceGraph } from './plots.js';

type FileBrowserOptions = FileBrowser.IOptions;
type DirListingOptions = DirListing.IOptions;
type ModelFactory = ModelDB.IFactory;
type ServerSettings = ServerConnection.ISettings;
type ContentsModel = Contents.IModel;
type CreateOptions = Contents.ICreateOptions;
type FetchOptions = Contents.IFetchOptions;
type CheckpointModel = Contents.ICheckpointModel;
type FileChangedArgs = Contents.IChangedArgs;

type Renderer = IRenderMime.IRenderer;
type MimeModel = IRenderMime.IMimeModel;

const extName = 'jupyrefs';
const extIcon = new LabIcon({
  name: `${extName}:icon`,
  svgstr: extIconStr
});

class JupyrefsRenderedPDF extends Widget implements Renderer {
  constructor() {
    super();

    this.node.style.height = 'inherit';

    this.containerElem = document.createElement('div');
    this.containerElem.style.overflow = 'auto';
    this.containerElem.style.position = 'relative';
    this.containerElem.style.height = 'inherit';

    this.viewerElem = document.createElement('div');
    this.viewerElem.classList.add('pdfViewer');
    this.viewerElem.style.position = 'absolute';

    this.containerElem.appendChild(this.viewerElem);
    this.node.appendChild(this.containerElem);

    this.eventBus = new EventBus();
    this.linkService = new PDFLinkService({
      eventBus: this.eventBus
    });

    this.viewer = new PDFViewer({
      container: this.containerElem,
      viewer: this.viewerElem,
      eventBus: this.eventBus,
      linkService: this.linkService,
      l10n: NullL10n,
      renderer: 'canvas'
    });

    this.linkService.setViewer(this.viewer);
    this.eventBus.on('pagesinit', () => {
      this.viewer.currentScaleValue = 'page-width';
    });
  }

  async renderModel(model: MimeModel): Promise<void> {
    const data = model.data;

    if (data && data.path && typeof data.path === 'string') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

      const url = URLExt.join('/tree', data.path);
      const loadingTask = pdfjsLib.getDocument({
        url: url,
        enableXfa: true
      });

      const pdfDocument = await loadingTask.promise;
      this.viewer.setDocument(pdfDocument);
      this.linkService.setDocument(pdfDocument, null);
    }
  }

  protected onResize(msg: Widget.ResizeMessage): void {
    this.viewer.currentScaleValue = 'page-width';
  }

  static mimeType = 'application/pdf';

  protected viewer;
  protected eventBus;
  protected linkService;
  protected viewerElem: HTMLDivElement;
  protected containerElem: HTMLDivElement;
}

class JupyrefsManager extends Widget {
  constructor(mimereg: IRenderMimeRegistry, options: any) {
    super();

    /*this.makeForceGraph().then(chart => {
      this.node.appendChild(chart);
    });*/
    this._mimereg = mimereg;
    this._documents = new Array<ContentsModel>();
    this.layout = new SingletonLayout({ fitPolicy: 'set-no-constraint' });

    if (options && options.openDocuments && this._mimereg) {
      options.openDocuments.forEach((item: any) => {
        this.addDocument(item.args);
      });
    }
  }

  async addDocument(args: ContentsModel): Promise<void> {
    const renderer = this._mimereg.createRenderer(args.mimetype);
    const model = this._mimereg.createModel({ data: { ...args } });

    await renderer.renderModel(model);
    (this.layout as SingletonLayout).widget = renderer;
    this._documents.push(args);
  }

  public get documents(): ReadonlyPartialJSONArray {
    const ret = new Array<ReadonlyPartialJSONValue>();
    this._documents.forEach(item => {
      ret.push({ args: { ...item } });
    });
    return ret;
  }

  private _mimereg: IRenderMimeRegistry;
  private _documents: Array<ContentsModel>;

  protected async makeForceGraph() {
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
    return ForceGraph(
      n,
      l,
      (d: any) => d.id,
      (d: any) => d.group,
      colors
    );
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
}

class JupyrefsMain extends MainAreaWidget<JupyrefsManager> {
  constructor(mimereg: IRenderMimeRegistry, options: any) {
    const content = new JupyrefsManager(mimereg, options);
    super({ content: content });
    this._closedSignal = new Signal<JupyrefsMain, Message>(this);
  }

  processMessage(msg: Message): void {
    if (msg.type === 'close-request') {
      this._closedSignal.emit(msg);
    }
    super.processMessage(msg);
  }

  public get closed(): Signal<JupyrefsMain, Message> {
    return this._closedSignal;
  }

  protected _closedSignal: Signal<JupyrefsMain, Message>;
}

class JupyrefsDirListing extends DirListing {
  constructor(options: DirListingOptions) {
    super(options);
    this._fileOpenedSignal = new Signal<JupyrefsDirListing, ContentsModel>(
      this
    );
  }

  public get fileOpened(): Signal<JupyrefsDirListing, ContentsModel> {
    return this._fileOpenedSignal;
  }

  protected handleOpen(item: ContentsModel): void {
    if (item.type === 'file') {
      this._fileOpenedSignal.emit(item);
    } else {
      super.handleOpen(item);
    }
  }

  protected _fileOpenedSignal: Signal<JupyrefsDirListing, ContentsModel>;
}

class JupyrefsBrowser extends FileBrowser {
  constructor(options: FileBrowserOptions) {
    super(options);
  }

  public get fileOpened(): Signal<JupyrefsDirListing, ContentsModel> {
    return (this.listing as JupyrefsDirListing).fileOpened;
  }

  protected createDirListing(options: DirListingOptions): DirListing {
    return new JupyrefsDirListing(options);
  }
}

class JupyrefsDrive implements Contents.IDrive {
  constructor(name: string, hostname: string) {
    this.fileChanged = new Signal<JupyrefsDrive, FileChangedArgs>(this);
    this.isDisposed = false;
    this.name = name;
    this.serverSettings = ServerConnection.makeSettings({
      baseUrl: `http://localhost:${config.listenPort}`
    });
    this._api = '/drive/api/contents';
  }

  public fileChanged: Signal<JupyrefsDrive, FileChangedArgs>;
  public readonly isDisposed: boolean;
  public readonly modelDBFactory?: ModelFactory;
  public readonly name: string;
  public readonly serverSettings: ServerSettings;

  private _api: string;

  protected makeUrl(...args: string[]): string {
    const parts = args.map(path => URLExt.encodeParts(path));
    const baseUrl: string = this.serverSettings.baseUrl;
    return URLExt.join(baseUrl, this._api, ...parts);
  }

  async copy(localPath: string, toLocalDir: string): Promise<ContentsModel> {
    throw new Error('not implemented');
  }

  async createCheckpoint(localPath: string): Promise<CheckpointModel> {
    throw new Error('not implemented');
  }

  async delete(localPath: string): Promise<void> {
    throw new Error('not implemented');
  }

  async deleteCheckpoint(localPath: string, checkpointId: string): Promise<void> {
    throw new Error('not implemented');
  }

  async dispose(): Promise<void> {
    throw new Error('not implemented');
  }

  async get(localPath: string, options?: FetchOptions): Promise<ContentsModel> {
    let url: string = this.makeUrl(localPath);

    if (options) {
      const content = options.content ? '1' : '0';
      const params = Object.assign(Object.assign({}, options), { content });
      url += URLExt.objectToQueryString(params);
    }

    const response = await ServerConnection.makeRequest(url, {}, this.serverSettings);
    if (response.status !== 200) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }

    const data = await response.json();
    Contents.validateContentsModel(data);
    return data;
  }

  async getDownloadUrl(localPath: string): Promise<string> {
    throw new Error('not implemented');
  }

  async listCheckpoints(localPath: string): Promise<CheckpointModel[]> {
    throw new Error('not implemented');
  }

  async newUntitled(options?: CreateOptions): Promise<ContentsModel> {
    throw new Error('not implemented');
  }

  async rename(oldLocalPath: string, newLocalPath: string): Promise<ContentsModel> {
    throw new Error('not implemented');
  }

  async restoreCheckpoint(localPath: string, checkpointId: string): Promise<void> {
    throw new Error('not implemented');
  }

  async save(localPath: string, options?: Partial<ContentsModel>): Promise<ContentsModel> {
    throw new Error('not implemented');
  }
}

async function activate(
  app: JupyterFrontEnd,
  launcher: ILauncher,
  restorer: ILayoutRestorer,
  statedb: IStateDB,
  docmgr: IDocumentManager,
  mimereg: IRenderMimeRegistry
): Promise<void> {
  const factory = {
    safe: false,
    mimeTypes: [JupyrefsRenderedPDF.mimeType],
    defaultRank: 100,
    createRenderer: (options: any) => new JupyrefsRenderedPDF()
  };

  mimereg.addFactory(factory);

  const drive = new JupyrefsDrive(`${extName}`,
    `http://localhost:${config.listenPort}/drive`);
  docmgr.services.contents.addDrive(drive);

  let main: JupyrefsMain;
  let browser: JupyrefsBrowser;

  const idOpenDocs = `${extName}:openDocuments`;

  // Add the command to the app
  const startCmd = `${extName}:start`;
  app.commands.addCommand(startCmd, {
    label: 'Start Reference Manager',
    icon: extIcon,
    execute: async (options: any) => {
      if (!main || main.isDisposed) {
        const docs = await statedb.fetch(idOpenDocs);
        main = new JupyrefsMain(mimereg, { openDocuments: docs });
        main.id = `${extName}:main`;
        main.title.label = 'Reference Manager';
        main.title.icon = extIcon;
        main.title.closable = true;
      }

      if (!browser || browser.isDisposed) {
        const model = new FilterFileBrowserModel({
          manager: docmgr,
          filter: value => value.mimetype === 'application/pdf',
          driveName: `${extName}`
        });

        browser = new JupyrefsBrowser({
          id: `${extName}:browser`,
          model: model
        });
        browser.title.icon = extIcon;
      }

      browser.fileOpened.connect(async (sender, args) => {
        await main.content.addDocument(args);
        await statedb.save(idOpenDocs, main.content.documents);
      });

      // Define the cleanup for the main widget
      main.disposed.connect((sender, args) => {
        browser.dispose();
      });

      main.closed.connect(async (sender, args) => {
        await statedb.remove(idOpenDocs);
      });

      if (!tracker.has(main)) {
        tracker.add(main);
      }

      if (!main.isAttached) {
        app.shell.add(main, 'main');
      }

      if (!browser.isAttached) {
        app.shell.add(browser, 'left');
      }

      main.content.update();
      browser.update();

      // All done -- activate!
      app.shell.activateById(main.id);
      app.shell.activateById(browser.id);
    }
  });

  // Add the command to the launcher
  launcher.add({
    command: startCmd,
    category: 'Reference Manager',
    rank: 0
  });

  const tracker = new WidgetTracker<JupyrefsMain>({
    namespace: `${extName}`
  });

  restorer.restore(tracker, {
    command: startCmd,
    name: () => `${extName}`
  });
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: `${extName}:plugin`,
  autoStart: true,
  requires: [
    ILauncher,
    ILayoutRestorer,
    IStateDB,
    IDocumentManager,
    IRenderMimeRegistry
  ],
  activate: activate
};

export default plugin;

// vim: set ft=typescript:
