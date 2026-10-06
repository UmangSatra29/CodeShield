import type { Types } from 'mongoose';
import { aiJson } from './ai.js';
import { config } from '../config.js';
import { buildVisibleTestEvaluation } from './visible-test-evaluation.js';

type GradeQuestion = { _id: Types.ObjectId | string; title: string; description?: string; marks: number };

export async function buildAssessmentEvaluation(assignment: any, assessment: any) {
  const visibleTestFallback = buildVisibleTestEvaluation(assignment.questions || [], assessment.executionResults || []);
  const aiConfigured = Boolean(config.aiUrl && config.aiKey && config.aiModel);
  if (!aiConfigured) return { ...visibleTestFallback, aiStatus: 'not_configured' };
  try {
    const proposal = await aiJson<{ suggestedScore: number; feedback: string; criteria?: unknown[] }>(
      'Evaluate this submitted programming assignment for the teacher. Return JSON with suggestedScore (number 0 to 100), feedback (concise actionable summary), and criteria (array of criterion, score, evidence, reason). Use the rubric, each question answer, and visible test results. Do not invent evidence, hidden test results, or student intentions. If a question has no test run, say so and recommend teacher review. This is a provisional proposal; never claim it is approved.',
      {
        rubric: assignment.rubric || [],
        questions: (assignment.questions || []).map((q: GradeQuestion) => ({ id: String(q._id), title: q.title, description: q.description, marks: q.marks })),
        submittedAnswers: assessment.questionSubmissions || [],
        visibleTestResults: assessment.executionResults || [],
        viva: assessment.viva || [],
      },
    );
    if (!Number.isFinite(proposal.suggestedScore) || typeof proposal.feedback !== 'string') throw new Error('AI evaluation returned an invalid score or summary');
    return {
      ...proposal,
      suggestedScore: Math.max(0, Math.min(100, Math.round(proposal.suggestedScore))),
      criteria: Array.isArray(proposal.criteria) ? proposal.criteria : visibleTestFallback.criteria,
      source: 'ai',
      aiStatus: 'complete',
      generatedAt: new Date(),
      requiresTeacherReview: true,
    };
  } catch (error: any) {
    return {
      ...visibleTestFallback,
      aiStatus: 'unavailable',
      feedback: `${visibleTestFallback.feedback} AI evaluation could not be reached; this proposal uses visible-test evidence only.`,
      generationError: String(error?.message || 'AI provider error').slice(0, 300),
    };
  }
}
