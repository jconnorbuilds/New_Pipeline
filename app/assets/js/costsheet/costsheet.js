'use strict';

import '../../../assets/scss/pipeline.scss';
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';
import * as bootstrap from 'bootstrap';
// import $ from 'jquery';
// window.$ = $;

import Calculator from '../currency_calculator.js';
import costTable from './costsheet-dt.js';
import { setupTableEventHandlers } from './costsheet-dt-ui-funcs.js';

const currencyList = currencies; // currencies is declared globally in html template

Calculator.setup(currencyList);
const table = costTable.getOrInitTable();
setupTableEventHandlers();
