import { makeClass } from './common';

import { Widget } from '@lumino/widgets';
import { Signal } from '@lumino/signaling';
import { Message } from '@lumino/messaging';

import { IRenderMime } from '@jupyterlab/rendermime';
import { Contents } from '@jupyterlab/services';

import * as pdfjsLib from 'pdfjs-dist';
import { PDFViewer } from 'pdfjs-dist/lib/web/pdf_viewer.js';
import { EventBus } from 'pdfjs-dist/lib/web/event_utils.js';
import { PDFLinkService } from 'pdfjs-dist/lib/web/pdf_link_service.js';
import { NullL10n } from 'pdfjs-dist/lib/web/l10n_utils.js';
import workerSrc from 'pdfjs-dist/build/pdf.worker.js';

import * as DOMPurify from 'dompurify';
import { marked } from 'marked';

const $ = require('jquery'); // eslint-disable-line @typescript-eslint/no-var-requires
require('jquery-ui/ui/widgets/draggable.js');

const containerClass = 'pdfviewer';

export class JupyrefsPDFViewer extends Widget implements IRenderMime.IRenderer {
  constructor() {
    super();

    this.containerElem = document.createElement('div');
    this.containerElem.classList.add(makeClass(containerClass, 'container'));

    this.viewerElem = document.createElement('div');
    this.viewerElem.classList.add('pdfViewer');
    this.viewerElem.classList.add(makeClass(containerClass, 'viewer'));

    this.containerElem.appendChild(this.viewerElem);
    this.node.appendChild(this.containerElem);
    this.addClass(makeClass(containerClass));

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
      renderer: 'canvas',
      annotationMode: pdfjsLib.AnnotationMode.ENABLE,
      imageResourcesPath: '/lab/extensions/jupyrefs/static/pdfjs/'
    });

    this.linkService.setViewer(this.viewer);
    this.eventBus.on('pagesinit', () => {
      this.viewer.currentScaleValue = 'page-width';
      this.installClickHandler();
    });

    this._filePath = null;
    this._closedSignal = new Signal<JupyrefsPDFViewer, Message>(this);

    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  }

  protected installClickHandler(): void {
    this.viewerElem.addEventListener('click', async e => {
      const pagenum = this.viewer.currentPageNumber;
      const sel = `.page[data-page-number="${pagenum}"]`;
      const page = this.viewerElem.querySelector(sel);

      if (page) {
        const rect = page.getBoundingClientRect();
        const body = document.body;
        const off = {
          x: rect.left + body.scrollLeft,
          y: rect.top + body.scrollTop
        };

        const x = e.pageX - off.x;
        const y = e.pageY - off.y;

        const pageview = this.viewer.getPageView(pagenum - 1);
        const [px, py] = pageview.getPagePoint(x, y);

        const note = document.createElement('div');
        note.style.width = '50px';
        note.style.height = '50px';
        note.style.left = `${x}px`;
        note.style.top = `${y}px`;
        note.style.position = 'absolute';
        note.style.backgroundColor = 'yellow';

        $(note).draggable();
        $(page).append(note);
      }
    });
  }

  async renderModel(mimemodel: IRenderMime.IMimeModel): Promise<void> {
    const model = mimemodel.data as unknown as Contents.IModel;

    if (model) {
      const data = new Buffer(model.content, 'base64');
      const loadingTask = pdfjsLib.getDocument({
        data: data,
        enableXfa: true
      });

      this.pdfDocument = await loadingTask.promise;
      this.viewer.setDocument(this.pdfDocument);
      this.linkService.setDocument(this.pdfDocument, null);

      this._filePath = model.path;
    }
  }

  public get filePath(): string | null {
    return this._filePath;
  }

  public get closed(): Signal<JupyrefsPDFViewer, Message> {
    return this._closedSignal;
  }

  protected onResize(msg: Widget.ResizeMessage): void {
    this.viewer.currentScaleValue = 'page-width';
  }

  protected onCloseRequest(msg: Message): void {
    this._closedSignal.emit(msg);
    super.onCloseRequest(msg);
  }

  static mimeType = 'application/pdf';

  protected viewer;
  protected eventBus;
  protected linkService;

  protected viewerElem: HTMLDivElement;
  protected containerElem: HTMLDivElement;

  protected pdfDocument!: pdfjsLib.PDFDocumentProxy;

  private _closedSignal: Signal<JupyrefsPDFViewer, Message>;
  private _filePath: string | null;
}

// vim: set ft=typescript:
