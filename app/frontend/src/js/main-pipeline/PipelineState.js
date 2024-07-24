'use strict';

import { dates } from '../utils';

// export default class PipelineState {
//   constructor({ viewType = 'monthly', viewDate = dates.currentDate() } = {}) {
//     this._viewType = viewType;
//     [this._viewYear, this._viewMonth] = viewDate;
//   }

//   get viewType() {
//     return this._viewType;
//   }

//   set viewType(typeString) {
//     // Accepts either "monthly" or "all"
//     this._viewType = typeString;
//     this.saveState();
//   }

//   get viewYear() {
//     return this._viewYear;
//   }

//   set viewYear(year) {
//     this._viewYear = year;
//     this.saveState();
//   }

//   get viewMonth() {
//     return this._viewMonth;
//   }

//   set viewMonth(month) {
//     this._viewMonth = month;
//     this.saveState();
//   }

//   get viewDate() {
//     return [this._viewYear, this._viewMonth];
//   }

//   set viewDate([year, month]) {
//     [this._viewYear, this._viewMonth] = [year, month];
//     this.saveState();
//   }

//   nextMonth() {
//     return this._viewMonth != 12
//       ? [this._viewYear, this._viewMonth + 1]
//       : [this._viewYear + 1, 1];
//   }

//   prevMonth() {
//     return this._viewMonth != 1
//       ? [this._viewYear, this._viewMonth - 1]
//       : [this._viewYear - 1, 12];
//   }

//   saveState() {
//     const state = {
//       viewType: this.viewType,
//       viewDate: this.viewDate,
//     };
//     sessionStorage.setItem('pipelineState', JSON.stringify(state));
//   }

//   // Checks if a new row needs to be added when a new job is added.
//   // This method doesn't really belong here
//   // TODO: Move this somewhere else
//   checkForNeedsNewRow() {
//     return (
//       (this._viewMonth == dates.thisMonth() && this._viewYear == dates.thisYear()) ||
//       this._viewType === 'all'
//     );
//   }
// }

export const state = load() || {
  viewType: 'monthly',
  viewYear: dates.currentDate()[0],
  viewMonth: dates.currentDate()[1],
};

export function getState() {
  return state;
}

export function setState(newState) {
  Object.assign(state, newState);
  save();
}

function save() {
  sessionStorage.setItem('pipelineState', JSON.stringify(state));
}

function load() {
  const state = sessionStorage.getItem('pipelineState');
  return state !== 'undefined' ? JSON.parse(state) : null;
}

export function nextMonth() {
  const [year, month] =
    state.viewMonth != 12
      ? [state.viewYear, state.viewMonth + 1]
      : [state.viewYear + 1, 1];

  setState({ viewYear: year, viewMonth: month });

  return [state.viewYear, state.viewMonth];
}

export function prevMonth() {
  const [year, month] =
    state.viewMonth != 1
      ? [state.viewYear, state.viewMonth - 1]
      : [state.viewYear - 1, 12];

  setState({ viewYear: year, viewMonth: month });

  return [state.viewYear, state.viewMonth];
}

export function checkForNeedsNewRow() {
  return (
    (state.viewMonth === dates.thisMonth() && state.viewYear === dates.thisYear()) ||
    state.viewType === 'all'
  );
}
