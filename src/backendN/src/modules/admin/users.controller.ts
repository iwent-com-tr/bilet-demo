import { Request, Response, NextFunction } from 'express';
import { AdminUserService } from './users.service';
import ExcelJS from 'exceljs';

export class AdminUsersController {
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminUserService.listUsers(req.query);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = (req as any).auth;
      const user = await AdminUserService.getUserById(req.params.id, authUser);
      res.json(user);
    } catch (e) {
      next(e);
    }
  }

  async exportUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await AdminUserService.exportUsers(req.query);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: 'First Name', key: 'firstName', width: 20 },
        { header: 'Last Name', key: 'lastName', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 20 },
        { header: 'User Type', key: 'userType', width: 15 },
        { header: 'Role', key: 'adminRole', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Company', key: 'company', width: 25 }, // For organizers
        { header: 'Approved', key: 'approved', width: 15 }, // For organizers
        { header: 'City', key: 'city', width: 20 }, // For users
        { header: 'Birth Year', key: 'birthYear', width: 15 }, // For users
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Last Login', key: 'lastLogin', width: 20 },
      ];

      users.forEach((user: any) => {
        worksheet.addRow(user);
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').slice(0, -5); // YYYY-MM-DD_HH-MM-SS format
      const filename = `users_and_approved_organizers_${timestamp}.xlsx`;
      
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (e) {
      next(e);
    }
  }

  async listOrganizers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminUserService.listOrganizers(req.query);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  async getOrganizerById(req: Request, res: Response, next: NextFunction) {
    try {
      const organizer = await AdminUserService.getOrganizerById(req.params.id);
      res.json(organizer);
    } catch (e) {
      next(e);
    }
  }

  async exportOrganizers(req: Request, res: Response, next: NextFunction) {
    try {
      const organizers = await AdminUserService.exportOrganizers(req.query);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Organizers');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: 'First Name', key: 'firstName', width: 20 },
        { header: 'Last Name', key: 'lastName', width: 20 },
        { header: 'Company', key: 'company', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 20 },
        { header: 'Approved', key: 'approved', width: 15 },
        { header: 'Events Count', key: 'eventsCount', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Last Login', key: 'lastLogin', width: 20 },
      ];

      organizers.forEach((organizer: any) => {
        worksheet.addRow(organizer);
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').slice(0, -5); // YYYY-MM-DD_HH-MM-SS format
      const filename = `all_organizers_${timestamp}.xlsx`;
      
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (e) {
      next(e);
    }
  }

  async updateOrganizerApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { approved } = req.body;
      
      if (typeof approved !== 'boolean') {
        return res.status(400).json({ error: 'Approved field must be a boolean' });
      }
      
      const organizer = await AdminUserService.updateOrganizerApproval(id, approved);
      res.json(organizer);
    } catch (e) {
      next(e);
    }
  }

  async getUserAttendedEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { category } = req.query;
      const events = await AdminUserService.getUserAttendedEvents(id, category as string);
      res.json(events);
    } catch (e) {
      next(e);
    }
  }

  async updateUserRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { userType, adminRole } = req.body;
      
      const user = await AdminUserService.updateUserRoles(id, userType, adminRole);
      res.json(user);
    } catch (e) {
      next(e);
    }
  }
}

export default new AdminUsersController();
