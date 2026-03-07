import express from 'express';
import { registerUser, getUsers, uploadImages, deleteUser } from '../controllers/userController.js';

const router = express.Router();

router.route('/').get(getUsers);
router.route('/register').post(registerUser);
router.route('/upload-images').post(uploadImages);
router.route('/:userId').delete(deleteUser);

export default router;
