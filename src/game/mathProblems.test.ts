import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTEGRAL_PROBLEMS,
  drawNotebookProblems,
  shuffleProblemChoices,
} from './mathProblems';

test('all 3 difficulties have at least 24 verified problems', () => {
  const facil = INTEGRAL_PROBLEMS.filter((p) => p.difficulty === 'facil');
  const medio = INTEGRAL_PROBLEMS.filter((p) => p.difficulty === 'medio');
  const dificil = INTEGRAL_PROBLEMS.filter((p) => p.difficulty === 'dificil');

  assert.ok(facil.length >= 24, `expected >=24 facil, got ${facil.length}`);
  assert.ok(medio.length >= 24, `expected >=24 medio, got ${medio.length}`);
  assert.ok(dificil.length >= 24, `expected >=24 dificil, got ${dificil.length}`);
});

test('every problem has 4 unique non-empty choices and a valid correctIndex', () => {
  const seenIds = new Set<string>();
  for (const p of INTEGRAL_PROBLEMS) {
    assert.ok(!seenIds.has(p.id), `duplicate problem id ${p.id}`);
    seenIds.add(p.id);
    assert.equal(p.choices.length, 4, `problem ${p.id} must have 4 choices`);
    assert.ok(
      p.correctIndex >= 0 && p.correctIndex <= 3,
      `problem ${p.id} invalid correctIndex`
    );
    const uniqueChoices = new Set(p.choices.map((c) => c.trim()));
    assert.equal(
      uniqueChoices.size,
      4,
      `problem ${p.id} has duplicate choices: ${p.choices.join(', ')}`
    );
    for (const c of p.choices) {
      assert.ok(c.trim().length > 0, `problem ${p.id} has empty choice`);
    }
  }
});

test('shuffleProblemChoices preserves the exact correct answer text', () => {
  const sample = INTEGRAL_PROBLEMS[0];
  const expectedText = sample.choices[sample.correctIndex];
  const shuffled = shuffleProblemChoices(sample, () => 0.37);
  assert.equal(shuffled.choices[shuffled.correctIndex], expectedText);
  assert.equal(new Set(shuffled.choices).size, 4);
});

test('drawNotebookProblems yields 21 non-repeating problems across 7 notebooks per difficulty', () => {
  for (const diff of ['facil', 'medio', 'dificil'] as const) {
    const used = new Set<string>();
    const allIds: string[] = [];
    for (let nb = 0; nb < 7; nb++) {
      const batch = drawNotebookProblems(diff, used, 3);
      assert.equal(batch.length, 3);
      for (const p of batch) {
        assert.equal(p.difficulty, diff);
        allIds.push(p.id);
      }
    }
    assert.equal(
      new Set(allIds).size,
      21,
      `expected 21 distinct problems for ${diff}`
    );
  }
});
