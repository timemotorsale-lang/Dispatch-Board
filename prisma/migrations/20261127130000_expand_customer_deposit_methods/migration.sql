ALTER TABLE "CustomerSalesDeposit" DROP CONSTRAINT "CustomerSalesDeposit_method_check";
ALTER TABLE "CustomerSalesDeposit" ADD CONSTRAINT "CustomerSalesDeposit_method_check" CHECK ("method" IN (
  'CASH', 'CHECK', 'CASHIERS_CHECK', 'MONEY_ORDER', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER_CARD',
  'ZELLE', 'ACH', 'WIRE', 'BANK_TRANSFER', 'CASH_APP', 'VENMO', 'PAYPAL', 'MOBILE_WALLET', 'OTHER_PAYMENT'
));
