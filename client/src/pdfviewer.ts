import { makeClass } from './common';

import { Widget } from '@lumino/widgets';
import { IRenderMime } from '@jupyterlab/rendermime';

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
  }

  async renderModel(mimemodel: IRenderMime.IMimeModel): Promise<void> {
    const model = mimemodel.data;

    if (model && model.content && typeof model.content === 'string') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

      const data = new Buffer(model.content, 'base64');
      const loadingTask = pdfjsLib.getDocument({
        data: data,
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

// vim: set ft=typescript:
