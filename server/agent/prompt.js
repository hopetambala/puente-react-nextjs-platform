import fs from 'fs';
import path from 'path';

/**
 * System prompt for the Puente data assistant.
 *
 * The prompt text lives in prompt.md (plain markdown, easy to edit) with
 * {{username}}, {{organization}} and {{today}} placeholders substituted here.
 *
 * Grant commitments encoded in the prompt (do not weaken when editing):
 * - Bilingual: answer in the language of the user's question.
 * - Honest about uncertainty: wrong data is worse than missing data.
 * - Read-only: the agent proposes nothing and changes nothing in Year 1.
 */
const TEMPLATE_PATH = path.join(process.cwd(), 'server', 'agent', 'prompt.md');

// Read the template once at module load — it never changes at runtime, so
// re-reading it on every request just adds a synchronous disk hit to the
// request hot path.
const TEMPLATE = fs.readFileSync(TEMPLATE_PATH, 'utf8');

const buildSystemPrompt = ({ organization, username }) =>
  TEMPLATE
    .replaceAll('{{username}}', username)
    .replaceAll('{{organization}}', organization)
    .replaceAll('{{today}}', new Date().toISOString().slice(0, 10));

export { buildSystemPrompt };
export default buildSystemPrompt;
