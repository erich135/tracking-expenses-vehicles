import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ConfirmationModal = ({ isOpen, onCancel, onConfirm, data, isEditMode = false }) => {
  if (!data) return null;

  const { jobDetails, customerItems, expenseItems, totals } = data;

  const renderItems = (items, title) => (
    <div>
      <h4 className="font-semibold text-md mt-2 mb-1">{title}</h4>
      <ul className="list-disc list-inside text-sm space-y-1">
        {items.map((item, index) => (
          <li key={item.id || index}>
            {item.part?.name || item.part}: {item.quantity} x R{Number(item.price).toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isEditMode ? 'Confirm Changes' : 'Confirm Costing Entry'}</AlertDialogTitle>
          <AlertDialogDescription>
            Please review the details below before saving.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-sm text-slate-700 dark:text-slate-300 max-h-[50vh] overflow-y-auto pr-2 space-y-3">
          <p><strong>Job Number:</strong> {jobDetails.jobNumber}</p>
          <p><strong>Invoice Number:</strong> {jobDetails.invoiceNumber}</p>
          <p><strong>Job Description:</strong> {jobDetails.jobDescription?.description}</p>
          <p><strong>Customer:</strong> {jobDetails.customer?.name}</p>
          <p><strong>Rep:</strong> {jobDetails.rep?.rep_name}</p>
          
          {renderItems(customerItems, 'Customer Items')}
          {renderItems(expenseItems, 'Expense Items')}

          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3 space-y-1">
             <p><strong>Total Customer:</strong> <span className="font-semibold text-green-600">R{totals.customer.toFixed(2)}</span></p>
             <p><strong>Total Expenses:</strong> <span className="font-semibold text-red-600">R{totals.expenses.toFixed(2)}</span></p>
             <p><strong>Profit:</strong> <span className="font-bold text-slate-800 dark:text-slate-100">R{totals.profit.toFixed(2)}</span></p>
             <p><strong>Margin:</strong> <span className="font-bold text-slate-800 dark:text-slate-100">{totals.margin.toFixed(2)}%</span></p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Edit</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{isEditMode ? 'Save Changes' : 'Save Entry'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationModal;