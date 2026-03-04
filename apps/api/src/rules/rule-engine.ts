import type { Rule, Condition, Variant, RulesetConfig, VisitorContext } from '@decisioning/shared-types';

function evaluateCondition(condition: Condition, context: VisitorContext): boolean {
  const fieldValue = context[condition.field];
  if (fieldValue === undefined || fieldValue === null) return false;

  switch (condition.operator) {
    case 'eq':
      return fieldValue === condition.value;

    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(fieldValue);

    case 'contains':
      return (
        typeof condition.value === 'string' &&
        typeof fieldValue === 'string' &&
        fieldValue.includes(condition.value)
      );

    default:
      return false;
  }
}

function evaluateRule(rule: Rule, context: VisitorContext): boolean {
  return rule.conditions.every((condition) => evaluateCondition(condition, context));
}

export function evaluate(config: RulesetConfig, context: VisitorContext): Variant {
  const sortedRules = [...config.rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (evaluateRule(rule, context)) {
      return rule.variant;
    }
  }

  return config.fallback;
}
