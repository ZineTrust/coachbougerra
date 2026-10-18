import type { MemberTitle } from "./permissions";

/*
  "Mon parcours": the steps suggested to a member, depending on the rank they
  chose at sign-up. A "video" step takes the next published formation, in the
  order the team set in the workspace (so the first formations are the "start
  here" ones); if there are fewer formations than video steps, the extra steps
  simply don't appear. Scripts are the toolbox ones (src/lib/toolbox.ts).
*/

export type StepKind = "profile" | "video" | "toolbox" | "live";

export interface PathStep {
  kind: StepKind;
  /** formation slug (filled in by resolvePath) or toolbox script id */
  ref?: string;
}

/** The key stored in member_progress for a step (profile and live are derived). */
export const stepKey = (s: PathStep) =>
  s.kind === "video" ? `video:${s.ref}` : s.kind === "toolbox" ? `toolbox:${s.ref}` : s.kind;

const TEMPLATES: Record<MemberTitle, PathStep[]> = {
  consultant: [
    { kind: "profile" },
    { kind: "video" },
    { kind: "video" },
    { kind: "toolbox", ref: "reprendre-contact" },
    { kind: "video" },
    { kind: "live" },
    { kind: "video" },
    { kind: "video" },
    { kind: "video" },
  ],
  manager: [
    { kind: "profile" },
    { kind: "video" },
    { kind: "toolbox", ref: "presenter-simplement" },
    { kind: "video" },
    { kind: "toolbox", ref: "trop-cher" },
    { kind: "live" },
    { kind: "video" },
    { kind: "toolbox", ref: "bienvenue-equipe" },
  ],
  senior_manager: [
    { kind: "profile" },
    { kind: "video" },
    { kind: "toolbox", ref: "point-hebdo" },
    { kind: "video" },
    { kind: "toolbox", ref: "encourager" },
    { kind: "live" },
    { kind: "video" },
  ],
  director: [
    { kind: "profile" },
    { kind: "video" },
    { kind: "toolbox", ref: "encourager" },
    { kind: "toolbox", ref: "point-hebdo" },
    { kind: "video" },
    { kind: "live" },
    { kind: "video" },
  ],
};

/**
 * The member's path with each video step tied to a real formation: the published
 * formations in the team's order, one per video step. `slugs` must already be in that order.
 */
export function resolvePath(title: MemberTitle, slugs: readonly string[]): PathStep[] {
  let next = 0;
  const steps: PathStep[] = [];
  for (const step of TEMPLATES[title]) {
    if (step.kind !== "video") {
      steps.push(step);
      continue;
    }
    const slug = slugs[next++];
    if (slug !== undefined) steps.push({ kind: "video", ref: slug });
  }
  return steps;
}

export interface PathContext {
  profileComplete: boolean;
  /** keys from member_progress */
  doneKeys: ReadonlySet<string>;
  reservations: number;
}

export function isStepDone(step: PathStep, ctx: PathContext): boolean {
  if (step.kind === "profile") return ctx.profileComplete;
  if (step.kind === "live") return ctx.reservations > 0;
  return ctx.doneKeys.has(stepKey(step));
}
