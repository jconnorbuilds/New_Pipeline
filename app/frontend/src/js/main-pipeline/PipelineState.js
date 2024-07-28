'use strict';

import { dates } from '../utils';

export const state = attemptToLoad() || {
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

function attemptToLoad() {
  try {
    return load();
  } catch (error) {
    console.error(error);
  }
}

function load() {
  const state = sessionStorage.getItem('pipelineState');
  if (dateIsInvalid(state.viewYear, state.viewMonth))
    throw new Error(
      `Invalid date provided: year: ${state.viewYear}, month: ${state.viewMonth}`,
    );
  return state !== 'undefined' ? JSON.parse(state) : null;
}

function dateIsInvalid(year, month) {
  return [year, month].some((date) => date <= 0) && year > 3000 && month > 12;
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
