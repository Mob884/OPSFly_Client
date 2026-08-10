import BusinessDNAEntry from '@/lib/BusinessDNAEntry';
import { requireUser } from '@/lib/apiAuth';
import { recordDNAEntry } from '@/lib/businessDNA';

/**
 * GET  /api/dna/entries  — list flexible DNA entries for this org
 *                          (query: entryType, locationId, tags, limit, skip).
 * POST /api/dna/entries  — create a flexible DNA entry (+ Vault 1 mirror).
 *
 * Entries are STRICTLY scoped to the org from the token.
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const organizationId = user.organizationId;

  if (req.method === 'GET') {
    try {
      const { entryType, locationId, tags, limit = 20, skip = 0 } = req.query;
      const query = { organizationId, isActive: { $ne: false } };
      if (entryType) query.entryType = entryType;
      if (locationId) query.locationId = locationId;
      if (tags) {
        const tagList = Array.isArray(tags) ? tags : String(tags).split(',');
        query.tags = { $in: tagList };
      }

      const [entries, total] = await Promise.all([
        BusinessDNAEntry.find(query)
          .sort({ createdAt: -1 })
          .skip(parseInt(skip, 10) || 0)
          .limit(parseInt(limit, 10) || 20),
        BusinessDNAEntry.countDocuments(query),
      ]);

      return res.status(200).json({ entries, total });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch entries', detail: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { entryType, title, content, tags, customFields, locationId } = req.body || {};
      if (!entryType) return res.status(400).json({ error: 'entryType is required' });
      if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

      const entry = await recordDNAEntry({
        organizationId,
        locationId,
        entryType,
        title,
        content: content.trim(),
        sourceType: 'manual',
        tags: Array.isArray(tags) ? tags : [],
        customFields,
      });

      return res.status(201).json(entry);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create entry', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
