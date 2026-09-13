import { app, dialog, shell, type BrowserWindow } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDatabase } from '../database.js';
import { findMedicalRecordById } from '../repositories/medical-records.repository.js';
import { getCurrentUser } from './auth.service.js';

function getPatientFilesDirectory(medicalRecordId: number) {
  return path.join(app.getPath('userData'), 'patient-files', String(medicalRecordId));
}

export async function addPatientFiles(win: BrowserWindow | null, medicalRecordId: number) {
  if (!getCurrentUser()) throw new Error('Please sign in before adding an attachment.');
  if (!Number.isInteger(medicalRecordId) || medicalRecordId < 1) throw new Error('Invalid medical record.');
  if (!win) throw new Error('Application window is not available.');

  const selected = await dialog.showOpenDialog(win, {
    title: 'اختيار نتائج التحاليل أو الفحوصات',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'المستندات والصور', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx', 'xls', 'xlsx'] }],
  });
  if (selected.canceled) return [];

  const db = await getDatabase();
  const record = await findMedicalRecordById(db, medicalRecordId);
  if (!record) throw new Error('Medical record was not found.');

  const directory = getPatientFilesDirectory(medicalRecordId);
  await fs.mkdir(directory, { recursive: true });

  const attachments = [];
  for (const sourcePath of selected.filePaths) {
    const stat = await fs.stat(sourcePath);
    if (!stat.isFile()) continue;
    if (stat.size > 20 * 1024 * 1024) throw new Error('Each attachment must be 20 MB or smaller.');

    const originalName = path.basename(sourcePath);
    const storedName = `${crypto.randomUUID()}${path.extname(originalName).toLowerCase()}`;
    await fs.copyFile(sourcePath, path.join(directory, storedName));
    attachments.push({ originalName, storedName, fileSizeBytes: stat.size });
  }
  return attachments;
}

export async function openPatientFile(medicalRecordId: number, storedName: string) {
  if (!getCurrentUser()) throw new Error('Please sign in before opening an attachment.');
  if (!Number.isInteger(medicalRecordId) || !/^[a-f0-9-]+\.[a-z0-9]+$/i.test(storedName)) throw new Error('Invalid attachment.');
  const filePath = path.join(getPatientFilesDirectory(medicalRecordId), storedName);
  const error = await shell.openPath(filePath);
  if (error) throw new Error(error);
}

export async function deletePatientFile(medicalRecordId: number, storedName: string) {
  if (!getCurrentUser()) throw new Error('Please sign in before deleting an attachment.');
  if (!Number.isInteger(medicalRecordId) || !/^[a-f0-9-]+\.[a-z0-9]+$/i.test(storedName)) throw new Error('Invalid attachment.');
  await fs.unlink(path.join(getPatientFilesDirectory(medicalRecordId), storedName)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

export async function deleteRecordFiles(medicalRecordId: number) {
  if (!getCurrentUser()) throw new Error('Please sign in before deleting a medical record.');
  if (!Number.isInteger(medicalRecordId) || medicalRecordId < 1) throw new Error('Invalid medical record.');
  await fs.rm(getPatientFilesDirectory(medicalRecordId), { recursive: true, force: true });
}
