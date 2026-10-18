/**
 * DynamoRepository — Real DynamoDB implementation using AWS SDK v3.
 *
 * Uses a single-table design (see config/dynamo-schema.md) with composite keys
 * and Global Secondary Indexes for efficient access patterns.
 *
 * This adapter is used when DB_PROVIDER=dynamodb in the environment.
 * It requires valid AWS credentials and a configured DynamoDB table.
 *
 * IMPORTANT: Uses DynamoDBDocumentClient with @aws-sdk/lib-dynamodb commands
 * (GetCommand, PutCommand, etc.) — NOT the raw DynamoDB commands.
 * This means all values are plain JavaScript objects; no { S: "..." } type
 * descriptors are needed. The DocumentClient handles marshalling automatically.
 *
 * The table is NOT created automatically — it must be provisioned in the
 * AWS Console before use. See config/dynamo-schema.md for full schema details.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class DynamoRepository {
  constructor() {
    const client = new DynamoDBClient({ region: env.AWS_REGION });

    // DocumentClient marshals/unmarshals JS ↔ DynamoDB types automatically.
    // All reads/writes use plain JS values — no { S: "..." } type annotations.
    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        // Remove undefined values when writing to DynamoDB
        removeUndefinedValues: true,
      },
    });

    this.tableName = env.DYNAMODB_TABLE_NAME;

    logger.info('DynamoRepository initialized', {
      region: env.AWS_REGION,
      tableName: this.tableName,
    });
  }

  // ── Key builders ──────────────────────────────────────────────────────────

  _userPK(userId) { return `USER#${userId}`; }
  _doctorPK(doctorId) { return `DOCTOR#${doctorId}`; }
  _specialtyPK(specialtyId) { return `SPECIALTY#${specialtyId}`; }
  _appointmentSK(date, time, appointmentId) {
    return `APT#${date}#${time}#${appointmentId}`;
  }
  _slotKey(doctorId, date, time) {
    return { PK: `SLOT#${doctorId}`, SK: `DATE#${date}#TIME#${time}` };
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async getUserById(userId) {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: this._userPK(userId), SK: 'PROFILE' },
      }),
    );
    return result.Item || null;
  }

  async _queryAll(params) {
    const items = [];
    let lastKey;
    do {
      const result = await this.docClient.send(new QueryCommand({
        ...params,
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      }));
      items.push(...(result.Items || []));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return items;
  }

  async getUserByEmail(email) {
    const result = await this.docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :email AND GSI1SK = :profile',
      ExpressionAttributeValues: { ':email': `USER#${email.toLowerCase()}`, ':profile': 'PROFILE' },
      Limit: 1,
    }));
    return result.Items?.[0] || null;
  }

  async createUser(user) {
    const userId = user.userId || `usr-${uuidv4()}`;
    const item = {
      ...user,
      email: user.email.toLowerCase(),
      PK: this._userPK(userId),
      SK: 'PROFILE',
      GSI1PK: `USER#${user.email.toLowerCase()}`,
      GSI1SK: 'PROFILE',
      userId,
      status: user.status || 'active',
      createdAt: new Date().toISOString(),
    };

    try {
      await this.docClient.send(new TransactWriteCommand({
        TransactItems: [
          { Put: { TableName: this.tableName, Item: item, ConditionExpression: 'attribute_not_exists(PK)' } },
          { Put: {
            TableName: this.tableName,
            Item: { PK: `EMAIL#${item.email}`, SK: 'UNIQUE', userId },
            ConditionExpression: 'attribute_not_exists(PK)',
          } },
        ],
      }));
    } catch (error) {
      if (error.name === 'TransactionCanceledException' || error.name === 'ConditionalCheckFailedException') {
        const duplicate = new Error('An account with this email already exists.');
        duplicate.name = 'DuplicateEmailError';
        duplicate.code = 'EMAIL_ALREADY_REGISTERED';
        duplicate.statusCode = 409;
        throw duplicate;
      }
      throw error;
    }

    logger.debug('DynamoRepository: user created', { userId });
    return item;
  }

  async updateUser(userId, updates) {
    if (!updates || Object.keys(updates).length === 0) {
      return this.getUserById(userId);
    }

    const { updateExpr, exprNames, exprValues } = this._buildUpdateExpression(updates);
    const expressionNames = { ...exprNames };
    const expressionValues = { ...exprValues };
    let updateExpression = `SET ${updateExpr}`;
    if (updates.name !== undefined) {
      const current = await this.getUserById(userId);
      if (!current) return null;
      expressionNames['#emailIndex'] = 'GSI1PK';
      expressionValues[':emailIndex'] = `USER#${(current.email || '').toLowerCase()}`;
      updateExpression += ', #emailIndex = :emailIndex';
    }

    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: this._userPK(userId), SK: 'PROFILE' },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: 'ALL_NEW',
      }),
    );

    return result.Attributes || null;
  }

  // ── Doctors ───────────────────────────────────────────────────────────────

  async getAllDoctors({ status, specialty } = {}) {
    let doctors = await this._queryAll({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :doctors',
      ExpressionAttributeValues: { ':doctors': 'DOCTORS' },
    });

    // Filter in application code — avoids complex GSI key design for small datasets
    if (status) {
      doctors = doctors.filter((d) => d.status === status);
    }
    if (specialty) {
      doctors = doctors.filter(
        (d) => d.specialty?.toLowerCase() === specialty.toLowerCase(),
      );
    }

    // Sort: featured first, then by rating descending
    doctors.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    return doctors;
  }

  async getDoctorById(doctorId) {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: this._doctorPK(doctorId), SK: 'PROFILE' },
      }),
    );
    return result.Item || null;
  }

  async getDoctorByUserId(userId) {
    const profile = await this.getUserById(userId);
    if (!profile?.doctorId) return null;
    return this.getDoctorById(profile.doctorId);
  }

  async createDoctor(doctor) {
    const doctorId = doctor.doctorId || `doc-${uuidv4()}`;
    const item = {
      ...doctor,
      PK: this._doctorPK(doctorId),
      SK: 'PROFILE',
      doctorId,
      GSI1PK: 'DOCTORS',
      GSI1SK: `STATUS#${doctor.status || 'active'}#NAME#${doctor.name}`,
      status: doctor.status || 'active',
      ...(doctor.rating !== undefined ? { rating: doctor.rating } : {}),
      ...(doctor.reviewCount !== undefined ? { reviewCount: doctor.reviewCount } : {}),
    };

    try {
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      }));
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        const duplicate = new Error('A doctor profile with this ID already exists.');
        duplicate.code = 'DOCTOR_ALREADY_EXISTS'; duplicate.statusCode = 409;
        throw duplicate;
      }
      throw error;
    }

    logger.debug('DynamoRepository: doctor created', { doctorId });
    return item;
  }

  async updateDoctor(doctorId, updates) {
    if (!updates || Object.keys(updates).length === 0) {
      return this.getDoctorById(doctorId);
    }

    const safeUpdates = { ...updates };
    if (safeUpdates.name !== undefined || safeUpdates.status !== undefined) {
      const current = await this.getDoctorById(doctorId);
      if (!current) return null;
      const nextName = safeUpdates.name ?? current.name;
      const nextStatus = safeUpdates.status ?? current.status;
      safeUpdates.GSI1PK = 'DOCTORS';
      safeUpdates.GSI1SK = `STATUS#${nextStatus}#NAME#${nextName}`;
    }
    const profileFields = { ...safeUpdates };
    delete profileFields.GSI1PK;
    delete profileFields.GSI1SK;
    const { updateExpr, exprNames, exprValues } = this._buildUpdateExpression(profileFields);

    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: this._doctorPK(doctorId), SK: 'PROFILE' },
        UpdateExpression: safeUpdates.GSI1PK
          ? `SET ${updateExpr}, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk`
          : `SET ${updateExpr}`,
        ExpressionAttributeNames: {
          ...exprNames,
          ...(safeUpdates.GSI1PK ? { '#gsi1pk': 'GSI1PK', '#gsi1sk': 'GSI1SK' } : {}),
        },
        ExpressionAttributeValues: {
          ...exprValues,
          ...(safeUpdates.GSI1PK ? { ':gsi1pk': safeUpdates.GSI1PK, ':gsi1sk': safeUpdates.GSI1SK } : {}),
        },
        ReturnValues: 'ALL_NEW',
      }),
    );

    return result.Attributes || null;
  }

  async updateDoctorStatus(doctorId, status) {
    return this.updateDoctor(doctorId, { status });
  }

  async updateDoctorSlots(doctorId, availableSlots, availableDays) {
    const updates = { availableSlots };
    if (availableDays !== undefined) updates.availableDays = availableDays;
    return this.updateDoctor(doctorId, updates);
  }

  // ── Specialties ───────────────────────────────────────────────────────────

  async getAllSpecialties() {
    return this._queryAll({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :specialties',
      ExpressionAttributeValues: { ':specialties': 'SPECIALTIES' },
    });
  }

  async getSpecialtyById(specialtyId) {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: this._specialtyPK(specialtyId), SK: 'PROFILE' },
      }),
    );
    return result.Item || null;
  }

  async createSpecialty(specialty) {
    const specialtyId = specialty.specialtyId || `spec-${uuidv4()}`;
    const item = {
      ...specialty,
      PK: this._specialtyPK(specialtyId),
      SK: 'PROFILE',
      specialtyId,
      GSI1PK: 'SPECIALTIES',
      GSI1SK: `NAME#${specialty.name}`,
      count: specialty.count || 0,
    };

    try {
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      }));
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        const duplicate = new Error('This specialty already exists.');
        duplicate.code = 'SPECIALTY_ALREADY_EXISTS'; duplicate.statusCode = 409;
        throw duplicate;
      }
      throw error;
    }

    logger.debug('DynamoRepository: specialty created', { specialtyId });
    return item;
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  /** Create appointment and reserve the slot atomically. */
  async createAppointment(appointment) {
    const { doctorId, date, time } = appointment;
    const appointmentId = appointment.appointmentId || `apt-${uuidv4()}`;
    const sk = this._appointmentSK(date, time, appointmentId);

    const item = {
      ...appointment,
      PK: this._doctorPK(doctorId),
      SK: sk,
      appointmentId,
      GSI1PK: `PATIENT#${appointment.patientId}`,
      GSI1SK: sk,
      GSI2PK: 'APPOINTMENTS',
      GSI2SK: `STATUS#${appointment.status || 'pending'}#${date}#${time}`,
      GSI3PK: `APPOINTMENT#${appointmentId}`,
      GSI3SK: 'PROFILE',
      status: appointment.status || 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      await this.docClient.send(new TransactWriteCommand({
        TransactItems: [
          { Put: { TableName: this.tableName, Item: item, ConditionExpression: 'attribute_not_exists(PK)' } },
          { Put: {
            TableName: this.tableName,
            Item: { ...this._slotKey(doctorId, date, time), appointmentId },
            ConditionExpression: 'attribute_not_exists(PK)',
          } },
        ],
      }));
    } catch (err) {
      if (err.name === 'TransactionCanceledException' || err.name === 'ConditionalCheckFailedException') {
        logger.warn('DynamoRepository: conditional write rejected (concurrent booking)', {
          doctorId, date, time,
        });
        return { success: false, error: 'SLOT_CONFLICT' };
      }
      throw err;
    }

    logger.info('DynamoRepository: appointment created', { appointmentId });
    return { success: true, appointment: item };
  }

  async getAppointmentsByPatient(patientId) {
    return this._queryAll({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :patient AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: { ':patient': `PATIENT#${patientId}`, ':prefix': 'APT#' },
    });
  }

  async getAppointmentsByDoctor(doctorId) {
    return this._queryAll({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': this._doctorPK(doctorId), ':prefix': 'APT#' },
    });
  }

  async getAppointmentById(appointmentId) {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :aptKey AND GSI3SK = :profile',
        ExpressionAttributeValues: {
          ':aptKey': `APPOINTMENT#${appointmentId}`,
          ':profile': 'PROFILE',
        },
        Limit: 1,
      }),
    );
    return result.Items?.[0] || null;
  }

  async _updateAppointmentStatusFields(appointment, status) {
    const result = await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { PK: appointment.PK, SK: appointment.SK },
      UpdateExpression: 'SET #st = :status, #gsi2sk = :gsi2sk',
      ConditionExpression: '#st = :previous',
      ExpressionAttributeNames: { '#st': 'status', '#gsi2sk': 'GSI2SK' },
      ExpressionAttributeValues: {
        ':status': status,
        ':previous': appointment.status,
        ':gsi2sk': `STATUS#${status}#${appointment.date}#${appointment.time}`,
      },
      ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes || { ...appointment, status };
  }

  async updateAppointmentStatus(appointmentId, status) {
    const appointment = await this.getAppointmentById(appointmentId);
    if (!appointment) return null;

    if (status === 'cancelled' || status === 'rejected') {
      try {
        await this.docClient.send(new TransactWriteCommand({
          TransactItems: [
            { Update: {
              TableName: this.tableName,
              Key: { PK: appointment.PK, SK: appointment.SK },
              UpdateExpression: 'SET #st = :next, #gsi2sk = :gsi2sk',
              ConditionExpression: '#st = :previous',
              ExpressionAttributeNames: { '#st': 'status', '#gsi2sk': 'GSI2SK' },
              ExpressionAttributeValues: {
                ':next': status, ':previous': appointment.status,
                ':gsi2sk': `STATUS#${status}#${appointment.date}#${appointment.time}`,
              },
            } },
            { Delete: {
              TableName: this.tableName,
              Key: this._slotKey(appointment.doctorId, appointment.date, appointment.time),
              ConditionExpression: 'appointmentId = :appointmentId',
              ExpressionAttributeValues: { ':appointmentId': appointmentId },
            } },
          ],
        }));
        return { ...appointment, status, GSI2SK: `STATUS#${status}#${appointment.date}#${appointment.time}` };
      } catch (error) {
        if (error.name === 'TransactionCanceledException') return null;
        throw error;
      }
    }

    try {
      return await this._updateAppointmentStatusFields(appointment, status);
    } catch (error) {
      if (error.name === 'TransactionCanceledException' || error.name === 'ConditionalCheckFailedException') return null;
      throw error;
    }
  }

  async rescheduleAppointment(appointmentId, newDate, newTime) {
    const appointment = await this.getAppointmentById(appointmentId);
    if (!appointment) return null;
    if (appointment.date === newDate && appointment.time === newTime) return { success: true, appointment };
    const newSk = this._appointmentSK(newDate, newTime, appointmentId);
    const updated = {
      ...appointment, SK: newSk, date: newDate, time: newTime, status: 'confirmed',
      GSI1PK: `PATIENT#${appointment.patientId}`,
      GSI1SK: newSk,
      GSI2PK: 'APPOINTMENTS', GSI2SK: `STATUS#confirmed#${newDate}#${newTime}`,
      GSI3PK: `APPOINTMENT#${appointmentId}`, GSI3SK: 'PROFILE',
    };
    try {
      await this.docClient.send(new TransactWriteCommand({
        TransactItems: [
          { Delete: {
            TableName: this.tableName, Key: { PK: appointment.PK, SK: appointment.SK },
            ConditionExpression: '#st = :previous',
            ExpressionAttributeNames: { '#st': 'status' },
            ExpressionAttributeValues: { ':previous': appointment.status },
          } },
          { Put: { TableName: this.tableName, Item: updated, ConditionExpression: 'attribute_not_exists(PK)' } },
          { Put: {
            TableName: this.tableName,
            Item: { ...this._slotKey(appointment.doctorId, newDate, newTime), appointmentId },
            ConditionExpression: 'attribute_not_exists(PK)',
          } },
          { Delete: {
            TableName: this.tableName,
            Key: this._slotKey(appointment.doctorId, appointment.date, appointment.time),
            ConditionExpression: 'appointmentId = :appointmentId',
            ExpressionAttributeValues: { ':appointmentId': appointmentId },
          } },
        ],
      }));
      logger.info('DynamoRepository: appointment rescheduled', { appointmentId });
        return { success: true, appointment: updated };
    } catch (error) {
      if (error.name === 'TransactionCanceledException' || error.name === 'ConditionalCheckFailedException') {
        return { success: false, error: 'SLOT_CONFLICT' };
      }
      throw error;
    }
  }

  async getAllAppointments() {
    return this._queryAll({
      TableName: this.tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :apts',
      ExpressionAttributeValues: { ':apts': 'APPOINTMENTS' },
    });
  }

  // ── Documents ─────────────────────────────────────────────────────────────

  async getDocumentsByUser(userId) {
    return this._queryAll({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: '#st <> :deleted',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':pk': this._userPK(userId), ':prefix': 'DOC#', ':deleted': 'deleted',
      },
    });
  }

  async getDocumentById(documentId, userId) {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: this._userPK(userId),
          SK: `DOC#${documentId}`,
        },
      }),
    );
    // Don't return soft-deleted documents
    const item = result.Item;
    if (!item || item.status === 'deleted') return null;
    return item;
  }

  async createDocumentMetadata(metadata) {
    const documentId = metadata.documentId || `doc-${uuidv4()}`;
    const uploadedAt = new Date().toISOString();
    const item = {
      PK: this._userPK(metadata.userId),
      SK: `DOC#${documentId}`,
      // GSI1 allows admin to list all documents sorted by upload date
      GSI1PK: 'DOCUMENTS',
      GSI1SK: `UPLOADED#${uploadedAt}`,
      documentId,
      status: 'active',
      uploadedAt,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );

    logger.debug('DynamoRepository: document metadata created', { documentId });
    return item;
  }

  async createUploadIntent(intent) {
    const item = {
      ...intent,
      PK: this._userPK(intent.userId),
      SK: `UPLOAD#${intent.uploadId}`,
    };
    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    return item;
  }

  async getUploadIntent(userId, uploadId) {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { PK: this._userPK(userId), SK: `UPLOAD#${uploadId}` },
    }));
    return result.Item || null;
  }

  async completeUploadIntent(userId, uploadId, metadata) {
    const intent = await this.getUploadIntent(userId, uploadId);
    if (!intent || intent.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    const documentId = `doc-${uuidv4()}`;
    const uploadedAt = new Date().toISOString();
    const item = {
      ...metadata,
      PK: this._userPK(userId), SK: `DOC#${documentId}`,
      GSI1PK: 'DOCUMENTS', GSI1SK: `UPLOADED#${uploadedAt}`,
      documentId, userId, objectKey: intent.objectKey,
      fileName: intent.fileName, fileType: intent.fileType,
      fileSizeBytes: intent.fileSizeBytes, description: intent.description,
      status: 'active', uploadedAt,
    };
    try {
      await this.docClient.send(new TransactWriteCommand({
        TransactItems: [
          { Put: { TableName: this.tableName, Item: item, ConditionExpression: 'attribute_not_exists(PK)' } },
          { Delete: {
            TableName: this.tableName,
            Key: { PK: this._userPK(userId), SK: `UPLOAD#${uploadId}` },
            ConditionExpression: 'attribute_exists(PK) AND expiresAt > :now',
            ExpressionAttributeValues: { ':now': Math.floor(Date.now() / 1000) },
          } },
        ],
      }));
      return item;
    } catch (error) {
      if (error.name === 'TransactionCanceledException' || error.name === 'ConditionalCheckFailedException') return null;
      throw error;
    }
  }

  async deleteUploadIntent(userId, uploadId) {
    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { PK: this._userPK(userId), SK: `UPLOAD#${uploadId}` },
    }));
  }

  /**
   * Soft-delete: mark document as deleted rather than removing it.
   * This preserves audit history. Hard delete would use DeleteCommand.
   */
  async deleteDocument(documentId, userId) {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: this._userPK(userId),
          SK: `DOC#${documentId}`,
        },
        UpdateExpression: 'SET #st = :deleted',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':deleted': 'deleted' },
      }),
    );
    logger.debug('DynamoRepository: document soft-deleted', { documentId, userId });
    return true;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Build a DynamoDB SET update expression from a plain JS object.
   * Handles reserved word clashes by aliasing all attribute names with #.
   *
   * @param {object} updates - Plain object of field → value pairs
   * @returns {{ updateExpr, exprNames, exprValues }}
   */
  _buildUpdateExpression(updates) {
    const updateParts = [];
    const exprNames = {};
    const exprValues = {};

    for (const [key, value] of Object.entries(updates)) {
      const nameAlias = `#${key}`;
      const valueAlias = `:${key}`;
      updateParts.push(`${nameAlias} = ${valueAlias}`);
      exprNames[nameAlias] = key;
      exprValues[valueAlias] = value;
    }

    return {
      updateExpr: updateParts.join(', '),
      exprNames,
      exprValues,
    };
  }
}
