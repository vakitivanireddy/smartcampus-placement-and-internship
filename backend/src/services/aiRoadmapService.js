const env = require('../config/env');

function isConfigured() {
  return Boolean(env.ai.apiKey && env.ai.apiUrl && env.ai.model);
}

/**
 * Optional AI integration. It is never required: callers must fall back to the
 * rule-based roadmap when this returns null or throws.
 */
async function generateAiRoadmap({ role, gaps, topics }) {
  if (!isConfigured()) return null;
  const prompt = {
    role: 'You are a placement preparation coach. Return only JSON.',
    instructions: [
      'Create a practical 4-week study roadmap as JSON.',
      'Schema: {"summary": string, "tasks": [{"title": string, "description": string, "priority": "high"|"medium"|"low", "offset_days": number, "skill_name": string|null, "topic_slug": string|null, "resource_url": string|null}]}',
      'Use 6 to 12 tasks. offset_days must be between 1 and 28.',
      'Only use resource URLs supplied in the input. Do not invent URLs.',
      'Address the candidate gaps in priority order. Include practice and mock-interview tasks.',
    ].join(' '),
    target_role: role,
    gaps: gaps.map((gap) => ({
      skill: gap.name,
      priority: gap.priority,
      current: gap.current_proficiency,
      required: gap.required_proficiency,
      resource_url: gap.resource_url,
      topic_slug: gap.topic_slug,
    })),
    available_topics: topics.map((topic) => ({ slug: topic.slug, title: topic.title })),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(env.ai.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: env.ai.model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt.role },
          { role: 'user', content: JSON.stringify(prompt) },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI provider responded with ${response.status}`);
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    if (!parsed || !Array.isArray(parsed.tasks) || parsed.tasks.length < 3) {
      throw new Error('AI response did not include a usable task list.');
    }
    return {
      summary: String(parsed.summary || '').slice(0, 900),
      tasks: parsed.tasks.slice(0, 14).map((task) => ({
        title: String(task.title || 'Study task').slice(0, 220),
        description: String(task.description || '').slice(0, 1200),
        priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
        offset_days: Math.min(28, Math.max(1, Number(task.offset_days) || 7)),
        skill_name: task.skill_name || null,
        topic_slug: task.topic_slug || null,
        resource_url: typeof task.resource_url === 'string' && task.resource_url.startsWith('http') ? task.resource_url : null,
      })),
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { isConfigured, generateAiRoadmap };
