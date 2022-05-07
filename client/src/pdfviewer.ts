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
//import { AnnotationFactory } from 'annotpdf';

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
      renderer: 'canvas'
    });

    this.linkService.setViewer(this.viewer);
    this.eventBus.on('pagesinit', () => {
      this.viewer.currentScaleValue = 'page-width';
    });

    this._filePath = null;
    this._closedSignal = new Signal<JupyrefsPDFViewer, Message>(this);
  }

  async renderModel(mimemodel: IRenderMime.IMimeModel): Promise<void> {
    const model = mimemodel.data as unknown as Contents.IModel;

    if (model) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

      const data = new Buffer(model.content, 'base64');
      const loadingTask = pdfjsLib.getDocument({
        data: data,
        enableXfa: true
      });

      const pdfDocument = await loadingTask.promise;
      this.viewer.setDocument(pdfDocument);
      this.linkService.setDocument(pdfDocument, null);

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

  private _closedSignal: Signal<JupyrefsPDFViewer, Message>;
  private _filePath: string | null;
}

// vim: set ft=typescript:
