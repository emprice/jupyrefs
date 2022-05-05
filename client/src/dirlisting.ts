import { makeClass } from './common';
import { IBrowserModel } from './interfaces';

import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

import {
  ITranslator,
  TranslationBundle,
  nullTranslator
} from '@jupyterlab/translation';

const containerClass = 'dirlisting';
const branchClass = 'branch';
const itemClass = 'item';
const itemTextClass = 'itemtext';

const selectableClass = 'mod-selectable';
const selectedClass = 'mod-selected';
const expandedClass = 'mod-expanded';

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
    this.node.replaceChildren(content);
  }

  public get dirOpened(): Signal<Widget, string> {
    return this._dirOpened;
  }

  public get fileOpened(): Signal<Widget, string> {
    return this._fileOpened;
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
      response.forEach(item => {
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

        row.addEventListener('click', event => {
          const target = event.currentTarget as HTMLElement;
          const cls = makeClass(selectedClass);

          const selected = list.querySelectorAll(`.${cls}`);
          for (const e of selected) {
            e.classList.remove(cls);
          }

          target.classList.add(cls);
        });

        if (item.type === 'directory') {
          row.dataset.expanded = 'false';
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
        }

        list.appendChild(elem);
      });
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
