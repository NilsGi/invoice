window.InvoicePDF = (() => {
  const { money, qty, calcTotals, parseNumber } = window.InvoiceCalc;

  const page = { w: 210, h: 297, margin: 12 };

  const isFeeRow = (row) => String(row?.description || '').trim().toLowerCase() === 'fakturaavgift';
  const sortRows = (rows = []) => {
    const normal = rows.filter((row) => !isFeeRow(row));
    const fees = rows.filter(isFeeRow);
    return [...normal, ...fees];
  };

  const line = (doc, y, weight = 0.25) => {
    doc.setLineWidth(weight);
    doc.line(page.margin, y, page.w - page.margin, y);
  };

  const right = (doc, value, x, y) => doc.text(String(value), x, y, { align: 'right' });

  const dateSv = (value) => {
    if (!value) return '';
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('sv-SE');
  };

  const wrappedText = (doc, text, x, y, maxWidth, lineHeight = 5.2) => {
    const lines = doc.splitTextToSize(String(text || ''), maxWidth);
    doc.text(lines, x, y);
    return y + Math.max(lineHeight, lines.length * lineHeight);
  };

  const footerBlock = (doc, title, lines, x, y, width) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(title, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    let yy = y + 6;
    lines.filter(Boolean).forEach((row) => {
      const wrapped = doc.splitTextToSize(row, width);
      doc.text(wrapped, x, yy);
      yy += Math.max(5, wrapped.length * 5);
    });
  };

  function generate(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const rows = sortRows(data.rows || []);
    const totals = calcTotals(rows, data.invoiceVatMode);

    doc.setTextColor(35, 35, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('Faktura', page.margin, 20);

    // Avsändare och mottagare
    let y = 43;
    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    doc.text(data.sellerName || '', page.margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text(data.sellerAddress || '', page.margin, y + 6);
    doc.text(data.sellerZipCity || '', page.margin, y + 12);

    const bx = 105;
    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    doc.text(data.buyerName || '', bx, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    let by = y + 6;
    if (data.buyerOrg) { doc.text(data.buyerOrg, bx, by); by += 6; }
    if (data.buyerAddress) { doc.text(data.buyerAddress, bx, by); by += 6; }
    if (data.buyerZipCity) { doc.text(data.buyerZipCity, bx, by); by += 6; }
    if (data.buyerAtt) { doc.setFont('helvetica', 'bold'); doc.text(`Att: ${data.buyerAtt}`, bx, by); }

    // Fakturainfo
    y = 83;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Fakturanummer', page.margin, y);
    doc.text('Fakturadatum', 82, y);
    doc.text('Förfallodag', 142, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(data.invoiceNumber || '', page.margin, y + 7);
    doc.text(dateSv(data.invoiceDate), 82, y + 7);
    doc.text(dateSv(data.dueDate), 142, y + 7);

    // Tabell
    y = 113;
    line(doc, y, 0.7);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Beskrivning', page.margin, y);
    right(doc, 'Antal', 84, y);
    doc.text('Enhet', 89, y);
    right(doc, 'á pris', 126, y);
    right(doc, 'Moms', 149, y);
    right(doc, 'Moms kr', 176, y);
    right(doc, 'Total', 198, y);
    y += 4;
    line(doc, y, 0.2);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.8);
    totals.rows.forEach((row) => {
      const descLines = doc.splitTextToSize(row.description || '', 58);
      doc.text(descLines, page.margin, y);
      if (row.quantity) right(doc, qty(parseNumber(row.quantity)), 84, y);
      doc.text(row.unit || '', 89, y);
      if (row.unitPrice) right(doc, money(parseNumber(row.unitPrice)), 126, y);
      if (data.invoiceVatMode !== 'reverse' && Number(row.vatRate) > 0) right(doc, `${row.vatRate}%`, 149, y);
      if (row.vat) right(doc, money(row.vat), 176, y);
      if (row.quantity) right(doc, money(row.total), 198, y);
      y += Math.max(8, descLines.length * 5.2 + 3);
      line(doc, y - 2, 0.12);
    });

    // Om det finns många rader, låt totalsumman börja där det finns plats.
    y = Math.max(y + 7, 188);
    if (y > 215) y = 215;

    const sx = 140;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.3);
    doc.text('Belopp före moms', sx, y, { align: 'right' }); right(doc, money(totals.net), 198, y);
    y += 7;
    doc.text('Total moms', sx, y, { align: 'right' }); right(doc, money(totals.vat), 198, y);
    y += 7;
    doc.text('Öresutjämning', sx, y, { align: 'right' }); right(doc, money(totals.rounding), 198, y);
    y += 9;
    doc.setFontSize(12.5);
    doc.text('Summa att betala', sx, y, { align: 'right' }); right(doc, money(totals.grandTotal), 198, y);

    // Meddelande och footer
    y = 242;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    if (data.invoiceVatMode === 'reverse' && data.reverseChargeText) {
      y = wrappedText(doc, data.reverseChargeText, page.margin, y - 8, 170, 5.3);
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Godkänd för F-skatt', page.margin, y);
    y += 4;
    line(doc, y, 0.55);

    y += 9;
    footerBlock(doc, data.sellerName || '', [data.sellerAddress, data.sellerZipCity, data.sellerCountry, data.sellerOrg, data.sellerVat], page.margin, y, 54);
    footerBlock(doc, 'Kontaktuppgifter', [data.contactName, data.contactPhone ? `Telefon: ${data.contactPhone}` : '', data.contactEmail ? `Epost: ${data.contactEmail}` : ''], 76, y, 60);
    footerBlock(doc, 'Betalningsuppgifter', [data.paymentType && data.paymentNumber ? `${data.paymentType} ${data.paymentNumber}` : data.paymentType || data.paymentNumber], 150, y, 48);

    doc.save(`Faktura_${data.invoiceNumber || 'utkast'}.pdf`);
  }

  return { generate, sortRows };
})();
