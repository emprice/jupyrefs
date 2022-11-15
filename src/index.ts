// Entry point for the JupyterLab server and main container.

// Common functions for building names and CSS ids/classes
import { extName, makeName, makeId, makeClass } from './common';
// Filesystem interface
import { JupyrefsDrive } from './drive';
// Custom extension sidebar
import { JupyrefsSidebar } from './sidebar';
// PDF viewer (replaces the built-in one for the extension)
import { JupyrefsPDFViewer } from './pdfviewer';

// JupyterLab components and interfaces
import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  MainAreaWidget,
  WidgetTracker,
  IThemeManager,
  Dialog,
  showDialog
} from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { IStateDB } from '@jupyterlab/statedb';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { LabIcon, closeIcon } from '@jupyterlab/ui-components';
import { FileDialog } from '@jupyterlab/filebrowser';

// Lumino components and interfaces
import { h, VirtualElement } from '@lumino/virtualdom';
import { Widget, TabPanel, TabBar } from '@lumino/widgets';
import { Signal } from '@lumino/signaling';
import { Message } from '@lumino/messaging';
import { ReadonlyPartialJSONArray, ReadonlyPartialJSONObject } from '@lumino/coreutils';

// Load SVG images as source assets (configured in webpack)
import extIconStr from '!./assets/icon_primary.svg';
import pdfIconStr from '!./assets/icon_document_pdf.svg';

// Overall extension icon
const extIcon = new LabIcon({
  name: makeName('mainicon'),
  svgstr: extIconStr
});

// Better PDF icon
const pdfIcon = new LabIcon({
  name: makeName('pdficon'),
  svgstr: pdfIconStr
});

class JupyrefsClosableTabRenderer extends TabBar.Renderer {
  public renderCloseIcon(data: TabBar.IRenderData<any>): VirtualElement {
    const classes = [
      'lm-TabBar-tabCloseIcon',
      'p-TabBar-tabCloseIcon',
      'jp-icon-hover',
      makeClass('manager', 'tabpanel', 'closeicon')
    ];
    return h.div(
      {
        className: classes.join(' ')
      },
      closeIcon
    );
  }
}

interface IJupyrefsTrackable {
  uid: string;
  asJSON(): ReadonlyPartialJSONArray;
}

interface IJupyrefsManagerOptions {
  statedb: IStateDB;
  docmgr: IDocumentManager;
  mimereg: IRenderMimeRegistry;
  thememgr: IThemeManager;
}

interface IJupyrefsUpdateStateDb {
  openDocs?: boolean;
}

class JupyrefsDocumentTracker
  extends Map<string, Widget>
  implements IJupyrefsTrackable
{
  constructor(thisid: string) {
    super();
    this.uid = thisid;
  }

  asJSON(): ReadonlyPartialJSONArray {
    return Array.from(this.keys());
  }

  uid: string;
}

class JupyrefsManager extends TabPanel {
  constructor(options: IJupyrefsManagerOptions) {
    // Set up parent with movable, closable sub-tabs
    const renderer = new JupyrefsClosableTabRenderer();
    super({
      renderer: renderer,
      tabsMovable: true
    });

    // Save the input JupyterLab resources for later use
    this._statedb = options.statedb;
    this._docmgr = options.docmgr;
    this._mimereg = options.mimereg;
    this._thememgr = options.thememgr;

    // Set up to track open documents
    this._openDocs = new JupyrefsDocumentTracker(JupyrefsManager.idOpenDocs);

    this.addClass(makeClass('manager'));

    // XXX: This is a hack so the constructor can be asynchronous
    return (async () => {
      // Get the list of previously-opened docs, if possible
      const docs = (await this._statedb.fetch(
        JupyrefsManager.idOpenDocs
      )) as string[];
      if (docs) {
        // Re-open each of the previous docs
        docs.forEach(async (item: string) => {
          await this.openDocument(item);
        });
      }
      return this;
    })() as unknown as JupyrefsManager;
  }

