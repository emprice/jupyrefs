import { makeClass } from './common';
import { IBrowserModel } from './interfaces';

import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { toArray } from '@lumino/algorithm';

import { Contents } from '@jupyterlab/services';
import { ITranslator, TranslationBundle, nullTranslator } from '@jupyterlab/translation';

const containerClass: string = 'DirListing';
const branchClass: string = 'branch';
const itemClass: string = 'item';
const itemTextClass: string = 'itemText';

const selectableClass: string = 'mod-selectable';
const selectedClass: string = 'mod-selected';
const expandedClass: string = 'mod-expanded';

interface IOptions {
  model: IBrowserModel;
  translator?: ITranslator;
}

export class JupyrefsDirListing extends Widget {
  constructor(options: IOptions) {
    super();

    this.model = options.model;
    this.translator = options.translator || nullTranslator;
    this.addClass(makeClass(containerClass));

    this._trans = this.translator.load('jupyterlab');
    this._dirOpened = new Signal<JupyrefsDirListing, string>(this);
    this._fileOpened = new Signal<JupyrefsDirListing, string>(this);

    this._expanded = new Set<string>();
  }

  public async refresh(): Promise<void> {
    const content = await this.buildTree();
    this.node.replaceChildren(content);
  }

  protected async buildTree(rootPath: string = ''): Promise<Element> {
    const response = await this.model.items(rootPath);

    const list = document.createElement('ul');
    list.classList.add(makeClass(containerClass, branchClass));

    if (response.length == 0) {
      const row = document.createElement('div');
      row.innerHTML = '(no items)';
      row.classList.add(makeClass(containerClass, itemClass));

      const elem = document.createElement('li');
      elem.appendChild(row);

      list.appendChild(elem);
    } else {
      response.forEach((item) => {
        const elem = document.createElement('li');
        const row = document.createElement('div');

        const name = document.createElement('span');
        name.innerHTML = item.name;
        name.classList.add(makeClass(containerClass, itemTextClass));

        row.appendChild(name);

        row.dataset.path = item.path;
        row.dataset.mimetype = item.mimetype;
        row.dataset.isdir = (item.type === 'directory').toString();
        row.classList.add(makeClass(containerClass, itemClass));
        row.classList.add(makeClass(selectableClass));

        elem.appendChild(row);

        row.addEventListener('click', (event) => {
          const cls = makeClass(selectedClass);

          const selected = list.querySelectorAll(`.${cls}`);
          for (let e of selected) {
            e.classList.remove(cls);
          }

          row.classList.add(cls);
        });

        if (item.type === 'directory') {
          row.dataset.expanded = 'false';
          row.addEventListener('dblclick', async (event) => {
            if (event.currentTarget) {

              if (row.dataset.expanded === 'false') {
                const cls = makeClass(expandedClass);
                row.classList.add(cls);

                const sublist = await this.buildTree(row.dataset.path);
                elem.appendChild(sublist);
                row.dataset.expanded = 'true';
              }
            }
          });
        }

        list.appendChild(elem);
      });
    }

    return list;
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

  protected model: IBrowserModel;
  protected translator: ITranslator;

  private _expanded: Set<string>;

  private _trans: TranslationBundle;
  private _dirOpened: Signal<JupyrefsDirListing, string>;
  private _fileOpened: Signal<JupyrefsDirListing, string>;
}

// vim: set ft=typescript:
