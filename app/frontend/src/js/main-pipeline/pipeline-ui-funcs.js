import $ from 'jquery';
import DataTable from 'datatables.net';
import { state, nextMonth, prevMonth, setState } from './PipelineState.js';
import { dates } from '../utils.js';
import { queryJobs } from './pipeline-dt-funcs.js';
import { createElement } from '../utils.js';
import { _fetchRevenueData } from './pipeline-funcs.js';

const unreceivedFilter = document.querySelector('input.unreceived');
const toggleOngoingFilter = document.querySelector('input.toggle-ongoing');
const showOnlyOngoingFilter = document.querySelector('input.only-ongoing');
const showOutstandingPayments = document.querySelector('input.toggle-outstanding');
const ytdRevenueTotalUI = document.querySelector('#total-revenue-ytd');
const ytdRevenueAvgUI = document.querySelector('#avg-revenue-ytd');
const monthlyRevenueActualTotalUI = document.querySelector('#total-revenue-monthly-act');

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
  '#total-revenue-monthly-exp',
);
export const currentExpectedRevenueDisplay = document.querySelector(
  '.revenue-display-text.expected',
);
export const currentActualRevenueDisplayText = document.querySelector(
  '.revenue-display-text.actual',
);

export const updateRevenueDisplay = async (year, month) => {
  const data = await _fetchRevenueData(year, month);

  ytdRevenueTotalUI.textContent = data.total_revenue_ytd;
  ytdRevenueAvgUI.textContent = data.avg_monthly_revenue_ytd;
  monthlyRevenueActualTotalUI.textContent = data.total_revenue_monthly_actual;
};

export function refreshRevenueDisplay() {
  setExpectedRevenueDisplayText();
  updateRevenueDisplay(state.viewYear, state.viewMonth);
  updateRevenueDisplay(state.viewYear, state.viewMonth);
  totalExpectedRevenueDisplay.textContent = `¥${getTotalExpectedRevenueAmt().toLocaleString()}`;
}

// TODO: get rid of this function, it's unnecessary to change the text
export function setExpectedRevenueDisplayText() {
  currentExpectedRevenueDisplay.textContent =
    state.viewType !== 'monthly' || unreceivedFilter.checked
      ? '表示の案件　請求総額 (予定)'
      : '表示の案件　請求総額 (予定)';
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
export const toggleLoadingSpinner = () => {
  spinner.classList.toggle('invisible');
};
export const hideLoadingSpinner = () => {
  spinner.classList.add('invisible');
};
export const showLoadingSpinner = () => {
  spinner.classList.remove('invisible');
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

export const dateSelectionButtonHandler = (event) => {
  let viewYear, viewMonth;
  switch (event.target.getAttribute('id')) {
    case 'pipeline-next':
      [viewYear, viewMonth] = nextMonth();
      break;
    case 'pipeline-prev':
      [viewYear, viewMonth] = prevMonth();
      break;
    case 'pipeline-current':
      [viewYear, viewMonth] = dates.currentDate();
      break;
  }
  // update UI
  [pipelineYear.value, pipelineMonth.value] = [viewYear, viewMonth];

  // update state
  setState({ viewYear: +pipelineYear.value, viewMonth: +pipelineMonth.value });

  // get data
  queryJobs(state.viewYear, state.viewMonth);
};

export const dateSelectionDropdownHandler = (event) => {
  event.target.matches('#pipeline-year')
    ? setState({ viewYear: event.target.value })
    : setState({ viewMonth: event.target.value });

  queryJobs(state.viewYear, state.viewMonth);
};

// TODO: replace jQuery with JS, forego slideUp/slideDown?
export const toggleView = () => {
  state.viewType === 'monthly' ? displayAllJobsView() : displayMonthlyJobsView();
};

export const displaySelectedView = () => {
  state.viewType === 'all' ? displayAllJobsView() : displayMonthlyJobsView();
};

export const displayMonthlyJobsView = () => {
  setState({ viewType: 'monthly' });
  currentExpectedRevenueDisplay.textContent = '表示の案件　請求総額(予定)';
  $('#pipeline-date-select .monthly-item').addClass('d-flex');
  $('.monthly-item').slideDown('fast');
  $('.toggle-view').html('<b>全案件を表示</b>');
  queryJobs(state.viewYear, state.viewMonth);
  setExpectedRevenueDisplayText();
};

export const displayAllJobsView = () => {
  setState({ viewType: 'all' });
  $('.monthly-item').slideUp('fast', function () {
    $('#pipeline-date-select .monthly-item').removeClass('d-flex');
  });

  $('.toggle-view').html('<b>月別で表示</b>');
  queryJobs(undefined, undefined);
  setExpectedRevenueDisplayText();
};
