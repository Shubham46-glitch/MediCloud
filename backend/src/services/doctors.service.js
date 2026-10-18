/**
 * Doctor Service — Business logic for doctor directory management.
 */

import { getRepository } from '../repository/index.js';
import logger from '../utils/logger.js';
import { z } from 'zod';

export const createDoctorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  title: z.string().min(2, 'Title is required'),
  specialty: z.string().min(2, 'Specialty is required'),
  hospital: z.string().min(2, 'Hospital is required'),
  location: z.string().min(2, 'Location is required'),
  fee: z.coerce.number().positive('Fee must be a positive number'),
  experience: z.coerce.number().int().min(0, 'Experience must be 0 or more'),
  bio: z.string().optional(),
  education: z.string().optional(),
  languages: z.array(z.string()).optional(),
  availableDays: z.array(z.string()).optional(),
  availableSlots: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
});

export const updateDoctorSchema = createDoctorSchema.partial();

export const updateSlotsSchema = z.object({
  availableSlots: z.array(z.string().min(1)).min(1, 'At least one slot required'),
  availableDays: z.array(z.string()).optional(),
});

export async function listDoctors({ status, specialty } = {}) {
  const repo = getRepository();
  const doctors = await repo.getAllDoctors({ status, specialty });
  return { success: true, doctors };
}

export async function getDoctorById(doctorId) {
  const repo = getRepository();
  const doctor = await repo.getDoctorById(doctorId);
  if (!doctor) {
    return { success: false, status: 404, error: 'DOCTOR_NOT_FOUND', message: 'Doctor not found.' };
  }
  return { success: true, doctor };
}

export async function createDoctor(input) {
  const validation = createDoctorSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, status: 400, error: 'VALIDATION_ERROR', details: validation.error.flatten().fieldErrors };
  }
  const repo = getRepository();
  try {
    const doctor = await repo.createDoctor(validation.data);
    logger.info('Doctor created', { doctorId: doctor.doctorId });
    return { success: true, doctor };
  } catch (error) {
    if (error.code === 'DOCTOR_ALREADY_EXISTS') return { success: false, status: 409, error: error.code, message: error.message };
    throw error;
  }
}

export async function updateDoctor(doctorId, input) {
  const validation = updateDoctorSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, status: 400, error: 'VALIDATION_ERROR', details: validation.error.flatten().fieldErrors };
  }
  const repo = getRepository();
  const existing = await repo.getDoctorById(doctorId);
  if (!existing) {
    return { success: false, status: 404, error: 'DOCTOR_NOT_FOUND', message: 'Doctor not found.' };
  }
  const doctor = await repo.updateDoctor(doctorId, validation.data);
  logger.info('Doctor updated', { doctorId });
  return { success: true, doctor };
}

export async function toggleDoctorStatus(doctorId) {
  const repo = getRepository();
  const doctor = await repo.getDoctorById(doctorId);
  if (!doctor) {
    return { success: false, status: 404, error: 'DOCTOR_NOT_FOUND', message: 'Doctor not found.' };
  }
  const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
  const updated = await repo.updateDoctorStatus(doctorId, newStatus);
  logger.info('Doctor status toggled', { doctorId, newStatus });
  return { success: true, doctor: updated };
}

export async function updateDoctorSlots(doctorId, input, requestingUserId, requestingRole) {
  // Doctors can only update their own slots; admins can update any
  if (requestingRole === 'doctor' && doctorId !== requestingUserId) {
    return { success: false, status: 403, error: 'FORBIDDEN', message: 'You can only update your own slots.' };
  }

  const validation = updateSlotsSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, status: 400, error: 'VALIDATION_ERROR', details: validation.error.flatten().fieldErrors };
  }

  const repo = getRepository();
  const doctor = await repo.getDoctorById(doctorId);
  if (!doctor) {
    return { success: false, status: 404, error: 'DOCTOR_NOT_FOUND', message: 'Doctor not found.' };
  }

  const updated = await repo.updateDoctorSlots(doctorId, validation.data.availableSlots, validation.data.availableDays);
  logger.info('Doctor slots updated', { doctorId });
  return { success: true, doctor: updated };
}

export async function listSpecialties() {
  const repo = getRepository();
  const specialties = await repo.getAllSpecialties();
  return { success: true, specialties };
}

export async function createSpecialty(input) {
  const schema = z.object({
    name: z.string().min(2, 'Name is required'),
    description: z.string().optional(),
    icon: z.string().optional(),
  });
  const validation = schema.safeParse(input);
  if (!validation.success) {
    return { success: false, status: 400, error: 'VALIDATION_ERROR', details: validation.error.flatten().fieldErrors };
  }
  const repo = getRepository();
  if ((await repo.getAllSpecialties()).some((item) => item.name.toLowerCase() === validation.data.name.toLowerCase())) {
    return { success: false, status: 409, error: 'SPECIALTY_ALREADY_EXISTS', message: 'This specialty already exists.' };
  }
  try {
    const specialty = await repo.createSpecialty(validation.data);
    logger.info('Specialty created', { specialtyId: specialty.specialtyId });
    return { success: true, specialty };
  } catch (error) {
    if (error.code === 'SPECIALTY_ALREADY_EXISTS') return { success: false, status: 409, error: error.code, message: error.message };
    throw error;
  }
}
