import { makeClass } from './common';
import { IBrowserModel } from './interfaces';

import { Signal } from '@lumino/signaling';
import { Widget, SingletonLayout } from '@lumino/widgets';
import { Contents } from '@jupyterlab/services';
import { ITranslator, TranslationBundle, nullTranslator } from '@jupyterlab/translation';

const prefix: string = 'DirListing';

interface IOptions {
  model: IBrowserModel;
  translator?: ITranslator;
}

export class JupyrefsDirListing extends Widget {
  constructor(options: IOptions) {
    super();

    this.model = options.model;
    this.translator = options.translator || nullTranslator;
    this.addClass(this.makeClass('listing'));

    this._trans = this.translator.load('jupyterlab');
    this._dirOpened = new Signal<JupyrefsDirListing, string>(this);
    this._fileOpened = new Signal<JupyrefsDirListing, string>(this);

    this.layout = new SingletonLayout();
  }

  public async refresh(): Promise<void> {
    const response = await this.model.items();
    const items = response.map((item) => {
      const elem: Element = document.createElement('li');
      elem.innerHTML = item.name;
      return elem;
    });

    const list: Element = document.createElement('ul');
    list.replaceChildren(...items);
    this.node.replaceChildren(list);
  }

  public get dirOpened(): Signal<JupyrefsDirListing, string> {
    return this._dirOpened;
  }

  public get fileOpened(): Signal<JupyrefsDirListing, string> {
    return this._fileOpened;
  }

  protected handleOpen(item: Contents.IModel): void {
    if (item.type === 'file') {
      this._fileOpened.emit(item.path);
    } else if (item.type == 'directory') {
      this._dirOpened.emit(item.path);
    }
  }

  public layout: SingletonLayout;

  protected model: IBrowserModel;
  protected translator: ITranslator;

  private _trans: TranslationBundle;
  private _dirOpened: Signal<JupyrefsDirListing, string>;
  private _fileOpened: Signal<JupyrefsDirListing, string>;

  protected makeClass(...parts: string[]): string {
    const allParts = [prefix, ...parts];
    return makeClass(...allParts);
  }
}

// vim: set ft=typescript:
