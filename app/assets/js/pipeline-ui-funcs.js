import DataTable from 'datatables.net-bs5';
import { updateRevenueDisplay } from './pipeline_funcs';
import * as State from './pipeline-state.js';

const unreceivedFilter = document.querySelector('input.unreceived');
const toggleOngoingFilter = document.querySelector('input.toggle-ongoing');
const showOnlyOngoingFilter = document.querySelector('input.only-ongoing');
const showOutstandingPayments = document.querySelector('input.toggle-outstanding');

export const revenueToggleHandler = (e) => {
  const btn = /** @type {!HTMLInputElement} */ (e.currentTarget);
  const unitToggleInput = /** @type {!HTMLInputElement} */ (
    document.querySelector('#id_granular_revenue')
  );
  const revenueInput = /** @type {!HTMLInputElement} */ (
    document.querySelector('#id_revenue')
  );

  if (btn.classList.contains('active')) {
    btn.textContent = '円';
    unitToggleInput.value = 'true';
    revenueInput.setAttribute('placeholder', '例）420069');
  } else {
    btn.textContent = '万円';
    unitToggleInput.value = 'false';
    revenueInput.setAttribute('placeholder', '例）100');
  }
};

let totalExpectedRevenueAmt = 0;
export const setTotalExpectedRevenueAmt = (value) => {
  totalExpectedRevenueAmt = value;
};
export const getTotalExpectedRevenueAmt = () => totalExpectedRevenueAmt;
export const totalExpectedRevenueDisplay = document.querySelector(
  '#total-revenue-monthly-exp'
);
export const currentExpectedRevenueDisplay = document.querySelector(
  '.revenue-display-text.expected'
);
export const currentActualRevenueDisplayText = document.querySelector(
  '.revenue-display-text.actual'
);

export function refreshRevenueDisplay() {
  setExpectedRevenueDisplayText();
  updateRevenueDisplay(...State.getViewDate());
  totalExpectedRevenueDisplay.textContent = `¥${getTotalExpectedRevenueAmt().toLocaleString()}`;
}

export function setExpectedRevenueDisplayText() {
  currentExpectedRevenueDisplay.textContent =
    State.getViewType() !== 'monthly' || unreceivedFilter.checked
      ? '表示の案件　請求総額 (予定)'
      : '表示の月　請求総額 (予定)';
}
export function createFilters() {
  const jobStatusOrderMap = {
    ONGOING: '0_',
    READYTOINV: '1_',
    INVOICED1: '3_',
    INVOICED2: '4_',
    FINISHED: '5_',
    ARCHIVED: '6_',
  };

  DataTable.ext.order['dom-job-select'] = function (settings, col) {
    return this.api()
      .column(col, { order: 'index' })
      .nodes()
      .map(function (td, i) {
        let status = td.querySelector('.job-status-select').value;
        return status ? jobStatusOrderMap[status] : 0;
      });
  };
  DataTable.ext.search.push(function (settings, data, dataIndex) {
    const unreceivedPayment = data[10] === '---';
    const ongoing = ['ONGOING', 'READYTOINV'].includes(data[9]);
    if (unreceivedFilter.checked) {
      return toggleOngoingFilter.checked
        ? unreceivedPayment || ongoing
        : unreceivedPayment && !ongoing;
    }
    if (showOnlyOngoingFilter.checked) return ongoing;
    if (!toggleOngoingFilter.checked) return !ongoing;

    return true;
  });

  DataTable.ext.search.push(function (settings, data, dataIndex) {
    const outstandingVendorPayment = data[13] === 'false' && +data[5] > 0;
    if (showOutstandingPayments.checked) {
      return outstandingVendorPayment ? true : false;
    }
    return true;
  });
}
