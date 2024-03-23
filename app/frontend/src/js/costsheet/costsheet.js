'use strict';

import '../../styles/index.scss';
import Calculator from './currency_calculator.js';
import costTable from './costsheet-dt.js';

costTable.getOrInitTable();
costTable.setupTableEventHandlers();
Calculator.setup();
