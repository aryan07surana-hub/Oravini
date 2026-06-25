import { useVaultStore } from '@/stores/vaultStore'

export type CaptureSource =
  | 'content_idea'
  | 'competitor_study'
  | 'recording'
  | 'virality_test'
  | 'ai_insight'
  | 'niche_analysis'
  | 'niche_hook'
  | 'niche_ideas'

const SOURCE_FOLDER: Record<CaptureSource, string> = {
  content_idea: 'Ideas',
  competitor_study: 'Research',
  recording: 'Recordings',
  virality_test: 'Research',
  ai_insight: 'Ideas',
  niche_analysis: 'Niches',
  niche_hook: 'Hooks',
  niche_ideas: 'Ideas',
}

const SOURCE_TAG: Record<CaptureSource, string> = {
  content_idea: 'idea',
  competitor_study: 'competitor',
  recording: 'recording',
  virality_test: 'virality',
  ai_insight: 'ai-insight',
  niche_analysis: 'niche',
  niche_hook: 'hook',
  niche_ideas: 'niche-idea',
}

export function captureToVault(
  source: CaptureSource,
  title: string,
  content: string,
  extra?: Record<string, string>
) {
  const store = useVaultStore.getState()
  const slug = title.replace(/[^a-zA-Z0-9\s-]/g, '').trim().slice(0, 60)
  const timestamp = new Date().toISOString().slice(0, 10)
  const fileName = `${timestamp} ${slug}.md`
  const folder = SOURCE_FOLDER[source]
  const tag = SOURCE_TAG[source]

  const existing = store.files.find(
    (f) => f.folder === folder && f.name === fileName
  )
  if (existing) return existing

  const properties = { source, ...extra }
  const fullContent = buildContent(title, content, tag, properties)

  const file = store.createFile(fileName, folder, fullContent)
  return file
}

function buildContent(
  title: string,
  body: string,
  tag: string,
  props: Record<string, string>
): string {
  const propLines = Object.entries(props)
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join('\n')

  return `# ${title}

## Properties
${propLines}

---

${body}

#${tag}
`
}
