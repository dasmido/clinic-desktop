import { getDatabase } from '../database.js';
import {
  createVisitTemplate as repoCreateVisitTemplate,
  deactivateVisitTemplate as repoDeactivateVisitTemplate,
  listVisitTemplates as repoListVisitTemplates,
  updateVisitTemplate as repoUpdateVisitTemplate,
  type CreateVisitTemplateInput,
  type UpdateVisitTemplateInput,
} from '../repositories/visit-templates.repository.js';
import { assertUserHasRole, getCurrentUser } from './auth.service.js';

export async function listVisitTemplates(includeInactive?: boolean) {
  assertUserHasRole(['doctor', 'nurse', 'admin']);
  const user = getCurrentUser();
  const db = await getDatabase();
  return repoListVisitTemplates(db, user?.role === 'admin' && includeInactive === true);
}

export async function createVisitTemplate(input: Omit<CreateVisitTemplateInput, 'created_by_user_id'>) {
  const user = assertUserHasRole(['admin']);
  const db = await getDatabase();
  return repoCreateVisitTemplate(db, { ...input, created_by_user_id: user.id });
}

export async function updateVisitTemplate(templateId: number, input: UpdateVisitTemplateInput) {
  assertUserHasRole(['admin']);
  const db = await getDatabase();
  return repoUpdateVisitTemplate(db, templateId, input);
}

export async function deactivateVisitTemplate(templateId: number) {
  assertUserHasRole(['admin']);
  const db = await getDatabase();
  return repoDeactivateVisitTemplate(db, templateId);
}
