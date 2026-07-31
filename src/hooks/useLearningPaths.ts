import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LearningPathSummary {
  slug: string;
  title: string;
  subtitle: string | null;
  domain: string;
  description: string | null;
  step_count: number;
  completed_count: number;
}

export interface LearningPathStep {
  step_order: number;
  concept_slug: string;
  title: string;
  arabic_term: string | null;
  summary: string | null;
  lesson_count: number;
  completed: boolean;
}

export interface LearningPathDetail {
  slug: string;
  title: string;
  subtitle: string | null;
  domain: string;
  description: string | null;
  steps: LearningPathStep[];
}

/** MVP-6 — published curricula built on the concept graph. */
export function useLearningPaths() {
  return useQuery({
    queryKey: ["learning-paths"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<LearningPathSummary[]> => {
      const { data, error } = await supabase.rpc("get_learning_paths");
      if (error) throw error;
      return (data ?? []) as LearningPathSummary[];
    },
  });
}

export function useLearningPath(slug: string | undefined) {
  return useQuery({
    queryKey: ["learning-path", slug],
    enabled: Boolean(slug),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<LearningPathDetail | null> => {
      const { data, error } = await supabase.rpc("get_learning_path", { _slug: slug });
      if (error) throw error;
      return (data as unknown as LearningPathDetail | null) ?? null;
    },
  });
}

export function useSetStepProgress(pathSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { conceptSlug: string; completed: boolean }) => {
      const { error } = await supabase.rpc("set_learning_step_progress", {
        _path_slug: pathSlug,
        _concept_slug: vars.conceptSlug,
        _completed: vars.completed,
      });
      if (error) throw error;
      return vars;
    },
    onMutate: async (vars) => {
      const key = ["learning-path", pathSlug];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<LearningPathDetail | null>(key);
      if (prev) {
        qc.setQueryData<LearningPathDetail>(key, {
          ...prev,
          steps: prev.steps.map((s) =>
            s.concept_slug === vars.conceptSlug ? { ...s, completed: vars.completed } : s,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["learning-path", pathSlug], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["learning-path", pathSlug] });
      qc.invalidateQueries({ queryKey: ["learning-paths"] });
    },
  });
}
