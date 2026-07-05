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
    doc.setFontSize(11);
    doc.text(title, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let yy = y + 6.5;
    lines.filter(Boolean).forEach((row) => {
      const wrapped = doc.splitTextToSize(row, width);
      doc.text(wrapped, x, yy);
      yy += Math.max(5.5, wrapped.length * 5.5);
    });
  };

  function generate(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const rows = sortRows(data.rows || []);
    const totals = calcTotals(rows, data.invoiceVatMode);

    doc.setTextColor(35, 35, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.text('Faktura', page.margin, 20);

    // Avsändare och mottagare
    let y = 43;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(data.sellerName || '', page.margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11.5);
    doc.text(data.sellerAddress || '', page.margin, y + 7);
    doc.text(data.sellerZipCity || '', page.margin, y + 14);

    const bx = 105;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(data.buyerName || '', bx, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11.5);
    let by = y + 7;
    if (data.buyerOrg) { doc.text(data.buyerOrg, bx, by); by += 7; }
    if (data.buyerAddress) { doc.text(data.buyerAddress, bx, by); by += 7; }
    if (data.buyerZipCity) { doc.text(data.buyerZipCity, bx, by); by += 7; }
    if (data.buyerAtt) { doc.setFont('helvetica', 'bold'); doc.text(`Att: ${data.buyerAtt}`, bx, by); }

    // Fakturainfo
    y = 83;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text('Fakturanummer', page.margin, y);
    doc.text('Fakturadatum', 82, y);
    doc.text('Förfallodag', 142, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(data.invoiceNumber || '', page.margin, y + 8);
    doc.text(dateSv(data.invoiceDate), 82, y + 8);
    doc.text(dateSv(data.dueDate), 142, y + 8);

    // Tabell - fasta kolumner så text och belopp inte krockar.
    y = 113;
    line(doc, y, 0.75);
    y += 8.5;

    const col = {
      desc: page.margin,
      qty: 76,
      unit: 86,
      price: 114,
      vatRate: 136,
      vatKr: 164,
      total: 198
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Beskrivning', col.desc, y);
    right(doc, 'Antal', col.qty, y);
    doc.text('Enhet', col.unit, y);
    right(doc, 'á pris', col.price, y);
    right(doc, 'Moms', col.vatRate, y);
    right(doc, 'Moms kr', col.vatKr, y);
    right(doc, 'Totalt', col.total, y);

    y += 4.8;
    line(doc, y, 0.25);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.4);

    totals.rows.forEach((row) => {
      const descLines = doc.splitTextToSize(row.description || '', 60);
      const rowStartY = y;

      doc.text(descLines, col.desc, rowStartY);

      if (parseNumber(row.quantity)) right(doc, qty(parseNumber(row.quantity)), col.qty, rowStartY);
      doc.text(row.unit || '', col.unit, rowStartY);

      if (parseNumber(row.unitPrice)) right(doc, money(parseNumber(row.unitPrice)), col.price, rowStartY);

      if (data.invoiceVatMode !== 'reverse' && Number(row.vatRate) > 0) {
        right(doc, `${row.vatRate}%`, col.vatRate, rowStartY);
        right(doc, money(row.vat), col.vatKr, rowStartY);
      }

      if (parseNumber(row.quantity)) {
        doc.setFont('helvetica', 'bold');
        right(doc, money(row.total), col.total, rowStartY);
        doc.setFont('helvetica', 'normal');
      }

      // Inga tunna rader mellan fakturaraderna – de hamnade visuellt över texten.
      y += Math.max(8.5, descLines.length * 5.4 + 3.5);
    });

    y += 2.5;
    line(doc, y, 0.35);

    // Totalruta - tydlig högerkolumn med samma högerkant som tabellen.
    y = Math.max(y + 12, 185);
    if (y > 216) y = 216;

    const labelX = 145;
    const valueX = 198;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Belopp före moms', labelX, y, { align: 'right' });
    right(doc, money(totals.net), valueX, y);

    y += 7.5;
    doc.text('Total moms', labelX, y, { align: 'right' });
    right(doc, money(totals.vat), valueX, y);

    y += 7.5;
    doc.text('Öresutjämning', labelX, y, { align: 'right' });
    right(doc, money(totals.rounding), valueX, y);

    y += 5;
    doc.setLineWidth(0.35);
    doc.line(112, y, valueX, y);

    y += 9;
    doc.setFontSize(13.5);
    doc.text('Summa att betala', labelX, y, { align: 'right' });
    doc.setFontSize(14.5);
    right(doc, money(totals.grandTotal), valueX, y);

    // Meddelande och footer
    y = 242;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (data.invoiceVatMode === 'reverse' && data.reverseChargeText) {
      y = wrappedText(doc, data.reverseChargeText, page.margin, y - 8, 170, 5.5);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Godkänd för F-skatt', page.margin, y);
    y += 5;
    line(doc, y, 0.55);

    y += 9;
    footerBlock(doc, data.sellerName || '', [data.sellerAddress, data.sellerZipCity, data.sellerCountry, data.sellerOrg, data.sellerVat], page.margin, y, 54);
    footerBlock(doc, 'Kontaktuppgifter', [data.contactName, data.contactPhone ? `Telefon: ${data.contactPhone}` : '', data.contactEmail ? `Epost: ${data.contactEmail}` : ''], 76, y, 60);
    footerBlock(doc, 'Betalningsuppgifter', [data.paymentType && data.paymentNumber ? `${data.paymentType} ${data.paymentNumber}` : data.paymentType || data.paymentNumber], 150, y, 48);

    doc.save(`Faktura_${data.invoiceNumber || 'utkast'}.pdf`);
  }

  return { generate, sortRows };
})();
