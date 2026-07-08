import { useLocation } from "wouter";
import { getActiveSkills, type Skill } from "@/lib/skills";

export function useActiveSkills(): Skill[] {
  const [location] = useLocation();
  return getActiveSkills(location);
}
