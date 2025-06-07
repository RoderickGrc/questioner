# Plan for implementing writing question

1. Detect writing question when parsing CSV:
   - If a row has exactly one `Opción correcta` and none of the `Opción Incorrecta` fields,
     mark the question with `isWritten: true`.
   - Keep existing properties for other question types.

2. Update `displayQuestion` to show a different UI when `isWritten` is true:
   - Show the question text followed by an input box and an "Aceptar" button.
   - The input listens for the `Enter` key to submit.
   - Al mostrarse la pregunta, el foco debe posicionarse en el cuadro de texto
     automáticamente.
   - Deberá existir un botón "Saltar Pregunta" que reduzca las repeticiones y
     muestre la siguiente. Este salto se activará también con la combinación de
     teclado **Shift + Delete**.

3. Implement `submitWrittenAnswer` and `showWrittenExplanation`:
   - Compare the user's text with the correct answer using a fuzzy match
     (Levenshtein ratio ≥ 0.85).
   - Normalizará eliminando mayúsculas, comas, tildes y espacios laterales para
     evitar errores de forma.
   - Después de evaluar, actualizar estadísticas y mostrar siempre la respuesta
     escrita por el usuario y la respuesta correcta original (aunque coincidan).
     Mostrar la explicación si existe y un botón "Siguiente".

4. Add small CSS styles for the input element if necessary.

5. Document the new question type in `doc/prompt.md`.

6. Run `npm test` (expected to fail as there is no package.json).
