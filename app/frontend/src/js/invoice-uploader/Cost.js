import { slugify } from '../utils.js';

export class CostDisplay {
  isMatched;
  invoiceFile;
  invoiceFileDisplay;
  constructor(costData) {
    this.id = costData.pk;
    this.PONumber = costData.fields.PO_number;
    this.jobId = costData.fields.job;
    this.amount = costData.fields.amount;
    this.description = costData.fields.description;
    this.currency = costData.fields.currency;
    this.UIElement = document.querySelector(`.invoice[data-po-num="${this.PONumber}"]`);
    this.isMatched = false;
  }

  matchFile(file, fileDisplay) {
    this.invoiceFile = file;
    this.isMatched = true;
    this.invoiceFileDisplay = fileDisplay;
    this.toggleInvoiceAttachedPill(true);
  }

  unmatchFile() {
    this.invoiceFile = undefined;
    this.isMatched = false;
    this.invoiceFileDisplay = undefined;
    this.toggleInvoiceAttachedPill(false);
  }

  toggleInvoiceAttachedPill(isAttached) {
    const targetElement = this.UIElement.querySelector('.indicators__attach-inv');
    targetElement.classList.toggle('attached', isAttached);
    targetElement.toggleAttribute('disabled', isAttached);
    targetElement.innerHTML = isAttached
      ? 'Invoice attached'
      : `<i class="fa-solid fa-plus"></i><span>Add invoice</span>`;
  }
}
