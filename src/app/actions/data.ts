'use server';

export async function exportData(type: string) {
  // Stub – in production, generate JSON and return a downloadable URL
  return { ok: true, message: 'Export stub' };
}

export async function importData(formData: FormData) {
  // Stub – in production, parse and import data
  return { ok: true, message: 'Import stub' };
}
