# Plan for adjustments

1. **Test CSV simplificado**
   - `questions.csv` contiene seis preguntas de prueba (dos de selección única, dos múltiple y dos escritas).

2. **Atajo Shift + Borrar**
   - En `setupKeyListenerForWritten` se escucha `Shift + Delete` o `Backspace` para saltar la pregunta.

3. **Barra de progreso inferior**
   - Usa una media móvil exponencial para estimar el tiempo restante.
   - Actualiza la barra y el texto flotante tras cada respuesta o salto.

4. **Tema claro u oscuro**
   - Seleccionable desde la configuración y persistente en `localStorage`.
   - Variables CSS permiten que todos los componentes cambien de aspecto.

5. **Texto de botones**
   - Todos los botones utilizan texto negro para asegurar contraste en ambos temas.

6. **Mejora de errores en selección múltiple**
   - Si la respuesta es incorrecta por no seleccionar todas las opciones, se muestra un banner rojo con un icono de advertencia.
   - Las opciones correctas seleccionadas se pintan de amarillo para indicar aciertos parciales.
   - El contenedor principal tiene un borde rojo más grueso y la explicación aparece resaltada.

