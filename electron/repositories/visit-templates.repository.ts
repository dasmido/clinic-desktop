import type { Kysely } from 'kysely';
import type { Database, VisitTemplate, VisitTemplateData } from '../../src/database/types.js';

export type CreateVisitTemplateInput = {
  name: string;
  visit_type: string;
  description: string;
  template_data: VisitTemplateData;
  created_by_user_id: number;
};

export type UpdateVisitTemplateInput = Omit<CreateVisitTemplateInput, 'created_by_user_id'>;

export async function listVisitTemplates(db: Kysely<Database>, includeInactive = false): Promise<VisitTemplate[]> {
  let query = db.selectFrom('visit_templates').selectAll().orderBy('name', 'asc');
  if (!includeInactive) query = query.where('is_active', '=', true);
  return query.execute();
}

export async function createVisitTemplate(db: Kysely<Database>, template: CreateVisitTemplateInput): Promise<VisitTemplate> {
  return db.insertInto('visit_templates').values(template).returningAll().executeTakeFirstOrThrow();
}

export async function updateVisitTemplate(
  db: Kysely<Database>,
  templateId: number,
  template: UpdateVisitTemplateInput,
): Promise<VisitTemplate> {
  return db
    .updateTable('visit_templates')
    .set({ ...template, updated_at: new Date() })
    .where('id', '=', templateId)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deactivateVisitTemplate(db: Kysely<Database>, templateId: number): Promise<VisitTemplate> {
  return db
    .updateTable('visit_templates')
    .set({ is_active: false, updated_at: new Date() })
    .where('id', '=', templateId)
    .returningAll()
    .executeTakeFirstOrThrow();
}