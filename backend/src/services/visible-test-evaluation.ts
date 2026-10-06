import type { Types } from 'mongoose';

type GradeQuestion = { _id: Types.ObjectId | string; title: string; marks: number };
type RunRecord = { questionId: Types.ObjectId | string; result?: { results?: Array<{ passed?: boolean }>; passed?: number; total?: number } };

/** Transparent provisional grade from the latest visible-test run for each question. */
export function buildVisibleTestEvaluation(questions: GradeQuestion[], executions: RunRecord[]) {
  let passed = 0;
  let total = 0;
  const criteria = questions.map((question) => {
    const latest = [...executions].reverse().find((run) => String(run.questionId) === String(question._id));
    const caseResults = latest?.result?.results;
    const questionPassed = caseResults ? caseResults.filter((item) => item.passed).length : Number(latest?.result?.passed || 0);
    const questionTotal = caseResults ? caseResults.length : Number(latest?.result?.total || 0);
    passed += questionPassed;
    total += questionTotal;
    return {
      criterion: question.title,
      passed: questionPassed,
      total: questionTotal,
      evidence: questionTotal ? `${questionPassed}/${questionTotal} visible tests passed in the latest run.` : 'No visible test run was recorded for this question.',
    };
  });
  const suggestedScore = total ? Math.round((passed / total) * 100) : null;
  const feedback = total
    ? `Provisional visible-test score: ${suggestedScore}/100 (${passed}/${total} tests passed). This does not assess hidden tests, code quality, or viva answers; review the submission before publishing a final grade.`
    : 'No visible test results were recorded. Review the submitted code and assign a score manually before publishing.';
  return {
    source: 'visible-tests',
    suggestedScore,
    feedback,
    criteria,
    generatedAt: new Date(),
    requiresTeacherReview: true,
  };
}
