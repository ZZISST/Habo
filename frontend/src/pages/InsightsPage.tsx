import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { analysisService } from "@/api/analysis";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Shield,
  RefreshCw,
  Brain,
  Zap,
  Clock,
} from "lucide-react";
import type { FinancialInsight } from "@/types";

/* ───────────────────────── Types ───────────────────────── */

interface Recommendation {
  id: number;
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  category: string;
  potentialSavings?: number;
}

interface RiskAssessment {
  level: "low" | "medium" | "high";
  description: string;
  factors: string[];
}

interface DeepAnalysisResult {
  situation_analysis?: string;
  recommendations?: any[] | string;
  metrics?: Record<string, any>;
  source?: string;
}

interface SavedAnalysis {
  insights: FinancialInsight[];
  recommendations: Recommendation[];
  analysisSections: AnalysisSection[];
  timestamp: string;
}

interface AnalysisSection {
  heading: string;
  bullets: string[];
}

/* ───────────────── Storage helpers ─────────────────────── */

/**
 * Get the current user ID from localStorage so we can scope saved
 * analysis data per-user. This prevents user A from seeing user B's
 * cached insights.
 */
function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id !== undefined && parsed?.id !== null) {
        return String(parsed.id);
      }
    }
  } catch {
    // ignore
  }
  return "unknown";
}

function getStorageKey(): string {
  return `habo_last_deep_analysis_${getCurrentUserId()}`;
}

const MAX_RECS = 5;

