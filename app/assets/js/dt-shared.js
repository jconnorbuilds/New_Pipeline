let firstSelectedBox;
let firstSelectedRow;
let ongoingSelection = false;
let mouseDown = 0;

export const initializeGlobalMouseEvents = () => {
  document.body.addEventListener('mousedown', () => {
    mouseDown = 1;
  });

  document.body.addEventListener('mouseup', () => {
    mouseDown = 0;
    ongoingSelection = false;
  });
};

export const beginSelection = (e) => {
  ongoingSelection = true;
  firstSelectedBox = e.target;
  firstSelectedRow = e.target.closest('tr');
  firstSelectedRow.classList.toggle('.selected-row');
  firstSelectedBox.checked = !firstSelectedBox.checked;
};

export const handleSingleClick = (e) => {
  if (!mouseDown) {
    const checkbox = e.target;
    const row = checkbox.closest('tr');
    const isChecked = firstSelectedBox.checked;

    checkbox.checked = !isChecked;
    checkbox.checked
      ? row.classList.add('selected-row')
      : row.classList.remove('selected-row');
  }
};

export const selectOnDrag = (e) => {
  if (mouseDown && ongoingSelection && e.target.closest('tr')) {
    const row = e.target.closest('tr');
    const checkbox = row.querySelector('.form-check-input') || null;
    const isChecked = firstSelectedBox.checked;
    console.log(e.target.querySelector('th'));
    isChecked
      ? row.classList.add('selected-row')
      : row.classList.remove('selected-row');

    if (checkbox) checkbox.checked = isChecked;
  }
};

export const preventHighlighting = (e) => {
  if (mouseDown && ongoingSelection) e.preventDefault();
};

export const getCostIDAndSubmitInvoice = (e) => {
  e.preventDefault();
  const costID = e.target.getAttribute('id').split('-').pop();
  requestInvoice(costID, plTable.getTable());
};
