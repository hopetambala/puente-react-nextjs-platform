import { buildSystemPrompt } from 'server/agent/prompt';

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt({ organization: 'Puente-DR', username: 'maria' });

  it('scopes the assistant to the caller organization', () => {
    expect(prompt).toContain('Puente-DR');
  });

  it('instructs the model to answer in the language of the question', () => {
    expect(prompt).toMatch(/language of the (user'?s? )?question|same language/i);
  });

  it('forbids fabricating numbers — tool results only', () => {
    expect(prompt).toMatch(/never (fabricate|invent|guess|make up)/i);
    expect(prompt).toMatch(/tool result/i);
  });

  it('declares the assistant read-only and tells it to refuse write requests', () => {
    expect(prompt).toMatch(/read.only/i);
    expect(prompt).toMatch(/refuse|cannot (modify|edit|delete|change)/i);
  });

  it('includes the current date so relative dates resolve correctly', () => {
    const year = String(new Date().getFullYear());
    expect(prompt).toContain(year);
  });
});
