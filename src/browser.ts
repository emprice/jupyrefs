import { makeClass } from './common';
import { IBrowserModel } from './interfaces';
import { JupyrefsDirListing } from './dirlisting';

import { Signal } from '@lumino/signaling';
import { Widget, Layout, PanelLayout } from '@lumino/widgets';
import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';
import {
  newFolderIcon,
  fileUploadIcon,
  refreshIcon
} from '@jupyterlab/ui-components';
import {
  ITranslator,
  TranslationBundle,
  nullTranslator
} from '@jupyterlab/translation';

const containerClass = 'filebrowser';

interface IOptions {
  id: string;
  model: IBrowserModel;
  translator?: ITranslator;
  fitPolicy: Layout.FitPolicy;
}

/**
 * A widget which hosts a file browser, based heavily on the default
 * implementation in JupyterLab, \@jupyterlab/filebrowser/browser.js
 */
export class JupyrefsBrowser extends Widget {
  constructor(options: IOptions) {
    super();

    this.id = options.id;
    this.model = options.model;
    this.translator = options.translator || nullTranslator;
    this.addClass(makeClass(containerClass));

    this._trans = this.translator.load('jupyterlab');

    const newFolder = new ToolbarButton({
      icon: newFolderIcon,
      onClick: () => this.createNewDirectory(),
      tooltip: this._trans.__('New Folder')
    });
    const uploadFile = new ToolbarButton({
      icon: fileUploadIcon,
      onClick: () => this.uploadFile(),
      tooltip: this._trans.__('Upload File')
    });
    const refresh = new ToolbarButton({
      icon: refreshIcon,
      onClick: () => this.listing.refresh(),
      tooltip: this._trans.__('Refresh File List')
    });

    this.toolbar = new Toolbar();
    this.toolbar.id = 'toolbar';
    this.toolbar.addClass(makeClass(containerClass, 'toolbar'));

    this.toolbar.addItem('newFolder', newFolder);
    this.toolbar.addItem('uploadFile', uploadFile);
    this.toolbar.addItem('refresh', refresh);

    this.listing = new JupyrefsDirListing({
      model: this.model,
      translator: this.translator
    });
    this.listing.id = 'listing';

    this.layout = new PanelLayout({ fitPolicy: options.fitPolicy });
    this.layout.addWidget(this.toolbar);
    this.layout.addWidget(this.listing);

    return (async () => {
      await this.update();
      return this;
    })() as unknown as JupyrefsBrowser;
  }

  public get fileOpened(): Signal<Widget, string> {
    return this.listing.fileOpened;
  }

  protected createNewDirectory(): void {
    // no-op
  }

  protected uploadFile(): void {
    // no-op
  }

  public async update(): Promise<void> {
    await this.listing.refresh();
    super.update();
  }

  public layout: PanelLayout;

  protected toolbar: Toolbar<Widget>;
  protected listing: JupyrefsDirListing;
  protected model: IBrowserModel;
  protected translator: ITranslator;

  private _trans: TranslationBundle;
}

// vim: set ft=typescript:
