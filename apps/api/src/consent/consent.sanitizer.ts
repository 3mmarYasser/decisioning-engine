import type { ConsentFlags, VisitorContext } from '@decisioning/shared-types';
import { CONSENT_SAFE_FIELDS } from '@decisioning/shared-types';

/**
 * When marketing consent is not granted, strip all visitor fields
 * except the consent-safe set: country, language, deviceType, referrerDomain.
 * This ensures visitorId and any PII/tracking traits never influence decisions.
 */
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
