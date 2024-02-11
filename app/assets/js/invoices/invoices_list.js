'use strict';

import 'datatables.net-responsive-bs5';
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';
import 'datatables.net-responsive-bs5/css/responsive.bootstrap5.min.css';
import { initTable } from './invoices-dt.js';
import { extendSearch, setupSortByStatus } from './invoices_common.js';
import { setupTableEventHandlers } from './invoices-dt-ui-funcs.js';

initTable();
setupTableEventHandlers();
extendSearch();
setupSortByStatus();