  async openDocument(path: string): Promise<void> {
    if (this._openDocs.has(path) === true) {
      // Document is already open; switch focus to its tab
      this.currentWidget = this._openDocs.get(path) || null;
    } else {
      // Fetch the document data
      const model = await this._docmgr.services.contents.get(path, {
        content: true,
        format: 'base64'
      });

      // Render the document
      const renderer = this._mimereg.createRenderer(model.mimetype);
      const mimemodel = this._mimereg.createModel({ data: { ...model } });
      await renderer.renderModel(mimemodel);

      // Finishing touches on the document tab
      renderer.title.label = model.name;
      renderer.title.icon = pdfIcon;
      renderer.title.closable = true;

      // Determine if the current theme is light or dark
      const current = this._thememgr.theme || '';
      (renderer as JupyrefsPDFViewer).lightTheme =
        this._thememgr.isLight(current);

      // Add the rendered document tab to the container
      this.addWidget(renderer);
      this.currentWidget = renderer;

      // Attach a handler for theme changes
      this._thememgr.themeChanged.connect((mgr, args) => {
        const current = mgr.theme;
        if (current) {
          (renderer as JupyrefsPDFViewer).lightTheme = mgr.isLight(current);
        }
      });

      // Attach a handler for tab closing
      (renderer as JupyrefsPDFViewer).closed.connect(async widget => {
        const path = widget.filePath;
        if (path) {
          this._openDocs.delete(path);
          await this.updateStateDb({ openDocs: true });
        }
      });

      this._openDocs.set(path, renderer);
      await this.updateStateDb({ openDocs: true });
    }
  }

  protected async updateStateDb(
    options: IJupyrefsUpdateStateDb
  ): Promise<void> {
    if (options.openDocs) {
      await this._statedb.save(this._openDocs.uid, this._openDocs.asJSON());
    }
  }

  private _statedb!: IStateDB;
  private _docmgr!: IDocumentManager;
  private _mimereg!: IRenderMimeRegistry;
  private _thememgr!: IThemeManager;

  static idOpenDocs = makeName('openDocuments');
  private _openDocs: JupyrefsDocumentTracker;
}

class JupyrefsMain extends MainAreaWidget<JupyrefsManager> {
  constructor(options: MainAreaWidget.IOptions<JupyrefsManager>) {
    super(options);
    this._closed = new Signal<Widget, void>(this);
  }

  public get closed(): Signal<Widget, void> {
    return this._closed;
  }

  protected async onCloseRequest(msg: Message): Promise<void> {
    const result = await showDialog({
      buttons: [
        Dialog.cancelButton({ accept: false }),
        Dialog.okButton({ accept: true })
      ],
      body: 'Are you sure you want to close Jupyrefs?',
      defaultButton: 0,
      hasClose: false
    });

    if (result.button.accept) {
      await this._closed.emit();
      await super.onCloseRequest(msg);
    }
  }

  private _closed: Signal<Widget, void>;
}

class JupyrefsData {
  constructor(statedb: IStateDB) {
    this._key = makeName('key');
    this._statedb = statedb;
    this._active = false;
    this._localPath = '';
    this._ready = this.ready();
  }

  public async getActive(): Promise<boolean> {
    await this._ready;
    return this._active;
  }

  public async setActive(val: boolean) {
    await this._ready;
    this._active = val;
    await this._statedb.save(this._key, this.asJSON());
  }

  public async getLocalPath(): Promise<string> {
    await this._ready;
    return this._localPath;
  }

  public async setLocalPath(val: string) {
    await this._ready;
    this._localPath = val;
    await this._statedb.save(this._key, this.asJSON());
  }

  protected async ready(): Promise<void> {
    const result = await this._statedb.fetch(this._key);
    const options = (result as ReadonlyPartialJSONObject) || {};

    this._active = (options.active as boolean) || false;
    this._localPath = (options.localPath as string) || '';
  }

  protected asJSON(): ReadonlyPartialJSONObject {
    return {
      active: this._active,
      localPath: this._localPath
    };
  }

  private _key: string;
  private _statedb: IStateDB;

