import type { LucideIcon } from "lucide-react";

export type SkillOutputType = "hooks" | "captions" | "repurposed" | "analysis" | "plan";

export interface Skill {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  inputLabel: string;
  inputPlaceholder: string;
  outputType: SkillOutputType;
  credits: number;
  activeOnRoutes: string[];
}

export const SKILLS: Skill[] = [
  {
    id: "hook-library",
    label: "Hook Library",
    color: "#60a5fa",
    bgColor: "rgba(96,165,250,0.1)",
    inputLabel: "Topic or content idea",
    inputPlaceholder: "e.g. 'how I grew 10k followers in 30 days'",
    outputType: "hooks",
    credits: 1,
    activeOnRoutes: ["/ai-ideas", "/scheduling", "/documents", "/caption-writer", "/hook-library", "/tracking/competitor", "/repurpose"],
  },
  {
    id: "caption-writer",
    label: "Caption Writer",
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.1)",
    inputLabel: "What's your post about?",
    inputPlaceholder: "e.g. 'morning routine video, motivational, targeting creators'",
    outputType: "captions",
    credits: 1,
    activeOnRoutes: ["/ai-ideas", "/scheduling", "/documents", "/caption-writer"],
  },
  {
    id: "content-repurposer",
    label: "Content Repurposer",
    color: "#f472b6",
    bgColor: "rgba(244,114,182,0.1)",
    inputLabel: "Content to repurpose",
    inputPlaceholder: "Paste your script, caption, or post...",
    outputType: "repurposed",
    credits: 2,
    activeOnRoutes: ["/ai-ideas", "/documents", "/repurpose", "/caption-writer", "/scheduling"],
  },
  {
    id: "niche-intelligence",
    label: "Niche Intelligence",
    color: "#fb923c",
    bgColor: "rgba(251,146,60,0.1)",
    inputLabel: "Your niche or topic",
    inputPlaceholder: "e.g. 'personal finance for Gen Z'",
    outputType: "analysis",
    credits: 2,
    activeOnRoutes: ["/ai-ideas", "/tracking/competitor", "/niche-intelligence"],
  },
  {
    id: "content-analyser",
    label: "Content Analyser",
    color: "#a78bfa",
    bgColor: "rgba(167,139,250,0.1)",
    inputLabel: "Content to analyse",
    inputPlaceholder: "Paste your script, caption, or hook...",
    outputType: "analysis",
    credits: 1,
    activeOnRoutes: ["/content-analyser", "/ai-ideas", "/documents", "/video-editor"],
  },
  {
    id: "ai-video-editor",
    label: "AI Video Editor",
    color: "#d4b461",
    bgColor: "rgba(212,180,97,0.1)",
    inputLabel: "Describe your video",
    inputPlaceholder: "e.g. 'talking head about morning routines, 60 seconds, casual vibe'",
    outputType: "plan",
    credits: 2,
    activeOnRoutes: ["/video-editor", "/video-studio"],
  },
];

export function getActiveSkills(pathname: string): Skill[] {
  return SKILLS.filter(s => s.activeOnRoutes.some(r => pathname.startsWith(r)));
}
