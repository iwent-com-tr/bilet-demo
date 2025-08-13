import ExcelJS from 'exceljs';

interface Event {
  id: string;
  name: string;
  category: string;
  startDate: Date;
  endDate: Date;
  venue: string;
  city: string;
  status: string;
}

interface Organizer {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  phone?: string;
}

interface Ticket {
  id: string;
  type: string;
  price: number;
  status: string;
  purchaseDate: Date;
  entryTime?: Date;
  userId: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

interface TicketTypeStats {
  type: string;
  count: number;
  used: number;
  cancelled: number;
  revenue: number;
  averagePrice: number;
}

interface EventStats {
  totalTickets: number;
  usedTickets: number;
  cancelledTickets: number;
  totalRevenue: number;
  averagePrice: number;
  ticketTypeBreakdown: TicketTypeStats[];
  salesOverTime: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  usageStats: {
    usagePercentage: number;
    remainingTickets: number;
    peakEntryTime?: string;
  };
}

export class ExcelReportGenerator {
  private workbook: ExcelJS.Workbook;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'Bilet Demo Platform';
    this.workbook.created = new Date();
  }

  async generateEventReport(event: Event, tickets: Ticket[], stats: EventStats, organizer: Organizer): Promise<ExcelJS.Workbook> {
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
      throw new Error(`Rapor oluşturulurken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  }

  private createSummarySheet(sheet: ExcelJS.Worksheet, event: Event, stats: EventStats, organizer: Organizer): void {
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
      ['Etkinlik Adı:', event.name],
      ['Kategori:', event.category],
      ['Tarih:', new Date(event.startDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
      ['Bitiş:', new Date(event.endDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
      ['Mekan:', event.venue],
      ['Şehir:', event.city],
      ['Organizatör:', `${organizer.firstName} ${organizer.lastName}`],
      ['Şirket:', organizer.company || 'Belirtilmemiş'],
      ['Durum:', event.status.toUpperCase()]
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
      ['Toplam Bilet Satışı:', stats.totalTickets],
      ['Kullanılan Bilet:', stats.usedTickets],
      ['İptal Edilen Bilet:', stats.cancelledTickets],
      ['Aktif Bilet:', stats.totalTickets - stats.usedTickets - stats.cancelledTickets],
      ['Toplam Gelir:', `${stats.totalRevenue.toLocaleString('tr-TR')} TL`],
      ['Kullanım Oranı:', `${stats.usageStats.usagePercentage.toFixed(1)}%`]
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
    stats.ticketTypeBreakdown.forEach((ticketType) => {
      sheet.getCell(`E${row}`).value = ticketType.type;
      sheet.getCell(`F${row}`).value = ticketType.count;
      sheet.getCell(`G${row}`).value = `${ticketType.revenue.toLocaleString('tr-TR')} TL`;
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

  private createTicketsSheet(sheet: ExcelJS.Worksheet, tickets: Ticket[]): void {
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
      'Telefon'
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
      sheet.getCell(`B${row}`).value = ticket.user ? `${ticket.user.firstName} ${ticket.user.lastName}` : 'Bilinmeyen';
      sheet.getCell(`C${row}`).value = ticket.user ? ticket.user.email : 'Bilinmeyen';
      sheet.getCell(`D${row}`).value = ticket.type;
      sheet.getCell(`E${row}`).value = `${ticket.price.toLocaleString('tr-TR')} TL`;
      sheet.getCell(`F${row}`).value = ticket.status.toUpperCase();
      sheet.getCell(`G${row}`).value = new Date(ticket.purchaseDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      sheet.getCell(`H${row}`).value = ticket.entryTime ? new Date(ticket.entryTime).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
      sheet.getCell(`I${row}`).value = ticket.user?.phone || '-';

      // Durum renkli kodlama
      const statusCell = sheet.getCell(`F${row}`);
      switch (ticket.status.toLowerCase()) {
        case 'active':
        case 'aktif':
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
          statusCell.font = { color: { argb: 'FF1976D2' } };
          break;
        case 'used':
        case 'kullanildi':
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
          statusCell.font = { color: { argb: 'FF2E7D32' } };
          break;
        case 'cancelled':
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

  private createSalesAnalysisSheet(sheet: ExcelJS.Worksheet, stats: EventStats): void {
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
    stats.ticketTypeBreakdown.forEach((ticketType) => {
      sheet.getCell(`A${row}`).value = ticketType.type;
      sheet.getCell(`B${row}`).value = ticketType.count;
      sheet.getCell(`C${row}`).value = ticketType.used || 0;
      sheet.getCell(`D${row}`).value = ticketType.revenue.toLocaleString('tr-TR');
      const usageRate = ticketType.count > 0 ? ((ticketType.used || 0) / ticketType.count * 100).toFixed(1) : '0';
      sheet.getCell(`E${row}`).value = `${usageRate}%`;
      row++;
    });

    // Sütun genişlikleri
    [20, 15, 15, 15, 15].forEach((width, index) => {
      const column = String.fromCharCode(65 + index);
      sheet.getColumn(column).width = width;
    });
  }

  private createTimeAnalysisSheet(sheet: ExcelJS.Worksheet, tickets: Ticket[]): void {
    sheet.getCell('A1').value = 'ZAMAN ANALİZİ';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF05EF7E' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.mergeCells('A1:D1');

    // Günlük satış analizi
    const dailySales: { [key: string]: { count: number; revenue: number } } = {};
    tickets.forEach(ticket => {
      const date = new Date(ticket.purchaseDate).toISOString().split('T')[0];
      if (!dailySales[date]) {
        dailySales[date] = { count: 0, revenue: 0 };
      }
      dailySales[date].count++;
      dailySales[date].revenue += ticket.price;
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
        const dateObj = new Date(date);
        sheet.getCell(`A${row}`).value = dateObj.toLocaleDateString('tr-TR');
        sheet.getCell(`B${row}`).value = data.count;
        sheet.getCell(`C${row}`).value = `${data.revenue.toLocaleString('tr-TR')} TL`;
        sheet.getCell(`D${row}`).value = dateObj.toLocaleDateString('tr-TR', { weekday: 'long' });
        row++;
      });

    // Sütun genişlikleri
    [15, 15, 15, 15].forEach((width, index) => {
      const column = String.fromCharCode(65 + index);
      sheet.getColumn(column).width = width;
    });
  }
}
