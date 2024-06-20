import { slugify } from '../utils.js';

export class CostDisplay {
  isMatched;
  invoiceFile;
  invoiceFileDisplay;
  constructor(costData) {
    this.id = costData.pk;
    this.PONumber = costData.PO_number;
    this.jobId = costData.job;
    this.jobName = costData.job__job_name;
    this.amount = costData.amount;
    this.description = costData.description;
    this.currency = costData.currency;
    this.UIElement = document.querySelector(`.invoice[data-po-num="${this.PONumber}"]`);
    this.isMatched = false;
    this.tempDiv = document.createElement('div');
    this.tempDiv.classList.add('redtext');
    console.log(this);
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
