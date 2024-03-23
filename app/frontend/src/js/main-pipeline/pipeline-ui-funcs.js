import $ from 'jquery';
import DataTable from 'datatables.net';
import { updateRevenueDisplay } from './pipeline-funcs';
import * as State from './pipeline-state.js';
import { dates } from '../utils.js';
import { queryJobs } from './pipeline-dt-funcs.js';
import { createElement } from '../utils.js';

const unreceivedFilter = document.querySelector('input.unreceived');
const toggleOngoingFilter = document.querySelector('input.toggle-ongoing');
const showOnlyOngoingFilter = document.querySelector('input.only-ongoing');
const showOutstandingPayments = document.querySelector(
  'input.toggle-outstanding'
);

export const revenueToggleHandler = (e) => {
  const btn = e.currentTarget;
  const unitToggleInput = document.querySelector('#id_granular_revenue');
  const revenueInput = document.querySelector('#id_revenue');

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

export function setupStatusOrdering() {
  const jobStatusOrderMap = {
    ONGOING: 1,
    READYTOINV: 2,
    INVOICED1: 3,
    INVOICED2: 4,
    FINISHED: 5,
    ARCHIVED: 6,
  };

  DataTable.ext.type.order['status-pre'] = (data) => {
    const statusOrder = jobStatusOrderMap[data];
    return statusOrder ? statusOrder : 0;
  };
}

export function createFilters() {
  DataTable.ext.search.push(function (settings, data) {
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

  DataTable.ext.search.push(function (settings, data) {
    const outstandingVendorPayment = data[13] === 'false' && +data[5] > 0;
    if (showOutstandingPayments.checked) {
      return outstandingVendorPayment ? true : false;
    }
    return true;
  });
}

// loading spinner functions for pipeline job form submission
const spinner = document.querySelector('#add-job-spinner'); // rename this ID
export const toggleLoadingSpinner = (spinnerEl = spinner) => {
  spinnerEl.classList.toggle('invisible');
};
export const hideLoadingSpinner = (spinnerEl = spinner) => {
  spinnerEl.classList.add('invisible');
};
export const showLoadingSpinner = (spinnerEl = spinner) => {
  spinnerEl.classList.remove('invisible');
};

// Pipeline date selection
export const pipelineMonth = document.querySelector('#pipeline-month');
export const pipelineYear = document.querySelector('#pipeline-year');

const createOptionEl = (year) => {
  return createElement('option', {
    attributes: { value: year },
    text: `${year}年`,
  });
};

export const initializeDateSelectors = () => {
  for (let year = 2021; year <= dates.thisYear() + 1; year++) {
    pipelineYear.appendChild(createOptionEl(year));
  }
  [pipelineYear.value, pipelineMonth.value] = dates.currentDate();
};

export const dateSelectionHandler = (event) => {
  let viewYear, viewMonth;
  switch (event.target.getAttribute('id')) {
    case 'pipeline-next':
      [viewYear, viewMonth] = State.getNextMonth();
      break;
    case 'pipeline-prev':
      [viewYear, viewMonth] = State.getPrevMonth();
      break;
    case 'pipeline-current':
      [viewYear, viewMonth] = dates.currentDate();
  }
  // update UI
  [pipelineYear.value, pipelineMonth.value] = [viewYear, viewMonth];

  // update state
  State.setViewDate([+pipelineYear.value, +pipelineMonth.value]);

  // get data
  queryJobs(...State.getViewDate());
};

// TODO: replace jQuery with JS, forego slideUp/slideDown?
export const toggleViewHandler = () => {
  if (State.getViewType() === 'monthly') {
    State.setViewType('all');
    $('.monthly-item').slideUp('fast', function () {
      $('#pipeline-date-select .monthly-item').removeClass('d-flex');
    });

    $('.toggle-view').html('<b>月別で表示</b>');
    queryJobs(undefined, undefined);
  } else {
    State.setViewType('monthly');
    currentExpectedRevenueDisplay.textContent = '表示の案件　請求総額(予定)';
    $('#pipeline-date-select .monthly-item').addClass('d-flex');
    $('.monthly-item').slideDown('fast');
    $('.toggle-view').html('<b>全案件を表示</b>');
    queryJobs(...State.getViewDate());
  }
  setExpectedRevenueDisplayText();
};
