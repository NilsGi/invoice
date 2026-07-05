(() => {
  const $ = (id) => document.getElementById(id);
  const fields = ['invoiceNumber','invoiceDate','dueDate','invoiceVatMode','reverseChargeText','sellerName','sellerAddress','sellerZipCity','sellerCountry','sellerOrg','sellerVat','contactName','contactPhone','contactEmail','paymentType','paymentNumber','buyerName','buyerOrg','buyerAddress','buyerZipCity','buyerAtt'];
  const today = new Date();
  const dateString = (date) => date.toISOString().slice(0,10);
  const plusDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
  const defaultData = () => ({
    invoiceNumber: dateString(today).slice(2).replaceAll('-',''), invoiceDate: dateString(today), dueDate: dateString(plusDays(today, 15)), invoiceVatMode: 'vat', reverseChargeText: '',
    sellerName: 'SJS Bygg AB', sellerAddress: 'Hunduddsvägen 24-26', sellerZipCity: '115 25 Stockholm', sellerCountry: 'Sverige', sellerOrg: 'Org.nr. 556872-1699', sellerVat: 'Momsreg.nr. SE556872169901',
    contactName: 'Joachim Eriksson', contactPhone: '0731-800039', contactEmail: 'sjsbygg@gmail.com', paymentType: 'Bankgiro', paymentNumber: '827-5075',
    buyerName: '', buyerOrg: '', buyerAddress: '', buyerZipCity: '', buyerAtt: '',
    rows: [
      { description: '', quantity: '', unit: '', unitPrice: '', vatRate: '25' },
      { description: 'Fakturaavgift', quantity: '1', unit: 'st', unitPrice: '25', vatRate: '0' }
    ]
  });
  const getData = () => ({ ...Object.fromEntries(fields.map((id) => [id, $(id).value])), rows: getRows() });
  const setData = (data) => { fields.forEach((id) => { if ($(id)) $(id).value = data[id] ?? ''; }); renderRows(data.rows || []); updateTotals(); };
  const getRows = () => [...document.querySelectorAll('.invoice-row')].map((el) => Object.fromEntries([...el.querySelectorAll('[data-field]')].map((input) => [input.dataset.field, input.value])));
  const renderRows = (rows) => { $('rows').innerHTML = ''; rows.forEach(addRow); };
  const addRow = (row = { description: '', quantity: '', unit: 'Tim', unitPrice: '', vatRate: $('invoiceVatMode').value === 'reverse' ? '0' : '25' }) => {
    const node = $('rowTemplate').content.firstElementChild.cloneNode(true);
    Object.entries(row).forEach(([key, value]) => { const input = node.querySelector(`[data-field="${key}"]`); if (input) input.value = value; });
    node.querySelector('[data-remove]').addEventListener('click', () => { node.remove(); updateTotals(); });
    node.querySelectorAll('input,select').forEach((input) => input.addEventListener('input', updateTotals));
    $('rows').appendChild(node);
    updateTotals();
  };
  const updateTotals = () => {
    const data = getData();
    if (data.invoiceVatMode === 'reverse') {
      document.querySelectorAll('[data-field="vatRate"]').forEach((select) => select.value = '0');
      $('reverseChargeText').placeholder = 'Omvänd skattskyldighet gäller för org.nr ...';
    }
    const totals = window.InvoiceCalc.calcTotals(getRows(), data.invoiceVatMode);
    $('netTotal').textContent = window.InvoiceCalc.money(totals.net);
    $('vatTotal').textContent = window.InvoiceCalc.money(totals.vat);
    $('rounding').textContent = window.InvoiceCalc.money(totals.rounding);
    $('grandTotal').textContent = window.InvoiceCalc.money(totals.grandTotal);
    [...document.querySelectorAll('.invoice-row')].forEach((el, i) => { el.querySelector('[data-total]').textContent = window.InvoiceCalc.money(totals.rows[i]?.total || 0); });
  };
  const refreshCustomers = () => {
    const select = $('customerSelect');
    select.innerHTML = '<option value="">Välj sparad mottagare</option>';
    window.InvoiceStorage.customers().forEach((customer, index) => select.add(new Option(customer.name, String(index))));
  };
  $('addRowBtn').addEventListener('click', () => addRow());
  $('pdfBtn').addEventListener('click', () => window.InvoicePDF.generate(getData()));
  $('saveDraftBtn').addEventListener('click', () => { window.InvoiceStorage.saveDraft(getData()); alert('Utkast sparat i denna webbläsare.'); });
  $('loadDraftBtn').addEventListener('click', () => { const draft = window.InvoiceStorage.loadDraft(); draft ? setData(draft) : alert('Inget sparat utkast hittades.'); });
  $('resetBtn').addEventListener('click', () => setData(defaultData()));
  $('invoiceVatMode').addEventListener('change', updateTotals);
  fields.forEach((id) => $(id).addEventListener('input', updateTotals));
  $('saveCustomerBtn').addEventListener('click', () => {
    const customer = { name: $('buyerName').value.trim(), org: $('buyerOrg').value, address: $('buyerAddress').value, zipCity: $('buyerZipCity').value, att: $('buyerAtt').value };
    if (!customer.name) return alert('Fyll i namn/företag först.');
    window.InvoiceStorage.saveCustomer(customer); refreshCustomers(); alert('Mottagare sparad.');
  });
  $('customerSelect').addEventListener('change', (e) => {
    const customer = window.InvoiceStorage.customers()[Number(e.target.value)];
    if (!customer) return;
    $('buyerName').value = customer.name; $('buyerOrg').value = customer.org || ''; $('buyerAddress').value = customer.address || ''; $('buyerZipCity').value = customer.zipCity || ''; $('buyerAtt').value = customer.att || '';
  });
  refreshCustomers(); setData(defaultData());
})();
