import { makeClass } from './common';

import { Widget } from '@lumino/widgets';

import DOMPurify from 'dompurify';
import { marked } from 'marked';

const containerClass = 'editor';

interface IOptions {
  id: string;
}

export class JupyrefsEditor extends Widget {
  constructor(options: IOptions) {
    super();

    this.id = options.id;
    this.addClass(makeClass(containerClass));

    this.textBox = document.createElement('textarea');
    this.node.appendChild(this.textBox);
  }

  protected textBox: HTMLTextAreaElement;
}

// vim: set ft=typescript:
