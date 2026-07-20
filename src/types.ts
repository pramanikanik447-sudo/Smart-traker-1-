/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Debt {
  id: string;
  customerName: string;
  phoneNumber: string;
  amount: number;
  date: string;
  reason?: string;
  notes?: string;
  entryType?: 'debt' | 'payment';
}

export interface DebtFormData {
  customerName: string;
  phoneNumber: string;
  amount: string;
  reason: string;
  entryType: 'debt' | 'payment';
}