function cleanText(line: string): string {
  return line
    .replace(/^#{1,4}\s*/, "")
    .replace(/^[-•*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[🎯💡📈⚠️📊✅🔴🟡🟢🔹🔸▪▸➤→]\s*/, "")
    .replace(/^\*\*([^*]+)\*\*[:\s]*/, "$1: ")
    .replace(/\*\*/g, "")
    .trim();
}

/**
 * Parse raw AI text into structured sections (heading + bullets).
 *
 * Handles:
 * A) Explicit heading lines (ALL-CAPS, markdown ##, bold) followed by bullet lines.
 * B) Numbered items like "1. Label: body text" — each is its own section.
 * C) Numbered items with NO body ("3. Label:") — skipped entirely.
 *
 * Sections with no bullet content are dropped (no empty cards).
 */
function parseAITextIntoSections(text: string): AnalysisSection[] {
  if (!text || text.trim().length === 0) return [];

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const sections: AnalysisSection[] = [];
  let currentHeading = "Общий анализ";
  let currentBullets: string[] = [];

  /** Is this a standalone heading with NO body after the colon? */
  const isStandaloneHeading = (line: string): boolean => {
    // Strip optional leading "3. " for numbered headings-without-body
    const stripped = line.replace(/^\d+[.)]\s*/, "");
    if (/^#{1,4}\s/.test(stripped)) return true;
    if (/^\*\*[^*]+\*\*\s*:?\s*$/.test(stripped)) return true;
    if (/^[А-ЯA-ZЁ\s]{4,}:\s*$/.test(stripped)) return true;
    if (/^\*\*[^*]+\*\*:/.test(stripped) && stripped.length < 80) return true;
    // Mixed-case heading ending with ":" and nothing after
    if (/^[А-ЯA-ZЁ🎯💡📈⚠️📊✅][А-Яа-яёA-Za-z\s:—–-]{3,}:\s*$/.test(stripped))
      return true;
    return false;
  };

  /** Numbered item with label AND body: "1. Оптимизация: Снизить расходы..." */
  const isNumberedItem = (
    line: string,
  ): { label: string; body: string } | null => {
    const m = line.match(/^(?:\d+[.)]\s*)([А-ЯЁа-яёA-Za-z\s]{2,35}):\s*(.+)$/s);
    if (m && m[2].trim().length > 5) {
      return { label: m[1].trim(), body: m[2].trim() };
    }
    return null;
  };

  /** Non-numbered "Label: body text" on one line */
  const isLabelledItem = (
    line: string,
  ): { label: string; body: string } | null => {
    if (/^\d+[.)]\s/.test(line)) return null; // numbered → handled above
    const m = line.match(/^([А-ЯЁа-яёA-Za-z\s]{2,35}):\s+(.{6,})$/s);
    if (m) {
      return { label: m[1].trim(), body: m[2].trim() };
    }
    return null;
  };

  const cleanHeading = (line: string): string => {
    return line
      .replace(/^#{1,4}\s*/, "")
      .replace(/^\*\*/, "")
      .replace(/\*\*\s*:?\s*$/, "")
      .replace(/:\s*$/, "")
      .replace(/^[🎯💡📈⚠️📊✅]\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .trim();
  };

  const pushSection = () => {
    if (currentBullets.length > 0) {
      sections.push({
        heading: currentHeading,
        bullets: [...new Set(currentBullets)],
      });
      currentBullets = [];
    }
  };

  for (const line of lines) {
    // 1) Numbered item with label:body → self-contained section
    const numbered = isNumberedItem(line);
    if (numbered) {
      pushSection();
      sections.push({
        heading: numbered.label,
        bullets: [numbered.body],
      });
      currentHeading = "Общий анализ";
      continue;
    }

    // 2) Standalone heading (including "3. Label:" with no body) → skip empty
    if (isStandaloneHeading(line)) {
      pushSection();
      currentHeading = cleanHeading(line);
      continue;
    }

    // 3) Non-numbered "Label: body text" on one line
    const labelled = isLabelledItem(line);
    if (labelled) {
      pushSection();
      sections.push({
        heading: labelled.label,
        bullets: [labelled.body],
      });
      currentHeading = "Общий анализ";
      continue;
    }

    // 4) Regular line → treat as bullet content
    const cleaned = cleanText(line);
    if (cleaned.length > 10) {
      currentBullets.push(cleaned);
    }
  }

  pushSection();

  // Fallback: if nothing structured, split into sentences
  if (sections.length === 0 && text.length > 30) {
    const sentences = text
      .split(/[.!?]\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15)
      .slice(0, 6);
    if (sentences.length > 0) {
      sections.push({ heading: "Анализ", bullets: sentences });
    }
  }

  // Drop sections with no real content
  return sections.filter(
    (s) => s.bullets.length > 0 && s.bullets.some((b) => b.length > 5),
  );
}

/**
 * Extract recommendation cards from the AI recommendations response.
 *
 * - Each recommendation gets ONE card: title (short label) + description (body).
 * - Empty items are filtered out.
 * - The Insights section is removed entirely (it was duplicating content).
 *   We return an empty insights array.
 */
function extractRecommendationItems(
  recsRaw: any[] | string | undefined | null,
  _situationSections: AnalysisSection[],
): { insights: FinancialInsight[]; recommendations: Recommendation[] } {
  // ── Structured array (rule-based) ──
  if (Array.isArray(recsRaw)) {
    const nonEmpty = recsRaw.filter((item) => {
      if (typeof item === "string") return item.trim().length > 5;
      return (item?.description || item?.title || "").trim().length > 5;
    });
    const recs = nonEmpty
      .slice(0, MAX_RECS)
      .map((item, i) => normalizeToRecommendation(item, i));
    return { insights: [], recommendations: recs };
  }

  // ── String (AI text) ──
  if (typeof recsRaw === "string" && recsRaw.trim().length > 10) {
    const recSections = parseAITextIntoSections(recsRaw);

    const recs: Recommendation[] = [];
    for (let i = 0; i < recSections.length && recs.length < MAX_RECS; i++) {
      const sec = recSections[i];
      const bodyText = sec.bullets.join(". ");
      if (bodyText.length < 5) continue;

      recs.push({
        id: recs.length + 1,
        title: sec.heading,
        description: bodyText,
        impact: detectImpact(bodyText),
        category: detectInsightType(bodyText),
        potentialSavings: 0,
      });
    }

    return { insights: [], recommendations: recs };
  }

  return { insights: [], recommendations: [] };
}

/**
 * Normalize a backend item into a Recommendation card.
 * Title is a short label; description is the full body text.
 * They must NEVER be the same string.
 */
function normalizeToRecommendation(item: any, index: number): Recommendation {
  if (typeof item === "string") {
    // Try to split "Label: body text"
    const m = item.match(/^([А-ЯЁа-яёA-Za-z\s]{2,35}):\s*(.+)$/s);
    if (m && m[2].trim().length > 5) {
      return {
        id: index + 1,
        title: m[1].trim(),
        description: m[2].trim(),
        impact: detectImpact(item),
        category: detectInsightType(item),
        potentialSavings: 0,
      };
    }
    // No label:body pattern — use full text as description, short prefix as title
    return {
      id: index + 1,
      title: "Рекомендация",
      description: item,
      impact: detectImpact(item),
      category: detectInsightType(item),
      potentialSavings: 0,
    };
  }
  if (item.insight_type && item.description) {
    // Rule-based insight object — extract label from description if possible
    const desc = item.description || "";
    const m2 = desc.match(/^([А-ЯЁа-яёA-Za-z\s]{2,35}):\s*(.+)$/s);
    const title = m2
      ? m2[1].trim()
      : item.insight_type === "general"
        ? "Рекомендация"
        : desc.slice(0, 50);
    const body = m2 ? m2[2].trim() : item.suggested_action || desc;
    return {
      id: index + 1,
      title,
      description: body,
      impact: item.impact_level || "medium",
      category: item.insight_type || "general",
      potentialSavings: item.data_points?.potentialSavings || 0,
    };
  }
  // Generic object
  const rawTitle = item.title || "Рекомендация";
  const rawDesc = item.description || item.suggested_action || "";
  return {
    id: item.id || index + 1,
    title: rawTitle,
    description: rawDesc !== rawTitle ? rawDesc : "",
    impact: (item.impact as "low" | "medium" | "high") || "medium",
    category: item.category || "general",
    potentialSavings: item.potentialSavings || 0,
  };
}

function detectImpact(text: string): "low" | "medium" | "high" {
  const lower = text.toLowerCase();
  if (
    lower.includes("срочн") ||
    lower.includes("превыш") ||
    lower.includes("критич") ||
    lower.includes("внимани") ||
    lower.includes("важно") ||
    lower.includes("риск")
  )
    return "high";
  if (
    lower.includes("оптимиз") ||
    lower.includes("рекоменд") ||
    lower.includes("улучш") ||
    lower.includes("сократ") ||
    lower.includes("рассмотр") ||
    lower.includes("цел")
  )
    return "medium";
  return "low";
}

function detectInsightType(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("расход") ||
    lower.includes("трат") ||
    lower.includes("категори")
  )
    return "spending_pattern";
  if (
    lower.includes("сбереж") ||
    lower.includes("эконом") ||
    lower.includes("наклад")
  )
    return "savings_opportunity";
  if (
    lower.includes("бюджет") ||
    lower.includes("превыш") ||
    lower.includes("лимит")
  )
    return "budget_warning";
  if (
    lower.includes("отличн") ||
    lower.includes("хорош") ||
    lower.includes("молодец")
  )
    return "positive_trend";
  if (
    lower.includes("риск") ||
    lower.includes("внимани") ||
    lower.includes("управлен")
  )
    return "budget_warning";
  if (
    lower.includes("цел") ||
    lower.includes("план") ||
    lower.includes("стратег")
  )
    return "savings_opportunity";
  return "general";
}

/* ───────────────── Component ─────────────────────── */

export function InsightsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [_insights, _setInsights] = useState<FinancialInsight[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(
    null,
  );
  const [analysisSections, setAnalysisSections] = useState<AnalysisSection[]>(
    [],
  );
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string | null>(
    null,
  );
  const [analysisPeriodMonths, setAnalysisPeriodMonths] = useState(6);
  const [error, setError] = useState<string | null>(null);

  // Track mounted state so background analysis doesn't update unmounted component
  const mountedRef = useRef(true);
  // Track current user to detect user switches
  const currentUserIdRef = useRef<string>(getCurrentUserId());

  useEffect(() => {
    mountedRef.current = true;
    currentUserIdRef.current = getCurrentUserId();
    loadSavedData();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSavedData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Risk assessment — lightweight, no AI
      const riskData = await analysisService.getRiskAnalysis();
      if (!mountedRef.current) return;
      setRiskAssessment(riskData);

      // Clear legacy shared key (from old code before per-user keys)
      localStorage.removeItem("habo_last_deep_analysis");

      // Restore last analysis from per-user localStorage
      const storageKey = getStorageKey();
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const parsed: SavedAnalysis = JSON.parse(raw);
          // Only restore recommendations and analysisSections — insights
          // section has been removed (it was duplicating content)
          if (parsed.recommendations?.length)
            setRecommendations(parsed.recommendations);
          if (parsed.analysisSections?.length)
            setAnalysisSections(parsed.analysisSections);
          if (parsed.timestamp) setAnalysisTimestamp(parsed.timestamp);
        } catch {
          // corrupt — remove it
          localStorage.removeItem(storageKey);
        }
      }
    } catch (err) {
      console.error("Error loading saved insights:", err);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const requestDeepAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);

    // Capture the user ID at the start so we don't save results to wrong user
    const userId = getCurrentUserId();

    try {
      const result: DeepAnalysisResult =
        await analysisService.requestDeepAnalysis(analysisPeriodMonths);

      // If component unmounted or user changed, discard
      if (!mountedRef.current || getCurrentUserId() !== userId) return;

      const now = new Date().toISOString();

      // Parse situation_analysis into structured sections
      const situationText =
        typeof result.situation_analysis === "string"
          ? result.situation_analysis
          : null;

      const sections = situationText
        ? parseAITextIntoSections(situationText)
        : [];

      // Extract recommendations
      const { recommendations: parsedRecs } = extractRecommendationItems(
        result.recommendations,
        sections,
      );

      if (!mountedRef.current) return;

      setAnalysisSections(sections);
      setRecommendations(parsedRecs);
      setAnalysisTimestamp(now);

      // Save to per-user localStorage for reload persistence
      const toSave: SavedAnalysis = {
        insights: [],
        recommendations: parsedRecs,
        analysisSections: sections,
        timestamp: now,
      };
      const storageKey = `habo_last_deep_analysis_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(toSave));

      // Refresh risk assessment
      try {
        const riskData = await analysisService.getRiskAnalysis();
        if (mountedRef.current) {
          setRiskAssessment(riskData);
        }
      } catch {
        // non-critical
      }

      if (result.source === "cache") {
        console.info("Analysis returned from Redis cache.");
      }
    } catch (err) {
      console.error("Error requesting deep analysis:", err);
      if (mountedRef.current) {
        setError("Не удалось выполнить анализ. Попробуйте позже.");
      }
    } finally {
      if (mountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, [analysisPeriodMonths]);

  const hasAnyData = recommendations.length > 0 || analysisSections.length > 0;

  /* ─── Formatting helpers ─── */

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount);

  const getImpactBadge = (impact: "low" | "medium" | "high") => {
    const styles = {
      low: "bg-blue-100 text-blue-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-red-100 text-red-700",
    };
    const labels = { low: "Низкий", medium: "Средний", high: "Высокий" };
    return <Badge className={styles[impact]}>{labels[impact]}</Badge>;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "spending_pattern":
        return <TrendingUp className="h-5 w-5 text-orange-500" />;
      case "savings_opportunity":
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case "budget_warning":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "positive_trend":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Sparkles className="h-5 w-5 text-purple-500" />;
    }
  };

  const getRiskColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "high":
        return "text-red-600 bg-red-100";
    }
  };

  const getRiskLabel = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "Низкий";
      case "medium":
        return "Средний";
      case "high":
        return "Высокий";
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return ts;
    }
  };

  const sectionIcon = (heading: string) => {
    const h = heading.toLowerCase();
    if (h.includes("оценк") || h.includes("общ"))
      return <Shield className="h-5 w-5 text-blue-500" />;
    if (h.includes("структур") || h.includes("расход"))
      return <TrendingUp className="h-5 w-5 text-orange-500" />;
    if (h.includes("рекоменд") || h.includes("действ") || h.includes("оптим"))
      return <Lightbulb className="h-5 w-5 text-yellow-500" />;
    if (h.includes("вниман") || h.includes("предупр"))
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (h.includes("цел") || h.includes("страт"))
      return <Target className="h-5 w-5 text-green-500" />;
    return <Brain className="h-5 w-5 text-purple-500" />;
  };

  /* ─── Loading state ─── */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <RefreshCw className="h-8 w-8 text-purple-400 animate-spin" />
        <p className="text-gray-500">Загрузка данных...</p>
      </div>
    );
  }

  /* ─── Render ─── */
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            AI Инсайты
          </h1>
          <p className="text-gray-600 mt-1">
            Персонализированные рекомендации на основе анализа ваших финансов
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={analysisPeriodMonths}
            onChange={(e) => setAnalysisPeriodMonths(Number(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm bg-white"
            disabled={isAnalyzing}
          >
            <option value={1}>1 месяц</option>
            <option value={3}>3 месяца</option>
            <option value={6}>6 месяцев</option>
            <option value={12}>12 месяцев</option>
          </select>
          <Button onClick={requestDeepAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Анализируем...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Глубокий анализ
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Last analysis timestamp */}
      {analysisTimestamp && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          Последний анализ: {formatTimestamp(analysisTimestamp)}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-700 text-sm">{error}</p>
        </Card>
      )}

      {/* Risk Assessment */}
      {riskAssessment && (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-full ${getRiskColor(riskAssessment.level)}`}
            >
              <Shield className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">
                  Оценка финансового здоровья
                </h3>
                <Badge className={getRiskColor(riskAssessment.level)}>
                  {getRiskLabel(riskAssessment.level)}
                </Badge>
              </div>
              <p className="text-gray-600 mb-3">{riskAssessment.description}</p>
              <div className="space-y-1">
                {riskAssessment.factors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm text-gray-500"
                  >
                    <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    {factor}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Analyzing banner — non-blocking, shows alongside existing data */}
      {isAnalyzing && (
        <Card className="p-6 border-purple-200 bg-purple-50">
          <div className="flex items-center gap-4">
            <RefreshCw className="h-8 w-8 text-purple-500 animate-spin flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-purple-800 mb-1">
                AI анализирует ваши финансы...
              </h3>
              <p className="text-purple-600 text-sm">
                Это может занять 30–120 секунд. Вы можете продолжить
                пользоваться приложением — результаты появятся автоматически.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Empty state — no analysis yet, not analyzing */}
      {!hasAnyData && !isAnalyzing && (
        <Card className="p-12 text-center">
          <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Нажмите «Глубокий анализ» для получения инсайтов
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            AI проанализирует ваши транзакции за выбранный период и даст
            персонализированные рекомендации по методу Кэкэйбо.
          </p>
          <Button
            onClick={requestDeepAnalysis}
            disabled={isAnalyzing}
            size="lg"
          >
            <Zap className="mr-2 h-4 w-4" />
            Запустить анализ
          </Button>
        </Card>
      )}

      {/* ──── AI Analysis Sections (replaces raw text dump) ──── */}
      {analysisSections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Результат анализа
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysisSections.map((section, sIdx) => (
              <Card key={sIdx} className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  {sectionIcon(section.heading)}
                  <h3 className="font-semibold text-gray-900">
                    {section.heading}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {section.bullets.map((bullet, bIdx) => (
                    <li
                      key={bIdx}
                      className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                      <span className="break-words">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ──── Recommendations ──── */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Рекомендации
          </h2>
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <Card
                key={rec.id}
                className="p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0 mt-0.5">
                    {getInsightIcon(rec.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900">
                        {rec.title}
                      </p>
                      {getImpactBadge(rec.impact)}
                    </div>
                    {rec.description && (
                      <p className="text-sm text-gray-700 mt-1 break-words leading-relaxed">
                        {rec.description}
                      </p>
                    )}
                    {rec.potentialSavings !== undefined &&
                      rec.potentialSavings > 0 && (
                        <p className="text-sm text-green-600 mt-2 font-medium">
                          Потенциальная экономия:{" "}
                          {formatCurrency(rec.potentialSavings)}/мес
                        </p>
                      )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ──── Savings Summary ──── */}
      {recommendations.length > 0 &&
        recommendations.some((r) => (r.potentialSavings || 0) > 0) && (
          <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Потенциальная экономия
                </h3>
                <p className="text-gray-600">
                  Следуя рекомендациям, вы можете сэкономить до{" "}
                  <span className="font-bold text-green-600">
                    {formatCurrency(
                      recommendations.reduce(
                        (sum, r) => sum + (r.potentialSavings || 0),
                        0,
                      ),
                    )}
                  </span>{" "}
                  в месяц
                </p>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(
                  recommendations.reduce(
                    (sum, r) => sum + (r.potentialSavings || 0),
                    0,
                  ) * 12,
                )}
                <span className="text-sm font-normal text-gray-500 block text-right">
                  в год
                </span>
              </div>
            </div>
          </Card>
        )}
    </div>
  );
}
