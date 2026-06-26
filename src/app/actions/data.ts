'use server';

export async function exportData(format?: string) {
  // Stub implementation
  return { success: true };
}

export async function importData(data: { persons: any[]; relationships: any[] }) {
  // Stub implementation
  return { success: true, imported: { persons: data.persons.length, relationships: data.relationships.length } };
}
