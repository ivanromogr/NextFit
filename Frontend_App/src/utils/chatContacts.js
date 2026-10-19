export const contactName = (contact) => String(contact.alias || [contact.nombre, contact.apellido].filter(Boolean).join(' ') || 'Contacto');

export function mergeChatContacts(...lists) {
  const contacts = new Map();
  for (const list of lists) {
    for (const contact of Array.isArray(list) ? list : []) {
      if (!contact || !['string', 'number'].includes(typeof contact.id) || String(contact.id).trim() === '') continue;
      const key = String(contact.id);
      const previous = contacts.get(key);
      contacts.set(key, { ...previous, ...contact, alias: contact.alias || previous?.alias || '' });
    }
  }
  return Array.from(contacts.values());
}

export function filterChatContacts(contacts, query) {
  const term = query.trim().toLocaleLowerCase();
  return contacts.filter((contact) => `${contactName(contact)} ${contact.nombre || ''} ${contact.apellido || ''}`.toLocaleLowerCase().includes(term));
}
