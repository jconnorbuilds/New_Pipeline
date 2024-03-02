'use strict';

import '../../../assets/scss/pipeline.scss';
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';
import Calculator from '../currency_calculator.js';
import costTable from './costsheet-dt.js';

const currencyList = currencies; // currencies is declared globally in html template

Calculator.setup(currencyList);
costTable.getOrInitTable();
costTable.setupTableEventHandlers();
