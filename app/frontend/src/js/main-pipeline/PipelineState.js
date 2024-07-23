import { dates } from '../utils';

export default class PipelineState {
  constructor({ viewType = 'monthly', viewDate = dates.currentDate() } = {}) {
    this._viewType = viewType;
    [this._viewYear, this._viewMonth] = viewDate;
  }

  get viewType() {
    return this._viewType;
  }

  set viewType(typeString) {
    // Accepts either "monthly" or "all"
    this._viewType = typeString;
  }

  set viewYear(year) {
    this._viewYear = year;
  }

  get viewYear() {
    return this._viewYear;
  }

  set viewMonth(month) {
    this._viewMonth = month;
  }

  get viewMonth() {
    return this._viewMonth;
  }

  set viewDate([year, month]) {
    [this._viewYear, this._viewMonth] = [year, month];
  }

  get viewDate() {
    return [this._viewYear, this._viewMonth];
  }

  nextMonth() {
    return this._viewMonth != 12
      ? [this._viewYear, this._viewMonth + 1]
      : [this._viewYear + 1, 1];
  }

  prevMonth() {
    return this._viewMonth != 1
      ? [this._viewYear, this._viewMonth - 1]
      : [this._viewYear - 1, 12];
  }

  // Checks if a new row needs to be added when a new job is added.
  // This method doesn't really belong here
  // TODO: Move this somewhere else
  checkForNeedsNewRow() {
    return (
      (this._viewMonth == dates.thisMonth() && this._viewYear == dates.thisYear()) ||
      this._viewType === 'all'
    );
  }
}
