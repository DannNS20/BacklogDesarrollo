import { Router } from 'express';
import { requireSuperadmin } from '../../middleware/auth.ts';
import { adminsRouter } from './admins.ts';
import { attendanceRouter } from './attendance.ts';
import { studentsRouter } from './students.ts';
import { systemRouter } from './system.ts';

export const adminRouter = Router();

adminRouter.get('/session', (req, res) => {
  res.json(req.admin);
});

adminRouter.use('/students', studentsRouter);
adminRouter.use('/attendance', attendanceRouter);
adminRouter.use('/admins', requireSuperadmin, adminsRouter);
adminRouter.use(systemRouter);
