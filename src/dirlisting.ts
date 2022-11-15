import { makeClass } from './common';
import { IBrowserModel } from './interfaces';

import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

import {
  ITranslator,
  TranslationBundle,
  nullTranslator
} from '@jupyterlab/translation';
import { Contents } from '@jupyterlab/services';

import dirIconStr from '!./assets/icon_folder.svg';
import pdfIconStr from '!./assets/icon_document_pdf.svg';

const containerClass = 'dirlisting';
const rootClass = 'root';
const branchClass = 'branch';
const itemClass = 'item';
const itemIconClass = 'itemicon';
const itemTextClass = 'itemtext';

const selectableClass = 'mod-selectable';
const selectedClass = 'mod-selected';
const expandedClass = 'mod-expanded';

const iconMap = new Map<string, string>([['application/pdf', pdfIconStr]]);

interface IOptions {
  model: IBrowserModel;
  translator?: ITranslator;
}

export class JupyrefsDirListing extends Widget {
  constructor(options: IOptions) {
    super();

    this.model = options.model;
    this.addClass(makeClass(containerClass));

    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');

    this._dirOpened = new Signal<Widget, string>(this);
    this._fileOpened = new Signal<Widget, string>(this);
  }

  public async refresh(): Promise<void> {
    const content = await this.buildTree();
    content.classList.remove(makeClass(containerClass, branchClass));
    content.classList.add(makeClass(containerClass, rootClass));
    this.node.replaceChildren(content);
  }

  public get dirOpened(): Signal<Widget, string> {
    return this._dirOpened;
  }

  public get fileOpened(): Signal<Widget, string> {
    return this._fileOpened;
  }

  protected directoryHandler(list: HTMLElement): (m: Contents.IModel) => void {
    return (item: Contents.IModel) => {
      const elem = document.createElement('li');
      const row = document.createElement('div');

      const icon = document.createElement('span');
      icon.innerHTML = dirIconStr || '';
      icon.classList.add(makeClass(containerClass, itemIconClass));
      row.appendChild(icon);

      const name = document.createElement('span');
      name.innerHTML = item.name;
      name.classList.add(makeClass(containerClass, itemTextClass));
      row.appendChild(name);

      row.dataset.path = item.path;
      row.dataset.mimetype = '';
      row.dataset.isdir = 'true';
      row.dataset.expanded = 'false';

      row.classList.add(makeClass(containerClass, itemClass));
      row.classList.add(makeClass(selectableClass));
      elem.appendChild(row);

      row.addEventListener('click', event => {
        const target = event.currentTarget as HTMLElement;
        const cls = makeClass(selectedClass);

        const selected = this.node.querySelectorAll(`.${cls}`);
        for (const e of selected) {
          e.classList.remove(cls);
        }

        target.classList.add(cls);
      });

      row.addEventListener('dblclick', async event => {
        if (event.currentTarget) {
          const target = event.currentTarget as HTMLElement;
          const cls = makeClass(expandedClass);

          if (target.dataset.expanded === 'false') {
            target.classList.add(cls);
            const sublist = await this.buildTree(target.dataset.path);
            elem.appendChild(sublist);
            target.dataset.expanded = 'true';
          } else if (target.dataset.expanded === 'true') {
            target.classList.remove(cls);
            elem.replaceChildren(target);
            target.dataset.expanded = 'false';
          }
        }
      });

      list.appendChild(elem);
    };
  }

  protected fileHandler(list: HTMLElement): (m: Contents.IModel) => void {
    return (item: Contents.IModel) => {
      const elem = document.createElement('li');
      const row = document.createElement('div');

      const icon = document.createElement('span');
      icon.innerHTML = iconMap.get(item.mimetype) || '';
      icon.classList.add(makeClass(containerClass, itemIconClass));
      row.appendChild(icon);

      const name = document.createElement('span');
      name.innerHTML = item.name;
      name.classList.add(makeClass(containerClass, itemTextClass));
      row.appendChild(name);

      row.dataset.path = item.path;
      row.dataset.mimetype = item.mimetype;
      row.dataset.isdir = 'false';
      row.classList.add(makeClass(containerClass, itemClass));
      row.classList.add(makeClass(selectableClass));
      elem.appendChild(row);

      row.addEventListener('click', event => {
        const target = event.currentTarget as HTMLElement;
        const cls = makeClass(selectedClass);

        const selected = this.node.querySelectorAll(`.${cls}`);
        for (const e of selected) {
          e.classList.remove(cls);
        }

        target.classList.add(cls);
      });

      row.addEventListener('dblclick', async event => {
        const target = event.currentTarget as HTMLElement;
        if (target.dataset.path) {
          this._fileOpened.emit(target.dataset.path);
        }
      });

      list.appendChild(elem);
    };
  }

  protected async buildTree(rootPath = ''): Promise<Element> {
    const response = await this.model.items(rootPath);

    const list = document.createElement('ul');
    list.classList.add(makeClass(containerClass, branchClass));

    if (response.length === 0) {
      const row = document.createElement('div');
      row.innerHTML = '(no items)';
      row.classList.add(makeClass(containerClass, itemClass));

      const elem = document.createElement('li');
      elem.appendChild(row);

      list.appendChild(elem);
    } else {
      response
        .filter((m: Contents.IModel) => m.type === 'directory')
        .forEach(this.directoryHandler(list));
      response
        .filter((m: Contents.IModel) => m.type === 'file')
        .forEach(this.fileHandler(list));
    }

    return list;
  }

  protected model: IBrowserModel;
  protected translator: ITranslator;

  private _dirOpened: Signal<Widget, string>;
  private _fileOpened: Signal<Widget, string>;

  private _trans: TranslationBundle;
}

// vim: set ft=typescript:
