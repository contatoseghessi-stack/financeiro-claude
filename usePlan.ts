import { trpc } from "@/lib/trpc";

export function usePlan() {
  const { data: planData, isLoading } = trpc.billing.getPlan.useQuery();
  const { data: usage } = trpc.billing.getUsage.useQuery();

  const currentPlan = planData?.currentPlan || "free";
  const limits = planData?.limits;

  function canUseFeature(feature: "reportsPDF" | "dre" | "goals" | "quotes" | "telegram" | "prioritySupport"): boolean {
    if (!limits) return false;
    switch (feature) {
      case "reportsPDF": return limits.hasReportsPDF;
      case "dre": return limits.hasDRE;
      case "goals": return limits.hasGoals;
      case "quotes": return limits.hasQuotes;
      case "telegram": return limits.hasTelegram;
      case "prioritySupport": return limits.hasPrioritySupport;
      default: return false;
    }
  }

  function isAtLimit(resource: "transactions" | "jobs" | "cards" | "categories" | "recurrences" | "uploads"): { atLimit: boolean; current: number; max: number } {
    if (!limits || !usage) return { atLimit: false, current: 0, max: -1 };
    
    switch (resource) {
      case "transactions":
        return { atLimit: limits.maxTransactionsPerMonth !== -1 && usage.transactionsThisMonth >= limits.maxTransactionsPerMonth, current: usage.transactionsThisMonth, max: limits.maxTransactionsPerMonth };
      case "jobs":
        return { atLimit: limits.maxActiveJobs !== -1 && usage.activeJobs >= limits.maxActiveJobs, current: usage.activeJobs, max: limits.maxActiveJobs };
      case "cards":
        return { atLimit: limits.maxCards !== -1 && usage.totalCards >= limits.maxCards, current: usage.totalCards, max: limits.maxCards };
      case "categories":
        return { atLimit: limits.maxCategories !== -1 && usage.totalCategories >= limits.maxCategories, current: usage.totalCategories, max: limits.maxCategories };
      case "recurrences":
        return { atLimit: limits.maxRecurrences !== -1 && usage.totalRecurrences >= limits.maxRecurrences, current: usage.totalRecurrences, max: limits.maxRecurrences };
      case "uploads":
        return { atLimit: limits.maxUploadsPerMonth !== -1 && usage.uploadsThisMonth >= limits.maxUploadsPerMonth, current: usage.uploadsThisMonth, max: limits.maxUploadsPerMonth };
      default:
        return { atLimit: false, current: 0, max: -1 };
    }
  }

  function requiredPlanFor(feature: "reportsPDF" | "dre" | "goals" | "quotes" | "telegram" | "prioritySupport"): "pro" | "business" {
    if (feature === "telegram" || feature === "prioritySupport") return "business";
    return "pro";
  }

  return {
    currentPlan,
    limits,
    usage,
    isLoading,
    canUseFeature,
    isAtLimit,
    requiredPlanFor,
    isPro: currentPlan === "pro" || currentPlan === "business",
    isBusiness: currentPlan === "business",
  };
}
