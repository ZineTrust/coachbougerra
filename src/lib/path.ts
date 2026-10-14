import type { MemberTitle } from "./permissions";

/*
  "Mon parcours": the steps suggested to a member, depending on the rank they
  chose at sign-up. Titles come from the formations / scripts themselves, so a
  step is just a kind and an optional reference.

  SAMPLE: built on the sample formations in data.ts. When real formations are
  published, these lists move into the workspace.
*/

export type StepKind = "profile" | "video" | "toolbox" | "live";

export interface PathStep {
  kind: StepKind;
  /** video slug or toolbox script id */
  ref?: string;
}

/** The key stored in member_progress for a step (profile and live are derived). */
export const stepKey = (s: PathStep) =>
  s.kind === "video" ? `video:${s.ref}` : s.kind === "toolbox" ? `toolbox:${s.ref}` : s.kind;

export const PATHS: Record<MemberTitle, PathStep[]> = {
  consultant: [
    { kind: "profile" },
    { kind: "video", ref: "bienvenue-par-ou-commencer" },
    { kind: "video", ref: "sept-erreurs-du-debutant" },
    { kind: "toolbox", ref: "reprendre-contact" },
    { kind: "video", ref: "demarrer-une-conversation" },
    { kind: "live" },
    { kind: "video", ref: "rester-constant" },
    { kind: "video", ref: "connaitre-les-produits" },
    { kind: "video", ref: "programme-30-premiers-jours" },
  ],
  manager: [
    { kind: "profile" },
    { kind: "video", ref: "presenter-lopportunite" },
    { kind: "toolbox", ref: "presenter-simplement" },
    { kind: "video", ref: "gerer-les-objections" },
    { kind: "toolbox", ref: "trop-cher" },
    { kind: "live" },
    { kind: "video", ref: "masterclass-batir-une-equipe" },
    { kind: "toolbox", ref: "bienvenue-equipe" },
  ],
  senior_manager: [
    { kind: "profile" },
    { kind: "video", ref: "masterclass-batir-une-equipe" },
    { kind: "toolbox", ref: "point-hebdo" },
    { kind: "video", ref: "reseaux-sociaux-bons-contacts" },
    { kind: "toolbox", ref: "encourager" },
    { kind: "live" },
    { kind: "video", ref: "rester-constant" },
  ],
  director: [
    { kind: "profile" },
    { kind: "video", ref: "masterclass-batir-une-equipe" },
    { kind: "toolbox", ref: "encourager" },
    { kind: "toolbox", ref: "point-hebdo" },
    { kind: "video", ref: "reseaux-sociaux-bons-contacts" },
    { kind: "live" },
    { kind: "video", ref: "rester-constant" },
  ],
};

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
