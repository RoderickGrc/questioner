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

## Uso rápido

1. Clona el repositorio y abre `index.html` para acceder a la nueva pantalla de inicio.
2. Desde la página de inicio selecciona una colección para comenzar el quiz.
3. Una vez en el quiz podrás:
   - Guardar o cargar el progreso (archivo JSON).
   - Cargar un CSV diferente con tus propias preguntas.
   - Reiniciar el avance actual.
   - Ajustar la configuración del quiz.

Si se desea utilizar un CSV propio, consulta `doc/prompt.md` para conocer el formato exacto que debe tener cada fila.

**Nota**: algunos navegadores pueden bloquear la lectura del CSV local si `index.html` o `home.html` se abren directamente desde el sistema de archivos. En tal caso, es conveniente servir los archivos desde un pequeño servidor web (por ejemplo `python -m http.server`).

## Estructura del repositorio

- `index.html` y `home.html` – pantalla de inicio con el carrusel de colecciones.
- `collections/index.html` – vista principal del quiz.
- `script.js` – lógica de funcionamiento y manejo de estado.
- `styles.css` – estilos de la interfaz.
- `questions.csv` – ejemplo de preguntas en formato CSV.
- `doc/prompt.md` – documento extenso que explica cómo preparar el archivo CSV.

La licencia del proyecto es MIT (ver `LICENSE`).

