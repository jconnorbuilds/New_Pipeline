let viewType = 'monthly';
export const setViewType = (typeName) => (viewType = typeName);
export const getViewType = () => viewType;

let date = new Date();
let currentMonth = date.getMonth() + 1;
let currentYear = date.getFullYear();
let viewMonth = currentMonth;
let viewYear = currentYear;

export const setViewMonth = (month) => (viewMonth = month);
export const getViewMonth = () => viewMonth;
export const setViewYear = (year) => (viewYear = year);
export const getViewYear = () => viewYear;

export const needsNewRow = () =>
  viewMonth == currentMonth && viewYear == currentYear;
