import BusinessDNAEntry from '@/lib/BusinessDNAEntry';
import { requireUser } from '@/lib/apiAuth';

/**
 * PUT /api/dna/entries/:id  — update entry content, tags, customFields (org-scoped).
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const entry = await BusinessDNAEntry.findById(id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  if (entry.organizationId.toString() !== user.organizationId.toString()) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { title, content, tags, customFields, entryType, locationId } = req.body || {};
    if (title !== undefined) entry.title = title;
    if (content !== undefined) entry.content = content;
    if (tags !== undefined) entry.tags = tags;
    if (customFields !== undefined) entry.customFields = customFields;
    if (entryType !== undefined) entry.entryType = entryType;
    if (locationId !== undefined) entry.locationId = locationId;
    await entry.save();
    return res.status(200).json(entry);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update entry', detail: error.message });
  }
}
