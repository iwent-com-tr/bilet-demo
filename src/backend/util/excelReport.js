const ExcelJS = require('exceljs');
const moment = require('moment');

class ExcelReportGenerator {
  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'Bilet Demo Platform';
    this.workbook.created = new Date();
  }

  async generateEventReport(event, tickets, stats, organizer) {
    try {
      // Özet sayfası
      const summarySheet = this.workbook.addWorksheet('Özet Rapor');
      this.createSummarySheet(summarySheet, event, stats, organizer);

      // Bilet detayları sayfası
      const ticketsSheet = this.workbook.addWorksheet('Bilet Detayları');
      this.createTicketsSheet(ticketsSheet, tickets);

      // Satış analizi sayfası
      const salesSheet = this.workbook.addWorksheet('Satış Analizi');
      this.createSalesAnalysisSheet(salesSheet, stats);

      // Zaman analizi sayfası
      const timeSheet = this.workbook.addWorksheet('Zaman Analizi');
      this.createTimeAnalysisSheet(timeSheet, tickets);

      return this.workbook;
    } catch (error) {
      console.error('Excel rapor oluşturma hatası:', error);
      throw new Error(`Rapor oluşturulurken bir hata oluştu: ${error.message}`);
    }
  }

  createSummarySheet(sheet, event, stats, organizer) {
    // Başlık ve stil ayarları
    sheet.getCell('A1').value = 'ETKİNLİK RAPORU';
    sheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF05EF7E' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.mergeCells('A1:F1');

    // Etkinlik bilgileri
    sheet.getCell('A3').value = 'ETKİNLİK BİLGİLERİ';
    sheet.getCell('A3').font = { size: 14, bold: true, color: { argb: 'FF333333' } };
    sheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    sheet.mergeCells('A3:F3');

    const eventInfo = [
      ['Etkinlik Adı:', event.ad],
      ['Kategori:', event.kategori],
      ['Tarih:', moment(event.baslangic_tarih).format('DD.MM.YYYY HH:mm')],
      ['Bitiş:', moment(event.bitis_tarih).format('DD.MM.YYYY HH:mm')],
      ['Mekan:', event.yer],
      ['Şehir:', event.il],
      ['Organizatör:', `${organizer.isim} ${organizer.soyisim}`],
      ['Şirket:', organizer.sirket || 'Belirtilmemiş'],
      ['Durum:', event.durum.toUpperCase()]
    ];

    eventInfo.forEach((info, index) => {
      const row = index + 4;
      sheet.getCell(`A${row}`).value = info[0];
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`B${row}`).value = info[1];
    });

    // İstatistikler
    sheet.getCell('A14').value = 'SATIŞ İSTATİSTİKLERİ';
    sheet.getCell('A14').font = { size: 14, bold: true, color: { argb: 'FF333333' } };
    sheet.getCell('A14').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    sheet.mergeCells('A14:C14');

    const salesStats = [
      ['Toplam Bilet Satışı:', stats.toplam_bilet],
      ['Kullanılan Bilet:', stats.kullanilan_bilet],
      ['İptal Edilen Bilet:', stats.iptal_edilen],
      ['Aktif Bilet:', stats.toplam_bilet - stats.kullanilan_bilet - stats.iptal_edilen],
      ['Toplam Gelir:', `${stats.toplam_kazanc.toLocaleString('tr-TR')} TL`],
      ['Kullanım Oranı:', `${((stats.kullanilan_bilet / stats.toplam_bilet) * 100).toFixed(1)}%`]
    ];

    salesStats.forEach((stat, index) => {
      const row = index + 15;
      sheet.getCell(`A${row}`).value = stat[0];
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`B${row}`).value = stat[1];
      
      if (index === 4) { // Gelir satırı
        sheet.getCell(`B${row}`).font = { bold: true, color: { argb: 'FF05EF7E' } };
      }
    });

    // Bilet tipi analizi
    sheet.getCell('E14').value = 'BİLET TİPLERİ';
    sheet.getCell('E14').font = { size: 14, bold: true, color: { argb: 'FF333333' } };
    sheet.getCell('E14').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    sheet.mergeCells('E14:G14');

    // Başlık satırı
    sheet.getCell('E15').value = 'Tip';
    sheet.getCell('F15').value = 'Adet';
    sheet.getCell('G15').value = 'Gelir';
    ['E15', 'F15', 'G15'].forEach(cell => {
      sheet.getCell(cell).font = { bold: true };
      sheet.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
    });

    let row = 16;
    Object.entries(stats.bilet_tipleri).forEach(([tip, data]) => {
      sheet.getCell(`E${row}`).value = tip;
      sheet.getCell(`F${row}`).value = data.adet;
      sheet.getCell(`G${row}`).value = `${data.kazanc.toLocaleString('tr-TR')} TL`;
      row++;
    });

    // Sütun genişlikleri
    sheet.getColumn('A').width = 20;
    sheet.getColumn('B').width = 25;
    sheet.getColumn('C').width = 5;
    sheet.getColumn('D').width = 5;
    sheet.getColumn('E').width = 15;
    sheet.getColumn('F').width = 10;
    sheet.getColumn('G').width = 15;
  }

  createTicketsSheet(sheet, tickets) {
    // Başlık
    sheet.getCell('A1').value = 'BİLET DETAYLARI';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF05EF7E' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.mergeCells('A1:I1');

    // Tablo başlıkları
    const headers = [
      'Bilet ID',
      'Müşteri',
      'Email',
      'Bilet Tipi',
      'Fiyat',
      'Durum',
      'Satın Alma',
      'Giriş Zamanı',
      'Gişe/Cihaz'
    ];

    headers.forEach((header, index) => {
      const column = String.fromCharCode(65 + index); // A, B, C, ...
      sheet.getCell(`${column}3`).value = header;
      sheet.getCell(`${column}3`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getCell(`${column}3`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF05EF7E' } };
      sheet.getCell(`${column}3`).alignment = { horizontal: 'center' };
    });

    // Bilet verileri
    tickets.forEach((ticket, index) => {
      const row = index + 4;
      sheet.getCell(`A${row}`).value = ticket.id.substring(0, 8);
      sheet.getCell(`B${row}`).value = ticket.User ? `${ticket.User.isim} ${ticket.User.soyisim}` : 'Bilinmeyen';
      sheet.getCell(`C${row}`).value = ticket.User ? ticket.User.email : 'Bilinmeyen';
      sheet.getCell(`D${row}`).value = ticket.bilet_tipi;
      sheet.getCell(`E${row}`).value = `${parseFloat(ticket.fiyat).toLocaleString('tr-TR')} TL`;
      sheet.getCell(`F${row}`).value = ticket.durum.toUpperCase();
      sheet.getCell(`G${row}`).value = moment(ticket.createdAt).format('DD.MM.YYYY HH:mm');
      sheet.getCell(`H${row}`).value = ticket.giris_zamani ? moment(ticket.giris_zamani).format('DD.MM.YYYY HH:mm') : '-';
      sheet.getCell(`I${row}`).value = ticket.gise || ticket.cihaz_id || '-';

      // Durum renkli kodlama
      const statusCell = sheet.getCell(`F${row}`);
      switch (ticket.durum) {
        case 'aktif':
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
          statusCell.font = { color: { argb: 'FF1976D2' } };
          break;
        case 'kullanildi':
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
          statusCell.font = { color: { argb: 'FF2E7D32' } };
          break;
        case 'iptal':
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
          statusCell.font = { color: { argb: 'FFC62828' } };
          break;
      }
    });

    // Sütun genişlikleri
    const columnWidths = [15, 20, 25, 15, 12, 12, 18, 18, 15];
    columnWidths.forEach((width, index) => {
      const column = String.fromCharCode(65 + index);
      sheet.getColumn(column).width = width;
    });

    // Tablo kenarlıkları
    if (tickets.length > 0) {
      const startRow = 3;
      const endRow = tickets.length + 3;
      const startCol = 1; // A
      const endCol = 9; // I
      
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const cell = sheet.getCell(row, col);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      }
    }
  }

  createSalesAnalysisSheet(sheet, stats) {
    sheet.getCell('A1').value = 'SATIŞ ANALİZİ';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF05EF7E' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.mergeCells('A1:E1');

    // Bilet tipi performans tablosu
    sheet.getCell('A3').value = 'Bilet Tipi';
    sheet.getCell('B3').value = 'Satılan Adet';
    sheet.getCell('C3').value = 'Kullanılan';
    sheet.getCell('D3').value = 'Gelir (TL)';
    sheet.getCell('E3').value = 'Kullanım Oranı';

    ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell => {
      sheet.getCell(cell).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF05EF7E' } };
    });

    let row = 4;
    Object.entries(stats.bilet_tipleri).forEach(([tip, data]) => {
      sheet.getCell(`A${row}`).value = tip;
      sheet.getCell(`B${row}`).value = data.adet;
      sheet.getCell(`C${row}`).value = data.kullanilan || 0;
      sheet.getCell(`D${row}`).value = parseFloat(data.kazanc).toLocaleString('tr-TR');
      const usageRate = data.adet > 0 ? ((data.kullanilan || 0) / data.adet * 100).toFixed(1) : 0;
      sheet.getCell(`E${row}`).value = `${usageRate}%`;
      row++;
    });

    // Sütun genişlikleri
    [20, 15, 15, 15, 15].forEach((width, index) => {
      const column = String.fromCharCode(65 + index);
      sheet.getColumn(column).width = width;
    });
  }

  createTimeAnalysisSheet(sheet, tickets) {
    sheet.getCell('A1').value = 'ZAMAN ANALİZİ';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF05EF7E' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.mergeCells('A1:D1');

    // Günlük satış analizi
    const dailySales = {};
    tickets.forEach(ticket => {
      const date = moment(ticket.createdAt).format('YYYY-MM-DD');
      if (!dailySales[date]) {
        dailySales[date] = { count: 0, revenue: 0 };
      }
      dailySales[date].count++;
      dailySales[date].revenue += parseFloat(ticket.fiyat);
    });

    // Günlük satış tablosu
    sheet.getCell('A3').value = 'Tarih';
    sheet.getCell('B3').value = 'Satış Adedi';
    sheet.getCell('C3').value = 'Günlük Gelir';
    sheet.getCell('D3').value = 'Gün';

    ['A3', 'B3', 'C3', 'D3'].forEach(cell => {
      sheet.getCell(cell).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF05EF7E' } };
    });

    let row = 4;
    Object.entries(dailySales)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, data]) => {
        sheet.getCell(`A${row}`).value = moment(date).format('DD.MM.YYYY');
        sheet.getCell(`B${row}`).value = data.count;
        sheet.getCell(`C${row}`).value = `${data.revenue.toLocaleString('tr-TR')} TL`;
        sheet.getCell(`D${row}`).value = moment(date).format('dddd');
        row++;
      });

    // Sütun genişlikleri
    [15, 15, 15, 15].forEach((width, index) => {
      const column = String.fromCharCode(65 + index);
      sheet.getColumn(column).width = width;
    });
  }
}

module.exports = { ExcelReportGenerator };