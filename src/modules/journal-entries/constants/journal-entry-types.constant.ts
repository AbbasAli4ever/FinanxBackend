export const JOURNAL_ENTRY_TYPES = [
  {
    key: 'STANDARD',
    label: 'Standard',
    description: 'Regular manual journal entry',
  },
  {
    key: 'ADJUSTING',
    label: 'Adjusting',
    description: 'End-of-period adjustment (accruals, deferrals, depreciation)',
  },
  {
    key: 'CLOSING',
    label: 'Closing',
    description: 'Year-end closing entry (close revenue/expense to retained earnings)',
  },
  {
    key: 'REVERSING',
    label: 'Reversing',
    description: 'Auto-generated reversal of a previous entry',
  },
  {
    key: 'RECURRING',
    label: 'Recurring',
    description: 'Template-based recurring journal entry',
  },
];
