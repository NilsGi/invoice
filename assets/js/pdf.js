window.InvoicePDF = (() => {
  const { money, qty, calcTotals } = window.InvoiceCalc;
  const page = { w: 210, h: 297, margin: 7 };
  const line = (doc, y, weight = 0.25) => { doc.setLineWidth(weight); doc.line(page.margin, y, page.w - page.margin, y); };
  const textLines = (doc, text, x, y, options = {}) => {
    const { lineHeight = 5, maxWidth = 70, boldFirst = false, italic = false } = options;
    const lines = String(text || '').split('\n').filter(Boolean);
    lines.forEach((row, index) => {
      doc.setFont('helvetica', boldFirst && index === 0 ? 'bold' : italic ? 'italic' : 'normal');
      const wrapped = doc.splitTextToSize(row, maxWidth);
      wrapped.forEach((part) => { doc.text(part, x, y); y += lineHeight; });
    });
    return y;
  };
  const right = (doc, value, x, y) => doc.text(String(value), x, y, { align: 'right' });
  const formatDate = (value) => value || '';
  function generate(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const totals = calcTotals(data.rows, data.invoiceVatMode);
    doc.setTextColor(70, 70, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('Faktura', page.margin, 18);

    doc.setFontSize(5.2);
    doc.setTextColor(35, 35, 35);
    let y = 46;
    doc.setFont('helvetica', 'bold'); doc.text(data.sellerName || '', page.margin, y);
    doc.setFont('helvetica', 'italic');
    doc.text(data.sellerAddress || '', page.margin, y + 4.5);
    doc.text(data.sellerZipCity || '', page.margin, y + 9);

    const bx = 102;
    doc.setFont('helvetica', 'bold'); doc.text(data.buyerName || '', bx, y);
    doc.setFont('helvetica', 'normal');
    let by = y + 4.5;
    if (data.buyerOrg) { doc.text(data.buyerOrg, bx, by); by += 4.5; }
    doc.setFont('helvetica', 'italic');
    if (data.buyerAddress) { doc.text(data.buyerAddress, bx, by); by += 4.5; }
    if (data.buyerZipCity) { doc.text(data.buyerZipCity, bx, by); by += 4.5; }
    if (data.buyerAtt) { doc.setFont('helvetica', 'bold'); doc.text(`Att: ${data.buyerAtt}`, bx, by); }

    y = 91;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.2);
    doc.text('Fakturanummer', page.margin, y); doc.text('Fakturadatum', 102, y); doc.text('Förfallodag', 139, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.invoiceNumber || '', page.margin, y + 5);
    doc.text(formatDate(data.invoiceDate), 102, y + 5);
    doc.text(formatDate(data.dueDate), 139, y + 5);

    y = 138;
    line(doc, y, 1.1);
    y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5);
    doc.text('Beskrivning', 10, y); right(doc, 'Antal', 82, y); doc.text('Enhet', 91, y); right(doc, 'á pris', 126, y); right(doc, 'Moms', 149, y); right(doc, 'Moms kr', 176, y); right(doc, 'Total', 203, y);
    y += 4; line(doc, y, 0.1); y += 7;
    doc.setFont('helvetica', 'normal');
    totals.rows.forEach((row) => {
      const desc = doc.splitTextToSize(row.description || '', 58);
      doc.text(desc, 10, y);
      if (row.quantity) right(doc, qty(window.InvoiceCalc.parseNumber(row.quantity)), 82, y);
      doc.text(row.unit || '', 91, y);
      if (row.unitPrice) right(doc, money(window.InvoiceCalc.parseNumber(row.unitPrice)), 126, y);
      if (data.invoiceVatMode !== 'reverse' && Number(row.vatRate) > 0) right(doc, `${row.vatRate}%`, 149, y);
      if (row.vat) right(doc, money(row.vat), 176, y);
      if (row.quantity) right(doc, money(row.total), 203, y);
      y += Math.max(10, desc.length * 4.4 + 4);
      line(doc, y - 3, 0.1);
    });
    while (y < 199) { line(doc, y, 0.08); y += 10; }

    const sx = 136;
    y = 207;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.8);
    doc.text('Belopp före moms', sx, y, { align: 'right' }); right(doc, money(totals.net), 203, y);
    y += 7; doc.text('Total moms', sx, y, { align: 'right' }); right(doc, money(totals.vat), 203, y);
    y += 7; doc.text('Öresutjämning', sx, y, { align: 'right' }); right(doc, money(totals.rounding), 203, y);
    y += 8; doc.setFontSize(7); doc.text('Summa att betala', sx, y, { align: 'right' }); right(doc, money(totals.grandTotal), 203, y);

    y = 244;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5);
    if (data.invoiceVatMode === 'reverse' && data.reverseChargeText) {
      doc.text(data.reverseChargeText, page.margin, y - 5);
    }
    doc.text('Godkänd för F-skatt', page.margin, y);
    y += 2.5; line(doc, y, 0.8);

    y += 8;
    doc.setFontSize(4.2);
    doc.setFont('helvetica', 'bold'); doc.text(data.sellerName || '', page.margin, y);
    doc.text('Kontaktuppgifter', 70, y);
    doc.text('Betalningsuppgifter', 155, y);
    doc.setFont('helvetica', 'normal');
    textLines(doc, [data.sellerAddress, data.sellerZipCity, data.sellerCountry, data.sellerOrg, data.sellerVat].filter(Boolean).join('\n'), page.margin, y + 7, { lineHeight: 5, maxWidth: 55 });
    textLines(doc, [data.contactName, data.contactPhone ? `Telefon: ${data.contactPhone}` : '', data.contactEmail ? `Epost: ${data.contactEmail}` : ''].filter(Boolean).join('\n'), 70, y + 7, { lineHeight: 5, maxWidth: 60 });
    if (data.paymentType || data.paymentNumber) {
      doc.text(data.paymentType || '', 155, y + 12);
      doc.text(data.paymentNumber || '', 180, y + 12);
    }
    doc.save(`Faktura_${data.invoiceNumber || 'utkast'}.pdf`);
  }
  return { generate };
})();
