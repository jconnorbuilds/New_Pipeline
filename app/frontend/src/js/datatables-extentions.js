'use strict';
import DataTable from 'datatables.net';

/**
 * Allows ordering the invoice table by invoice status
 */
export const setupSortInvoicesByStatus = () => {
  const invoiceStatusOrderMap = {
    NR: 1,
    REQ: 2,
    REC: 3,
    REC2: 4,
    ERR: 5,
    QUE: 6,
    PAID: 7,
    NA: 8,
  };

  DataTable.ext.type.order['status-pre'] = (data) => {
    const statusOrder = invoiceStatusOrderMap[data];
    return statusOrder ? statusOrder : -1;
  };
};

/**
 * Allows ordering the jobs table by job status
 */
export function setupOrderJobsByStatus() {
  const jobStatusOrderMap = {
    ONGOING: 1,
    READYTOINV: 2,
    INVOICED1: 3,
    INVOICED2: 4,
    FINISHED: 5,
    ARCHIVED: 6,
  };

  DataTable.ext.type.order['status-pre'] = (data) => {
    const statusOrder = jobStatusOrderMap[data];
    return statusOrder ? statusOrder : 0;
  };
}
