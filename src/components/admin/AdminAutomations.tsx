import { useState } from 'react';
import { AutomationRule, User, Child } from '../../types';
import { AutomationsManagement } from './AutomationsManagement';
import { AutomationRuleForm } from './AutomationRuleForm';

interface AdminAutomationsProps {
  rules: AutomationRule[];
  employees: User[];
}

export function AdminAutomations({ rules, employees }: AdminAutomationsProps) {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedRule, setSelectedRule] = useState<AutomationRule | undefined>();

  const handleNavigateToCreate = () => {
    setSelectedRule(undefined);
    setView('create');
  };

  const handleNavigateToEdit = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setView('edit');
  };

  const handleBack = () => {
    setSelectedRule(undefined);
    setView('list');
  };

  if (view === 'create') {
    return <AutomationRuleForm employees={employees} onBack={handleBack} />;
  }

  if (view === 'edit' && selectedRule) {
    return <AutomationRuleForm rule={selectedRule} employees={employees} onBack={handleBack} />;
  }

  return (
    <AutomationsManagement
      rules={rules}
      onNavigateToCreate={handleNavigateToCreate}
      onNavigateToEdit={handleNavigateToEdit}
    />
  );
}
