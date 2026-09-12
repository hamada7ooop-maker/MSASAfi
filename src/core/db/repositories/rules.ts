import { db } from '../core';
import { silentFail } from '../../utils';
import type { ClassificationRule } from '@/types';

export class RuleRepository {
  static async getAll(): Promise<ClassificationRule[]> {
    return db.classificationRules.orderBy('priority').reverse().toArray();
  }

  static async add(rule: Omit<ClassificationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `rule_${Date.now()}`;
    const now = new Date().toISOString();
    const newRule: ClassificationRule = {
      ...rule,
      id,
      priority: rule.priority ?? 0,
      isActive: rule.isActive ?? true,
      createdAt: now,
      updatedAt: now
    };
    await db.classificationRules.add(newRule);
    return id;
  }

  static async update(id: string, data: Partial<ClassificationRule>): Promise<void> {
    await db.classificationRules.update(id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  static async delete(id: string): Promise<void> {
    await db.classificationRules.delete(id);
  }

  static async match(description: string): Promise<string | null> {
    const rules = await this.getAll();
    const activeRules = rules.filter(r => r.isActive);
    
    for (const rule of activeRules) {
      if (rule.isRegex) {
        try {
          const re = new RegExp(rule.pattern, 'i');
          if (re.test(description)) return rule.category;
        } catch (e) {
          silentFail(`[RuleEngine] Invalid regex: ${rule.pattern}`)(e);
        }
      } else {
        if (description.toLowerCase().includes(rule.pattern.toLowerCase())) {
          return rule.category;
        }
      }
    }
    return null;
  }
}
