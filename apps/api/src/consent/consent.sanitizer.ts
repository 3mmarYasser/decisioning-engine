import type { ConsentFlags, VisitorContext } from '@decisioning/shared-types';
import { CONSENT_SAFE_FIELDS } from '@decisioning/shared-types';

export function sanitizeForConsent(
  visitor: VisitorContext,
  consent: ConsentFlags,
): VisitorContext {
  if (consent.marketing) {
    return { ...visitor };
  }

  const sanitized: VisitorContext = {};
  for (const field of CONSENT_SAFE_FIELDS) {
    if (visitor[field] !== undefined) {
      sanitized[field] = visitor[field];
    }
  }
  return sanitized;
}
