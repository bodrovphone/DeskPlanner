const data = {
  transactions: [
    { type: 'invoice', id: '1' },
    { type: 'bill', id: '2' },
    { type: 'customer_credit', id: '3' },
    { type: 'invoice', id: '4' },
    { type: 'bill', id: '5' },
    { type: 'invoice', id: '6' },
    { type: 'customer_credit', id: '7' },
    { type: 'bill', id: '8' },
    { type: 'customer_credit', id: '9' },
    { type: 'bill', id: '10' },
    { type: 'bill', id: '11' },
    { type: 'invoice', id: '12' },
    { type: 'bill', id: '13' },
    { type: 'bill', id: '14' },
    { type: 'invoice', id: '15' },
  ],
};

type Recipe = {
  bill?: number;
  customer_credit?: number;
  invoice?: number;
};

type DataItem = {
  type: 'bill' | 'customer_credit' | 'invoice';
  id: string;
};

type Data = {
  transactions: DataItem[];
};

// howManyTripletsOf({ bill: 2, invoice: 1 }, data);

const howManyTripletsOf = (criterias: Recipe, data: Data) => {
  const { bill = 1, invoice = 1 } = criterias;

  const triplets = {
    bill: 0,
    invoice: 0,
    customer_credit: 0,
  } as const;

  data.transactions.reduce((currentIem: DataItem, accum: number) => {
    ++accum[currentIem['type']];
    return accum;
  }, triplets);

  const billsCount = triplets['bill'];
  const invoiceCount = triplets['invoice'];
  const customerCreditCount = triplets['customer_credit'];

  // return billsCount / bill;

  const doFactorial = (n: number) => {
    if (n === 1) return 1;
    return doFactorial(n - 1) * n;
  };

  return (
    ((doFactorial(billsCount) /
      (doFactorial(bill) * doFactorial(billsCount - bill))) *
      doFactorial(invoice)) /
    (doFactorial(invoice) * doFactorial(invoice - bill))
  );
};

howManyTripletsOf({ bill: 2, invoice: 1 }, data);
