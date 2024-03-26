'use strict';

import '../../styles/index.scss';
import invoiceTable from './invoices-dt.js';
import {
  initializeStatusFilters,
  setupSortByStatus,
} from '../costs-and-invoices-common-funcs.js';
import { setupTableEventHandlers } from './invoices-dt-ui-funcs.js';

invoiceTable.getOrInitTable();
setupTableEventHandlers();
initializeStatusFilters();
