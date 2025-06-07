# Plan for new features

1. **Simplify test data**
   - Replace `questions.csv` with six short questions:
     - Two de selección única.
     - Dos de selección múltiple.
     - Dos de respuesta escrita.
   - Mantener la línea de cabeceras original.

2. **Corregir atajo Shift + Borrar**
   - En `setupKeyListenerForWritten` detectar `Backspace` o `Delete` con la tecla `Shift` para activar el salto.

3. **Barra de progreso con estimación dinámica**
   - El texto de minutos restantes flota junto a la barra inferior.
   - Calcular el tiempo medio de respuesta con una media móvil exponencial (EMA).
   - Estimar el tiempo faltante ponderando por tipo de pregunta y errores recientes como en la documentación de la tarea.
   - Guardar `avgTimePerRep` y los últimos errores dentro del estado para persistir tras recargar.
   - El ancho de la barra refleja el porcentaje de repeticiones completadas.

4. **Integración en la lógica existente**
   - Inicializar el temporizador cuando se muestra cada pregunta y detenerlo al responder o saltar.
   - Ajustar las llamadas a `showNextQuestion` y `updateStats` para actualizar la barra y el texto.

5. **Ejecutar pruebas**
   - Ejecutar `npm test` aunque no exista `package.json` para mostrar el fallo esperado.

6. **Modo claro/oscuro y mejoras estéticas**
   - Añadir en el modal de configuración una opción para elegir entre tema claro u oscuro.
   - Guardar la preferencia en `localStorage` y aplicarla al cargar la página.
   - Definir variables CSS para los colores base y crear estilos para `.dark-mode`.
   - Mantener la diferenciación verde/roja de respuestas correctas e incorrectas.
   - Revisar los estilos generales para dar un aspecto más moderno.
