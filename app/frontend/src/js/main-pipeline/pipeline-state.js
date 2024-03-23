import { dates } from '../utils';

let viewType = 'monthly';
// initialize the view dates
let [viewYear, viewMonth] = dates.currentDate();

export const setViewType = (typeName) => (viewType = typeName);
export const getViewType = () => viewType;

export const setViewMonth = (month) => (viewMonth = month);
export const getViewMonth = () => viewMonth;
export const setViewYear = (year) => (viewYear = year);
export const getViewYear = () => viewYear;
export const getViewDate = () => [viewYear, viewMonth];
export const setViewDate = ([year, month]) =>
  ([viewYear, viewMonth] = [year, month]);

export const getNextMonth = () =>
  viewMonth != 12 ? [viewYear, viewMonth + 1] : [viewYear + 1, 1];

export const getPrevMonth = () =>
  viewMonth != 1 ? [viewYear, viewMonth - 1] : [viewYear - 1, 12];

export const checkForNeedsNewRow = () =>
  (viewMonth == dates.thisMonth() && viewYear == dates.thisYear()) ||
  viewType === 'all';
