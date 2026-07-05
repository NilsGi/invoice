window.InvoiceCalc = (() => {
  const parseNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const normalized = String(value).replace(/\s/g, '').replace(',', '.');
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  };
  const money = (value) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(value);
  const qty = (value) => new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value);
  const calcRow = (row, vatMode = 'vat') => {
    const quantity = parseNumber(row.quantity);
    const unitPrice = parseNumber(row.unitPrice);
    const vatRate = vatMode === 'reverse' ? 0 : parseNumber(row.vatRate) / 100;
    const net = quantity * unitPrice;
    const vat = net * vatRate;
    return { net, vat, total: net + vat };
  };
  const calcTotals = (rows, vatMode = 'vat') => {
    const calculated = rows.map((row) => ({ ...row, ...calcRow(row, vatMode) }));
    const net = calculated.reduce((sum, row) => sum + row.net, 0);
    const vat = calculated.reduce((sum, row) => sum + row.vat, 0);
    const beforeRounding = net + vat;
    const grandTotal = Math.round(beforeRounding);
    const rounding = grandTotal - beforeRounding;
    return { rows: calculated, net, vat, rounding, grandTotal };
  };
  return { parseNumber, money, qty, calcRow, calcTotals };
})();
