import { Request, Response, NextFunction } from 'express';
import { AdminEventService } from './event.service';
import ExcelJS from 'exceljs';

export class AdminEventController {
  async listEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminEventService.listEvents(req.query);
      res.json(result);
    } catch (e) { next(e); }
  }

  async getEventById(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await AdminEventService.getEventById(req.params.id);
      res.json(event);
    } catch (e) { next(e); }
  }

  async getEventStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminEventService.getStats(req.params.id);
      res.json(stats);
    } catch (e) { next(e); }
  }

  async exportEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const rows = await AdminEventService.exportEvents(req.query);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Events');
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Name', key: 'name', width: 28 },
        { header: 'Category', key: 'category', width: 16 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'City', key: 'city', width: 16 },
        { header: 'Venue', key: 'venue', width: 24 },
        { header: 'Start Date', key: 'startDate', width: 22 },
        { header: 'End Date', key: 'endDate', width: 22 },
        { header: 'Organizer', key: 'organizerCompany', width: 24 },
        { header: 'Sold Tickets', key: 'soldTickets', width: 14 },
        { header: 'Used Entries', key: 'usedEntries', width: 14 },
        { header: 'Revenue', key: 'revenue', width: 18 },
        { header: 'Created At', key: 'createdAt', width: 22 },
      ];
      rows.forEach((row: any) => worksheet.addRow(row));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').slice(0, -5);
      const filename = `events_${timestamp}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (e) { next(e); }
  }
}

export default new AdminEventController();

