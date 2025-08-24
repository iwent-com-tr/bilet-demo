import { Request, Response, NextFunction } from 'express';
import { AdminUserService } from './users.service';

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
      const user = await AdminUserService.getUserById(req.params.id);
      res.json(user);
    } catch (e) {
      next(e);
    }
  }

  async exportUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await AdminUserService.exportUsers(req.query);

      const workbook = new (require('exceljs')).Workbook();
      const worksheet = workbook.addWorksheet('Users');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: 'First Name', key: 'firstName', width: 20 },
        { header: 'Last Name', key: 'lastName', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 20 },
        { header: 'Role', key: 'adminRole', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Last Login', key: 'lastLogin', width: 20 },
      ];

      users.forEach((user: any) => {
        worksheet.addRow(user);
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="users.xlsx"'
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (e) {
      next(e);
    }
  }
}

export default new AdminUsersController();
