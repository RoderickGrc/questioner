# Plan for implementing writing question

1. Detect writing question when parsing CSV:
   - If a row has exactly one `Opción correcta` and none of the `Opción Incorrecta` fields,
     mark the question with `isWritten: true`.
   - Keep existing properties for other question types.

2. Update `displayQuestion` to show a different UI when `isWritten` is true:
   - Show the question text followed by an input box and an "Aceptar" button.
   - The input listens for the `Enter` key to submit.

3. Implement `submitWrittenAnswer` and `showWrittenExplanation`:
   - Compare the user's text with the correct answer using a fuzzy match
     (Levenshtein ratio ≥ 0.85), ignoring case, commas and leading/trailing spaces.
   - After evaluating, update stats and display whether the answer was correct,
     the correct answer if needed, any explanation text and a "Siguiente" button.

4. Add small CSS styles for the input element if necessary.

5. Document the new question type in `doc/prompt.md`.

6. Run `npm test` (expected to fail as there is no package.json).
