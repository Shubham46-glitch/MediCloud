/**
 * MockRepository — In-memory implementation of the data-access layer.
 *
 * DEVELOPMENT/TEST ONLY. This adapter stores data in process memory and
 * resets when the server restarts. It mirrors the interface of the
 * DynamoDB repository so controllers can use either one interchangeably.
 *
 * In production, use DynamoRepository (dynamo.repository.js) with real DynamoDB.
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import {
  seedUsers,
  seedDoctors,
  seedSpecialties,
  seedAppointments,
} from '../config/seed-data.js';

export class MockRepository {
  constructor() {
    // Deep-clone seed data so mutations don't affect the original exports
    this.users = JSON.parse(JSON.stringify(seedUsers));
    this.doctors = JSON.parse(JSON.stringify(seedDoctors));
    this.specialties = JSON.parse(JSON.stringify(seedSpecialties));
    this.appointments = JSON.parse(JSON.stringify(seedAppointments));
    this.documents = [];
    this.uploadIntents = [];
    logger.info('MockRepository initialized with seed data', {
      users: this.users.length,
      doctors: this.doctors.length,
      specialties: this.specialties.length,
      appointments: this.appointments.length,
    });
  }

  // ── Users ──

  async getUserById(userId) {
    return this.users.find((u) => u.userId === userId) || null;
  }

  async getUserByEmail(email) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async createUser(user) {
    if (this.users.some((existing) => existing.email.toLowerCase() === user.email.toLowerCase())) {
      const duplicate = new Error('An account with this email already exists.');
      duplicate.name = 'DuplicateEmailError';
      duplicate.code = 'EMAIL_ALREADY_REGISTERED';
      duplicate.statusCode = 409;
      throw duplicate;
    }
    const newUser = {
      ...user,
      userId: user.userId || `usr-${uuidv4()}`,
      status: user.status || 'active',
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    logger.debug('MockRepository: user created', { userId: newUser.userId });
    return newUser;
  }

  async updateUser(userId, updates) {
    const idx = this.users.findIndex((u) => u.userId === userId);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...updates };
    logger.debug('MockRepository: user updated', { userId });
    return this.users[idx];
  }

  // ── Doctors ──

  async getAllDoctors({ status, specialty } = {}) {
    let doctors = [...this.doctors];

    if (status) {
      doctors = doctors.filter((d) => d.status === status);
    }
    if (specialty) {
      doctors = doctors.filter(
        (d) => d.specialty.toLowerCase() === specialty.toLowerCase(),
      );
    }

    // Sort: featured first, then by rating when available
    doctors.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    return doctors;
  }

  async getDoctorById(doctorId) {
    return this.doctors.find((d) => d.doctorId === doctorId) || null;
  }

  async getDoctorByUserId(userId) {
    const profile = await this.getUserById(userId);
    if (!profile?.doctorId) return null;
    return this.getDoctorById(profile.doctorId);
  }

  async createDoctor(doctor) {
    if (doctor.doctorId && this.doctors.some((item) => item.doctorId === doctor.doctorId)) {
      const duplicate = new Error('A doctor profile with this ID already exists.');
      duplicate.code = 'DOCTOR_ALREADY_EXISTS';
      duplicate.statusCode = 409;
      throw duplicate;
    }
    const newDoctor = {
      ...doctor,
      doctorId: doctor.doctorId || `doc-${uuidv4()}`,
      status: doctor.status || 'active',
      ...(doctor.rating !== undefined ? { rating: doctor.rating } : {}),
      ...(doctor.reviewCount !== undefined ? { reviewCount: doctor.reviewCount } : {}),
    };
    this.doctors.push(newDoctor);
    logger.debug('MockRepository: doctor created', { doctorId: newDoctor.doctorId });
    return newDoctor;
  }

  async updateDoctor(doctorId, updates) {
    const idx = this.doctors.findIndex((d) => d.doctorId === doctorId);
    if (idx === -1) return null;
    this.doctors[idx] = { ...this.doctors[idx], ...updates };
    this.doctors[idx].GSI1PK = 'DOCTORS';
    this.doctors[idx].GSI1SK = `STATUS#${this.doctors[idx].status || 'active'}#NAME#${this.doctors[idx].name}`;
    logger.debug('MockRepository: doctor updated', { doctorId });
    return this.doctors[idx];
  }

  async updateDoctorStatus(doctorId, status) {
    return this.updateDoctor(doctorId, { status });
  }

  async updateDoctorSlots(doctorId, availableSlots, availableDays) {
    const updates = { availableSlots };
    if (availableDays) updates.availableDays = availableDays;
    return this.updateDoctor(doctorId, updates);
  }

  // ── Specialties ──

  async getAllSpecialties() {
    return [...this.specialties];
  }

  async getSpecialtyById(specialtyId) {
    return this.specialties.find((s) => s.specialtyId === specialtyId) || null;
  }

  async createSpecialty(specialty) {
    if (this.specialties.some((item) => item.name.toLowerCase() === specialty.name.toLowerCase())) {
      const duplicate = new Error('This specialty already exists.');
      duplicate.code = 'SPECIALTY_ALREADY_EXISTS';
      duplicate.statusCode = 409;
      throw duplicate;
    }
    const newSpecialty = {
      ...specialty,
      specialtyId: specialty.specialtyId || `spec-${uuidv4()}`,
      count: 0,
    };
    this.specialties.push(newSpecialty);
    logger.debug('MockRepository: specialty created', { specialtyId: newSpecialty.specialtyId });
    return newSpecialty;
  }

  // ── Appointments ──

  /**
   * Create an appointment with duplicate-booking prevention.
   * Simulates DynamoDB conditional write: if an appointment already exists
   * for the same doctor, date, and time with an active status, the booking fails.
   */
  async createAppointment(appointment) {
    const { doctorId, date, time } = appointment;

    // Check for duplicate (active appointment for same doctor, date, time)
    const hasConflict = this.appointments.some(
      (apt) =>
        apt.doctorId === doctorId &&
        apt.date === date &&
        apt.time === time &&
        apt.status !== 'cancelled' &&
        apt.status !== 'rejected',
    );

    if (hasConflict) {
      logger.warn('MockRepository: appointment slot conflict', { doctorId, date, time });
      return { success: false, error: 'SLOT_CONFLICT' };
    }

    const appointmentId = appointment.appointmentId || `apt-${uuidv4()}`;
    const newApt = {
      ...appointment,
      appointmentId,
      status: appointment.status || 'pending',
      createdAt: new Date().toISOString(),
      GSI1PK: `PATIENT#${appointment.patientId}`,
      GSI1SK: `APT#${appointment.date}#${appointment.time}#${appointmentId}`,
      GSI2PK: 'APPOINTMENTS',
      GSI2SK: `STATUS#${appointment.status || 'pending'}#${appointment.date}#${appointment.time}`,
      GSI3PK: `APPOINTMENT#${appointmentId}`,
      GSI3SK: 'PROFILE',
    };

    this.appointments.push(newApt);
    logger.info('MockRepository: appointment created', { appointmentId: newApt.appointmentId });
    return { success: true, appointment: newApt };
  }

  async getAppointmentsByPatient(patientId) {
    return this.appointments.filter((a) => a.patientId === patientId);
  }

  async getAppointmentsByDoctor(doctorId) {
    return this.appointments.filter((a) => a.doctorId === doctorId);
  }

  async getAppointmentById(appointmentId) {
    return this.appointments.find((a) => a.appointmentId === appointmentId) || null;
  }

  async updateAppointmentStatus(appointmentId, status) {
    const idx = this.appointments.findIndex((a) => a.appointmentId === appointmentId);
    if (idx === -1) return null;
    this.appointments[idx] = { ...this.appointments[idx], status };
    const appointment = this.appointments[idx];
    appointment.GSI2SK = `STATUS#${status}#${appointment.date}#${appointment.time}`;
    logger.debug('MockRepository: appointment status updated', { appointmentId, status });
    return this.appointments[idx];
  }

  async rescheduleAppointment(appointmentId, newDate, newTime) {
    const idx = this.appointments.findIndex((a) => a.appointmentId === appointmentId);
    if (idx === -1) return null;

    // Check for conflict at new date/time
    const hasConflict = this.appointments.some(
      (apt) =>
        apt.appointmentId !== appointmentId &&
        apt.doctorId === this.appointments[idx].doctorId &&
        apt.date === newDate &&
        apt.time === newTime &&
        apt.status !== 'cancelled' &&
        apt.status !== 'rejected',
    );

    if (hasConflict) {
      return { success: false, error: 'SLOT_CONFLICT' };
    }

    this.appointments[idx] = {
      ...this.appointments[idx],
      date: newDate,
      time: newTime,
      status: 'confirmed',
      GSI1SK: `APT#${newDate}#${newTime}#${appointmentId}`,
      GSI2SK: `STATUS#confirmed#${newDate}#${newTime}`,
    };
    logger.info('MockRepository: appointment rescheduled', { appointmentId, newDate, newTime });
    return { success: true, appointment: this.appointments[idx] };
  }

  async getAllAppointments() {
    return [...this.appointments];
  }

  // ── Documents (metadata only — actual files go to S3) ──

  async getDocumentsByUser(userId) {
    return this.documents.filter((d) => d.userId === userId);
  }

  async getDocumentById(documentId, userId) {
    const doc = this.documents.find(
      (d) => d.documentId === documentId && d.userId === userId,
    );
    return doc || null;
  }

  async createDocumentMetadata(metadata) {
    const newDoc = {
      ...metadata,
      documentId: metadata.documentId || `doc-${uuidv4()}`,
      uploadedAt: new Date().toISOString(),
    };
    this.documents.push(newDoc);
    logger.debug('MockRepository: document metadata created', { documentId: newDoc.documentId });
    return newDoc;
  }

  async createUploadIntent(intent) {
    const item = { ...intent };
    this.uploadIntents.push(item);
    return item;
  }

  async getUploadIntent(userId, uploadId) {
    return this.uploadIntents.find((item) => item.userId === userId && item.uploadId === uploadId) || null;
  }

  async completeUploadIntent(userId, uploadId, metadata) {
    const intentIndex = this.uploadIntents.findIndex((item) => item.userId === userId && item.uploadId === uploadId);
    if (intentIndex < 0 || this.uploadIntents[intentIndex].expiresAt <= Math.floor(Date.now() / 1000)) return null;
    const intent = this.uploadIntents[intentIndex];
    this.uploadIntents.splice(intentIndex, 1);
    const document = { ...intent, ...metadata, userId, documentId: `doc-${uuidv4()}`, status: 'active', uploadedAt: new Date().toISOString() };
    delete document.uploadId;
    delete document.expiresAt;
    this.documents.push(document);
    return document;
  }

  async deleteUploadIntent(userId, uploadId) {
    this.uploadIntents = this.uploadIntents.filter((item) => !(item.userId === userId && item.uploadId === uploadId));
  }

  async deleteDocument(documentId, userId) {
    const idx = this.documents.findIndex(
      (d) => d.documentId === documentId && d.userId === userId,
    );
    if (idx === -1) return false;
    this.documents.splice(idx, 1);
    logger.debug('MockRepository: document deleted', { documentId });
    return true;
  }
}
