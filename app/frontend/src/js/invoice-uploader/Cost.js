export class Cost {
  isMatched;
  invoiceFile;
  invoicePreviewElement;
  constructor(costData) {
    this.id = costData.pk;
    this.PONumber = costData.PO_number;
    this.jobId = costData.job;
    this.jobName = costData.job__job_name;
    this.jobCode = costData.job__job_code;
    this.amount = costData.amount;
    this.description = costData.description;
    this.currency = costData.currency;
    this.UIElement = document.querySelector(`.invoice[data-po-num="${this.PONumber}"]`);
    this.isMatched = false;
  }

  matchFile(file) {
    this.invoiceFile = file;
    this.invoiceFile.costInfoElement = this.UIElement;
    this.invoiceFile.PONumber = this.PONumber;
    this.isMatched = true;
    this.invoicePreviewElement = file.previewElement;
    this.toggleInvoiceAttachedPill(true);
    document.dispatchEvent(
      new CustomEvent('fileMatchedWithCost', {
        detail: { PONumber: file.PONumber },
      }),
    );
  }

  unmatchFile() {
    document.dispatchEvent(
      new CustomEvent('fileUnmatchedFromCost', {
        detail: { PONumber: this.PONumber },
      }),
    );
    this.invoiceFile.costInfoElement = undefined;
    this.invoiceFile.PONumber = undefined;
    this.invoiceFile = undefined;
    this.isMatched = false;
    this.invoicePreviewElement = undefined;
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
