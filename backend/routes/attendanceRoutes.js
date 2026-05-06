import express from 'express';
import { markAttendance, getAttendance, deleteAttendance, addManualAttendance, processDailyAbsences, getAttendanceSheet } from '../controllers/attendanceController.js';

const router = express.Router();

router.route('/').get(getAttendance);
router.route('/sheet').get(getAttendanceSheet);
router.route('/mark').post(markAttendance);
router.route('/manual').post(addManualAttendance);
router.route('/process-absences').post(processDailyAbsences);
router.route('/:id').delete(deleteAttendance);

export default router;
