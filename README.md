# Questioner Base

Este proyecto es un quiz interactivo implementado con HTML, CSS y JavaScript puro. Permite practicar preguntas almacenadas en un archivo CSV y lleva un control de repeticiones para ayudar a la memorización.

## Características principales

- **Carga de preguntas desde CSV**: se usa la biblioteca [Papa Parse](https://www.papaparse.com/) para procesar archivos CSV con el formato descrito en `doc/prompt.md`.
- **Soporte para selección única, múltiple o preguntas de escritura** según cómo se definan las respuestas en el CSV. Las preguntas de escritura colocan el cursor automáticamente en el campo de texto, permiten saltarse con **Shift + Delete** y comparan la respuesta ignorando tildes y puntuación mostrando luego la respuesta ideal.
- **Seguimiento de repeticiones**: cada pregunta puede repetirse varias veces hasta ser respondida correctamente las veces requeridas.
- **Persistencia del progreso** mediante `localStorage` y la opción de guardar o cargar ficheros JSON.
- **Configuración**: desde la interfaz se pueden definir las repeticiones iniciales y el aumento al fallar una pregunta.
- **Diseño moderno** con posibilidad de tema claro u oscuro.
- **Interfaz adaptable** para escritorio y dispositivos móviles.
- **Barra de tiempo restante** en la parte inferior con una estimación dinámica del tiempo faltante.
- **Modo claro u oscuro** seleccionable desde la configuración.
- **Texto de botones negro** para asegurar contraste en ambos temas.
- **Banner de error en preguntas múltiples** que resalta aciertos parciales en amarillo.
- **La materia se muestra junto al nombre de la colección** en el encabezado y al seleccionar una colección.
- **Menú lateral rediseñado con iconos** para facilitar la navegación.

## Uso rápido

1. Clona el repositorio y abre `index.html` en un navegador web moderno.
2. Al iniciar se muestra una pantalla de inicio accesible también en `/home` con las colecciones disponibles.
3. El quiz cargará por defecto el archivo `questions.csv` incluido en el repositorio.
4. Utiliza los botones de la parte superior para:
   - Guardar o cargar el progreso (archivo JSON).
   - Cargar un CSV diferente con tus propias preguntas.
   - Reiniciar el avance actual.
   - Ajustar la configuración del quiz.

Si se desea utilizar un CSV propio, consulta `doc/prompt.md` para conocer el formato exacto que debe tener cada fila.

**Nota**: algunos navegadores pueden bloquear la lectura del CSV local si `index.html` se abre directamente desde el sistema de archivos. En tal caso, es conveniente servir los archivos desde un pequeño servidor web (por ejemplo `python -m http.server`).

## Estructura del repositorio

- `index.html` – página principal que muestra el home y el quiz.
- `script.js` – lógica de funcionamiento y manejo de estado.
- `styles.css` – estilos de la interfaz.
- `questions.csv` – ejemplo de preguntas en formato CSV.
- `doc/prompt.md` – documento extenso que explica cómo preparar el archivo CSV.

La licencia del proyecto es MIT (ver `LICENSE`).

