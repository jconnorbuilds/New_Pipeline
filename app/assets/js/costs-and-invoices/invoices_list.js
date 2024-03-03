'use strict';

import '../../../assets/scss/pipeline.scss';
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';
import { initTable } from './invoices-dt.js';
import {
  extendSearch,
  setupSortByStatus,
} from './costs-and-invoices-common-funcs.js';
import { setupTableEventHandlers } from './invoices-dt-ui-funcs.js';

initTable();
setupTableEventHandlers();
extendSearch();
setupSortByStatus();
