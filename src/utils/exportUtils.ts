import { jsPDF } from 'jspdf';
import { KISS_COLUMNS, PROFILES, THEMES } from '../types/workshop.ts';
import type { NoteItem, ThemeConfig } from '../types/workshop.ts';

function csvEscape(value: string | number | boolean): string {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

export function exportWorkshopCSV(notes: NoteItem[]): void {
  const headers = [
    'Thématique',
    'Colonne KISS',
    'Profil',
    'Auteur',
    'Pré-rempli',
    'Contenu',
    'Votes (+1)',
  ];

  const rows: string[] = [headers.map(csvEscape).join(';')];

  for (const theme of THEMES) {
    for (const col of KISS_COLUMNS) {
      const colNotes = notes
        .filter((n) => n.themeId === theme.id && n.column === col.id)
        .sort((a, b) => b.voterIds.length - a.voterIds.length || a.createdAt - b.createdAt);

      for (const note of colNotes) {
        rows.push(
          [
            `${theme.tabLabel} — ${theme.title}`,
            col.label,
            PROFILES[note.profile].label,
            note.isPreFilled ? 'Pré-rempli' : note.authorName,
            note.isPreFilled ? 'Oui' : 'Non',
            note.text,
            note.voterIds.length,
          ]
            .map(csvEscape)
            .join(';'),
        );
      }
    }
  }

  const bom = '\uFEFF';
  const blob = new Blob([bom + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `atelier-rex-innovcamp26-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function drawThemePage(doc: jsPDF, theme: ThemeConfig, themeNotes: NoteItem[], isFirstPage: boolean) {
  if (!isFirstPage) {
    doc.addPage('a4', 'landscape');
  }

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm

  // Warm cream background
  doc.setFillColor(245, 242, 230);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Theme header banner
  const [hr, hg, hb] = hexToRgb(theme.color);
  doc.setFillColor(hr, hg, hb);
  doc.rect(0, 0, pageWidth, 28, 'F');

  const isLightHeader = theme.id === 'apports';
  const headerTextRgb: [number, number, number] = isLightHeader ? [34, 33, 28] : [255, 255, 255];

  doc.setTextColor(...headerTextRgb);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`ATELIER REX · INNOV'CAMP 26 · ${theme.tabLabel}`, 12, 9);

  doc.setFontSize(17);
  doc.text(theme.title, 12, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(theme.definition, 12, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${themeNotes.length} post-its`, pageWidth - 12, 18, { align: 'right' });

  // 4 KISS Columns
  const marginX = 10;
  const gap = 4;
  const colWidth = (pageWidth - marginX * 2 - gap * 3) / 4;
  const startY = 33;
  const colHeight = pageHeight - startY - 14;

  KISS_COLUMNS.forEach((col, colIndex) => {
    const x = marginX + colIndex * (colWidth + gap);

    // White column card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, startY, colWidth, colHeight, 3, 3, 'F');

    // Column title
    doc.setTextColor(0, 50, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${col.label} (${col.shortAction})`, x + 3.5, startY + 7);

    doc.setTextColor(94, 91, 82);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const descLines = doc.splitTextToSize(col.description, colWidth - 7);
    doc.text(descLines, x + 3.5, startY + 11.5);

    // Divider line
    doc.setDrawColor(230, 226, 214);
    doc.line(x + 3, startY + 17, x + colWidth - 3, startY + 17);

    const colNotes = themeNotes
      .filter((n) => n.column === col.id)
      .sort((a, b) => b.voterIds.length - a.voterIds.length || a.createdAt - b.createdAt);

    let cursorY = startY + 20;
    const maxY = startY + colHeight - 4;

    for (const note of colNotes) {
      const textWidth = colWidth - 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      const lines: string[] = doc.splitTextToSize(note.text, textWidth);
      const cardHeight = Math.max(12, lines.length * 3.4 + 6.5);

      if (cursorY + cardHeight > maxY) {
        doc.setTextColor(94, 91, 82);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.text('+ autres post-its dans le CSV', x + 3.5, maxY - 1);
        break;
      }

      const [nr, ng, nb] = hexToRgb(PROFILES[note.profile].color);
      doc.setFillColor(nr, ng, nb);
      doc.roundedRect(x + 2.5, cursorY, colWidth - 5, cardHeight, 1.8, 1.8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.text(lines, x + 4.5, cursorY + 4.5);

      // Footer of post-it: author / pre-filled + votes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const metaLeft = note.isPreFilled ? 'Pré-rempli' : note.authorName;
      const metaRight = note.voterIds.length > 0 ? `+${note.voterIds.length}` : '';
      doc.text(metaLeft, x + 4.5, cursorY + cardHeight - 2);
      if (metaRight) {
        doc.setFont('helvetica', 'bold');
        doc.text(metaRight, x + colWidth - 4.5, cursorY + cardHeight - 2, { align: 'right' });
      }

      cursorY += cardHeight + 2.2;
    }
  });

  // Footer legend
  const footerY = pageHeight - 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(94, 91, 82);
  doc.text('Légende :', 10, footerY);

  let lx = 28;
  (['coach', 'participant', 'groupama'] as const).forEach((profileId) => {
    const p = PROFILES[profileId];
    const [pr, pg, pb] = hexToRgb(p.color);
    doc.setFillColor(pr, pg, pb);
    doc.circle(lx, footerY - 1, 1.8, 'F');
    doc.setTextColor(34, 33, 28);
    doc.text(p.label, lx + 3.5, footerY);
    lx += 48;
  });

  doc.setTextColor(94, 91, 82);
  doc.text(
    `Atelier REX — Innov'Camp 26 (Groupama × Onepoint) · Page ${theme.number}/3`,
    pageWidth - 10,
    footerY,
    { align: 'right' },
  );
}

export function exportWorkshopPDF(notes: NoteItem[]): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  THEMES.forEach((theme, index) => {
    const themeNotes = notes.filter((n) => n.themeId === theme.id);
    drawThemePage(doc, theme, themeNotes, index === 0);
  });

  doc.save(`atelier-rex-innovcamp26-${new Date().toISOString().slice(0, 10)}.pdf`);
}