  private _active: boolean;
  private _localPath: string;

  private _ready: Promise<void>;
}

async function commonStart(options: any): Promise<void> {
  const data = await new JupyrefsData(options.statedb);

  console.log('in commonstart');
  console.log(data);

  const driveName = `${extName}drive`;
  const drive = new JupyrefsDrive({
    name: driveName,
    basePath: await data.getLocalPath()
  });

  options.docmgr.services.contents.addDrive(drive);

  const factory = {
    safe: false,
    mimeTypes: [JupyrefsPDFViewer.mimeType],
    defaultRank: 100,
    createRenderer: (dummy: any) => new JupyrefsPDFViewer()
  };

  options.mimereg.addFactory(factory);

  const content = await new JupyrefsManager(options);
  var main = new JupyrefsMain({ content: content });

  main.id = makeId('main');
  main.title.label = 'Reference Manager';
  main.title.icon = extIcon;
  main.title.closable = true;

  var sidebar = await new JupyrefsSidebar({
    driveName: drive.name,
    tabsMovable: false,
    documentManager: options.docmgr
  });

  sidebar.id = makeId('sidebar');
  sidebar.title.icon = extIcon;

  sidebar.browser.fileOpened.connect(async (sender, args) => {
    await main.content.openDocument(args);
  });

  // Define the cleanup for the main widget
  main.disposed.connect(async (sender, args) => {
    sidebar.dispose();
    console.log('in disposed');
    console.log(data);
  });

  main.closed.connect(async (sender, args) => {
    console.log('in closed');
    console.log(data);
    await data.setActive(false);
  });

  options.app.shell.add(main, 'main');
  options.app.shell.add(sidebar, 'left');

  main.content.update();
  sidebar.update();

  // All done -- activate!
  options.app.shell.activateById(main.id);
  options.app.shell.activateById(sidebar.id);

  await data.setActive(true);
}

async function coldStart(options: any): Promise<void> {
  const dialog = await FileDialog.getExistingDirectory({ manager: options.docmgr });
  if (!dialog.value || !dialog.value[0] || !dialog.value[0].path) {
    return;
  }

  const contents = options.docmgr.services.contents;
  const localPath = contents.localPath(dialog.value[0].path);
  if (!localPath) return;

  const data = await new JupyrefsData(options.statedb);
  await data.setLocalPath(localPath);

  console.log('in coldstart');
  console.log(data);

  await commonStart(options);
}

async function warmStart(options: any): Promise<void> {
  const data = await new JupyrefsData(options.statedb);

  console.log('in warmstart');
  console.log(data);

  if (await data.getActive()) await commonStart(options);
}

async function activate(
  app: JupyterFrontEnd,
  launcher: ILauncher,
  restorer: ILayoutRestorer,
  statedb: IStateDB,
  docmgr: IDocumentManager,
  mimereg: IRenderMimeRegistry,
  thememgr: IThemeManager
): Promise<void> {
  console.log('in activate');

  const options = {
    app,
    statedb,
    docmgr,
    mimereg,
    thememgr
  };

  const coldStartCmd = makeName('coldstart');
  app.commands.addCommand(coldStartCmd, {
    label: 'Start Reference Manager',
    icon: extIcon,
    execute: async (dummy: any) => coldStart(options)
  });

  const warmStartCmd = makeName('warmstart');
  app.commands.addCommand(warmStartCmd, {
    execute: async (dummy: any) => warmStart(options)
  });

  // Add the command to the launcher
  launcher.add({
    command: coldStartCmd,
    category: 'Reference Manager',
    rank: 0
  });

  warmStart(options);
}

// Defines the plugin for this module and its load prerequisites
const plugin: JupyterFrontEndPlugin<void> = {
  id: makeName('plugin'),
  autoStart: true,
  requires: [
    ILauncher,
    ILayoutRestorer,
    IStateDB,
    IDocumentManager,
    IRenderMimeRegistry,
    IThemeManager
  ],
  activate: activate
};

export default plugin;

// vim: set ft=typescript:
