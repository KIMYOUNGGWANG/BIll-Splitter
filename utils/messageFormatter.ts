export function formatAssignmentMessage(itemName: string, names: string[]): string {
  const formatAssignmentText = (nameList: string[]): string => {
    if (nameList.length === 0) return 'unassigned';
    if (nameList.length === 1) return `assigned to ${nameList[0]}`;
    if (nameList.length === 2) return `assigned to ${nameList.join(' and ')}`;
    const last = nameList[nameList.length - 1];
    const initial = nameList.slice(0, nameList.length - 1);
    return `assigned to ${initial.join(', ')}, and ${last}`;
  };
  
  return `${itemName} is now ${formatAssignmentText(names)}.`;
}

export function formatAssignmentUpdateMessage(changedItemNames: string[]): string {
    if (changedItemNames.length === 0) {
        return "No assignments were changed.";
    }
    return `Assignments updated for: ${changedItemNames.join(', ')}.`;
}
