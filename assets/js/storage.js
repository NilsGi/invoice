window.InvoiceStorage = (() => {
  const keys = { draft: 'faktura-app-draft', customers: 'faktura-app-customers' };
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const saveDraft = (data) => write(keys.draft, data);
  const loadDraft = () => read(keys.draft, null);
  const customers = () => read(keys.customers, []);
  const saveCustomer = (customer) => {
    const list = customers().filter((item) => item.name !== customer.name);
    list.push(customer);
    list.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
    write(keys.customers, list);
    return list;
  };
  return { saveDraft, loadDraft, customers, saveCustomer };
})();
