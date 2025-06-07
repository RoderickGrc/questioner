# Plan for new features

1. **Simplify test data**
   - Replace `questions.csv` with six short questions:
     - Two de selección única.
     - Dos de selección múltiple.
     - Dos de respuesta escrita.
   - Mantener la línea de cabeceras original.

2. **Corregir atajo Shift + Borrar**
   - En `setupKeyListenerForWritten` detectar `Backspace` o `Delete` con la tecla `Shift` para activar el salto.

3. **Barra de progreso con tiempo restante**
   - Añadir en `index.html` un contenedor fijo al pie de la página con una barra de carga y un texto "X minutos faltantes".
   - Crear estilos discretos en `styles.css` para que no sea invasiva.
   - En `script.js` llevar un contador de tiempo por pregunta para calcular el promedio.
   - Estimar el tiempo restante multiplicando ese promedio por las repeticiones pendientes y mostrarlo en la barra.
   - Actualizar el ancho de la barra según el porcentaje de preguntas completadas.

4. **Integración en la lógica existente**
   - Inicializar el temporizador cuando se muestra cada pregunta y detenerlo al responder o saltar.
   - Ajustar las llamadas a `showNextQuestion` y `updateStats` para actualizar la barra y el texto.

5. **Ejecutar pruebas**
   - Ejecutar `npm test` aunque no exista `package.json` para mostrar el fallo esperado.
