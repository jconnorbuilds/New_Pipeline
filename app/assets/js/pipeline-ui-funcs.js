import { getTotalExpectedRevenueAmt, unreceivedFilter } from './PLTableFunctions.js';
import { getViewType } from './pipeline-state.js';
import { csrftoken as CSRFTOKEN } from './common.js';
import * as State from './pipeline-state.js';

let currentlySelectedEl;
export const getSelectedEl = () => currentlySelectedEl;
export const setSelectedEl = (el) => (currentlySelectedEl = el);

export const totalExpectedRevenueDisplay = document.querySelector(
  '#total-revenue-monthly-exp'
);
export const currentExpectedRevenueDisplay = document.querySelector(
  '.revenue-display-text.expected'
);
export const currentActualRevenueDisplayText = document.querySelector(
  '.revenue-display-text.actual'
);

export const drawNewRow = (datatable, newRowData) =>
  datatable.row(`#${newRowData.id}`).data(newRowData).invalidate().draw(false);

export const removeRow = (datatable, newRowData) =>
  datatable.row(`#${newRowData.id}`).remove().draw();

export function refreshRevenueDisplay() {
  setExpectedRevenueDisplayText();
  updateRevenueDisplay(State.getViewYear(), State.getViewMonth());
  totalExpectedRevenueDisplay.textContent = `¥${getTotalExpectedRevenueAmt().toLocaleString()}`;
}

export function setExpectedRevenueDisplayText() {
  currentExpectedRevenueDisplay.textContent =
    getViewType() !== 'monthly' || unreceivedFilter.checked
      ? '表示の案件　請求総額 (予定)'
      : '表示の月　請求総額 (予定)';
}

export function updateRevenueDisplay(year, month) {
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'GET',
    url: '/pipeline/revenue-data/' + year + '/' + month + '/',
    processData: false, // prevents jQuery from processing the data
    contentType: false, // prevents jQuery from setting the Content-Type header

    success: function (response) {
      $('#total-revenue-ytd').text(response.total_revenue_ytd);
      $('#avg-revenue-ytd').text(response.avg_monthly_revenue_ytd);
      $('#total-revenue-monthly-act').text(response.total_revenue_monthly_actual);
    },
  });
}
