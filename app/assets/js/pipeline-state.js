import { dates } from './utils';

let viewType = 'monthly';
// initialize the view dates
let [viewYear, viewMonth] = dates.currentDate();
let currentRowID;

export const setViewType = (typeName) => (viewType = typeName);
export const getViewType = () => viewType;

export const setViewMonth = (month) => (viewMonth = month);
export const getViewMonth = () => viewMonth;
export const setViewYear = (year) => (viewYear = year);
export const getViewYear = () => viewYear;
export const getViewDate = () => [viewYear, viewMonth];

export const checkForNeedsNewRow = () =>
  (viewMonth == dates.thisMonth() && viewYear == dates.thisYear()) ||
  viewType === 'all';
