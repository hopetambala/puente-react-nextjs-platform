import { z } from 'zod';

import { orgScopedQuery } from './parseRest';

// NOTE: tools are plain { description, inputSchema, execute } objects — the
// same runtime shape the AI SDK's tool() helper returns. We avoid importing
// the ESM-only 'ai' package here so this module stays testable under Jest.

const QUERYABLE_CLASSES = ['SurveyData', 'Household', 'Vitals', 'FormResults', 'FormSpecificationsV2'];

// Fields the model may filter on — everything else is dropped.
const FILTERABLE_FIELDS = ['communityname', 'surveyingUser', 'householdId'];

// Fields the model may see in record listings — a deliberate PII boundary.
const PROJECTED_FIELDS = ['fname', 'lname', 'communityname', 'surveyingUser', 'createdAt', 'householdId'];

const DISTINCT_FIELDS = ['surveyingUser', 'communityname'];

const parseDate = (iso) => ({ __type: 'Date', iso: new Date(iso).toISOString() });

// Keep the record limit within [1, max] — a model-supplied 0 or negative
// value would otherwise reach Parse and return nothing useful.
const clampLimit = (n, max = 50) => Math.min(Math.max(n, 1), max);

const buildWhere = ({ filters = {}, createdAfter, createdBefore }) => {
  const where = {};
  FILTERABLE_FIELDS.forEach((field) => {
    if (filters[field] !== undefined) where[field] = filters[field];
  });
  if (createdAfter || createdBefore) {
    where.createdAt = {};
    if (createdAfter) where.createdAt.$gte = parseDate(createdAfter);
    if (createdBefore) where.createdAt.$lte = parseDate(createdBefore);
  }
  return where;
};

const classNameSchema = z.enum(QUERYABLE_CLASSES);
const filtersSchema = z
  .object({
    communityname: z.string().optional(),
    surveyingUser: z.string().optional(),
    householdId: z.string().optional(),
  })
  .optional();

const buildTools = ({ organization, sessionToken }) => {
  const base = { organization, sessionToken };

  return {
    countRecords: {
      description:
        'Count records of a given class for the organization. Supports optional filters and a createdAt date range (ISO dates).',
      inputSchema: z.object({
        className: classNameSchema,
        filters: filtersSchema,
        createdAfter: z.string().optional(),
        createdBefore: z.string().optional(),
      }),
      execute: async ({ className, filters, createdAfter, createdBefore }) => {
        const { count } = await orgScopedQuery({
          ...base,
          className,
          where: buildWhere({ filters, createdAfter, createdBefore }),
          count: true,
          limit: 0,
        });
        return { count };
      },
    },

    listRecords: {
      description:
        'List records of a given class (newest first). Returns only summary fields, up to 50 records.',
      inputSchema: z.object({
        className: classNameSchema,
        filters: filtersSchema,
        createdAfter: z.string().optional(),
        createdBefore: z.string().optional(),
        limit: z.number().optional(),
      }),
      execute: async ({ className, filters, createdAfter, createdBefore, limit = 20 }) => {
        const { results } = await orgScopedQuery({
          ...base,
          className,
          where: buildWhere({ filters, createdAfter, createdBefore }),
          keys: PROJECTED_FIELDS,
          order: '-createdAt',
          limit: clampLimit(limit),
        });
        return { records: results };
      },
    },

    getDistinctValues: {
      description:
        'Get the distinct values of a field (surveyingUser or communityname) across the organization\'s SurveyData, e.g. to list active surveyors or communities.',
      inputSchema: z.object({
        field: z.enum(DISTINCT_FIELDS),
        createdAfter: z.string().optional(),
      }),
      execute: async ({ field, createdAfter }) => {
        const { results } = await orgScopedQuery({
          ...base,
          className: 'SurveyData',
          where: buildWhere({ createdAfter }),
          keys: [field],
          limit: 1000,
        });
        const values = [...new Set(results.map((r) => r[field]).filter(Boolean))];
        return { values, total: values.length };
      },
    },

    getRecentActivity: {
      description: 'Get the most recent survey records for the organization, newest first.',
      inputSchema: z.object({
        limit: z.number().optional(),
      }),
      execute: async ({ limit = 20 }) => {
        const { results } = await orgScopedQuery({
          ...base,
          className: 'SurveyData',
          keys: PROJECTED_FIELDS,
          order: '-createdAt',
          limit: clampLimit(limit),
        });
        return { records: results };
      },
    },
  };
};

export { buildTools };
export default buildTools;
