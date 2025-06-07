## Formato de Preguntas en el Archivo CSV para "Questioner Base"

El sistema de quiz "Questioner Base" utiliza un archivo CSV (Comma Separated Values) para cargar las preguntas. Cada fila en este archivo representa una pregunta individual y debe seguir un formato específico para ser interpretada correctamente por la aplicación.

**Cabeceras (Primera Fila):**

La primera fila del archivo CSV **debe contener las siguientes cabeceras**, en este orden exacto y respetando mayúsculas y minúsculas (aunque el script intenta normalizar espacios):

```
Pregunta,Opción correcta 1,Opción Correcta 2,Opción Correcta 3,Opción Incorrecta 1,Opción Incorrecta 2,Opción Incorrecta 3,Explicación
```

**Formato de cada Tupla (Fila de Pregunta):**

Cada fila subsiguiente después de las cabeceras define una pregunta y sus componentes. Los campos están separados por comas (`,`). Si un campo contiene comas dentro de su texto, debe estar encerrado entre comillas dobles (`"`). Por ejemplo: `"Esta es una pregunta, con una coma interna",Opción A,...`

A continuación, se detalla el propósito de cada columna:

1.  **`Pregunta`** (Obligatorio)
    *   **Descripción:** El texto de la pregunta que se mostrará al usuario.
    *   **Ejemplo:** `¿Cuál es la capital de Francia?`

2.  **`Opción correcta 1`** (Obligatorio al menos una opción correcta)
    *   **Descripción:** El texto de la primera (o única) opción correcta.
    *   **Ejemplo:** `París`

3.  **`Opción Correcta 2`** (Opcional)
    *   **Descripción:** El texto de la segunda opción correcta. **Si este campo (y/o el siguiente) se rellena, la pregunta se convertirá automáticamente en una de selección múltiple.**
    *   **Ejemplo:** `CSS` (para una pregunta como "¿Qué tecnologías se usan en frontend?")

4.  **`Opción Correcta 3`** (Opcional)
    *   **Descripción:** El texto de la tercera opción correcta. **Rellenar este campo también indica una pregunta de selección múltiple.**
    *   **Ejemplo:** `JavaScript`

5.  **`Opción Incorrecta 1`** 
    *   **Descripción:** El texto de la primera opción incorrecta.
    *   **Ejemplo:** `Berlín`

6.  **`Opción Incorrecta 2`** (Opcional)
    *   **Descripción:** El texto de la segunda opción incorrecta.
    *   **Ejemplo:** `Londres`

7.  **`Opción Incorrecta 3`** (Opcional)
    *   **Descripción:** El texto de la tercera opción incorrecta.
    *   **Ejemplo:** `Roma`

8.  **`Explicación`** (Opcional, pero altamente recomendado)
    *   **Descripción:** Un texto explicativo que se mostrará al usuario después de que responda la pregunta, independientemente de si su respuesta fue correcta o incorrecta. Puede usarse para dar contexto, aclarar la respuesta correcta o proporcionar información adicional.
    *   **Ejemplo:** `París es la capital y ciudad más poblada de Francia, conocida por su arte, moda y cultura.`

---

**Tipos de Preguntas y Cómo Definirlas:**

El sistema determina el tipo de pregunta (selección única o múltiple) y cómo se muestran las opciones basándose en qué campos de opciones correctas e incorrectas se rellenan:

**A. Pregunta de Selección Única (Respuesta Definitiva)**

*   **Definición:** Solo se proporciona texto en la columna `Opción correcta 1`. Las columnas `Opción Correcta 2` y `Opción Correcta 3` **deben estar vacías**.
*   **Comportamiento:**
    *   El usuario solo puede seleccionar una opción.
    *   Al seleccionar una opción, la respuesta se evalúa instantáneamente (verdadera/falsa).
    *   Se pasa a la pantalla de explicación.
    *   Las repeticiones de la pregunta se incrementan o decrementan según corresponda.
*   **Ejemplo CSV:**
    ```csv
    "¿En qué año terminó la Segunda Guerra Mundial?",1945,,,,1939,1942,1918,"La Segunda Guerra Mundial terminó oficialmente en 1945 con la rendición de Japón."
    ```

**B. Pregunta de Selección Múltiple**

*   **Definición:** Se proporciona texto en `Opción correcta 1` **Y TAMBIÉN** en `Opción Correcta 2` (y/o `Opción Correcta 3`).
*   **Comportamiento:**
    *   Aparecerá un mensaje indicando al usuario que debe seleccionar varias opciones.
    *   El usuario puede seleccionar (hacer clic para marcar) y deseleccionar (hacer clic de nuevo para desmarcar) múltiples opciones.
    *   Una vez seleccionadas las opciones deseadas, el usuario debe presionar un botón de "Confirmar Selección" (o la barra espaciadora).
    *   La pregunta se considera correcta **únicamente si se seleccionan TODAS las opciones correctas definidas Y NINGUNA de las opciones incorrectas**.
    *   Luego se pasa a la pantalla de explicación.
    *   Las repeticiones de la pregunta solo disminuyen si se acierta de esta manera.
*   **Ejemplo CSV (2 correctas):**
    ```csv
    "¿Cuáles de los siguientes son colores primarios (modelo RGB)?",Rojo,Verde,,Azul,Amarillo,Naranja,"En el modelo de color aditivo RGB (Red, Green, Blue), estos son los colores primarios."
    ```
*   **Ejemplo CSV (3 correctas):**
    ```csv
    "Selecciona los continentes que empiezan con la letra 'A'",Asia,África,América,Europa,Oceanía,Antártida,"Asia, África y América (considerando Norte y Sur como uno para la letra A) son los continentes que inician con 'A'."
    ```

**C. Pregunta de Tipo Verdadero/Falso (Caso Especial de Selección Única)**

*   **Definición:** Es un tipo de pregunta de selección única. Se define una opción en `Opción correcta 1` (ej. "Verdadero") y una única opción en `Opción Incorrecta 1` (ej. "Falso"). El resto de campos de opciones correctas e incorrectas se dejan vacíos.
*   **Comportamiento:**
    *   El sistema detectará que solo hay dos opciones en total (una correcta y una incorrecta) y mostrará únicamente esas dos.
    *   El comportamiento es el mismo que el de una pregunta de selección única normal.
*   **Ejemplo CSV:**
    ```csv
    "El sol gira alrededor de la Tierra.",Falso,,,,Verdadero,,,"En el modelo heliocéntrico, la Tierra y otros planetas giran alrededor del Sol."
    ```

**D. Pregunta de Respuesta Escrita**

*   **Definición:** Se proporciona solamente `Opción correcta 1` y **no** se rellenan las columnas de opciones incorrectas.
*   **Comportamiento:**
    *   Se muestra un cuadro de texto donde el usuario escribe la respuesta y puede enviarla con el botón "Aceptar" o presionando **Enter**.
    *   La respuesta introducida se compara con la correcta ignorando mayúsculas, comas y espacios laterales mediante una coincidencia difusa del 85%.
    *   Después de enviar, se indica si la respuesta fue correcta o no y se muestra la explicación si existe.
*   **Ejemplo CSV:**
    ```csv
    "¿Cuál es la capital de Francia?",París,,,,,,"París es la capital de Francia."
    ```

**Consideraciones Adicionales:**

*   **Campos Vacíos:** Si un campo opcional (como `Opción Correcta 2`, `Opción Incorrecta 3`, `Explicación`, etc.) no se utiliza para una pregunta en particular, simplemente déjelo vacío (es decir, `,,` en el CSV). No escriba "null" o "vacío".
*   **Número de Opciones Mostradas:**
    *   Para preguntas de selección única, se mostrarán todas las opciones definidas (la correcta y las incorrectas que tengan texto).
    *   Si solo se define una opción correcta y una incorrecta (como en Verdadero/Falso), solo esas dos se mostrarán.
    *   Para selección múltiple, se mostrarán todas las opciones definidas (correctas e incorrectas).
*   **Manejo de Comas:** Como se mencionó, si el texto de una pregunta, opción o explicación contiene una coma, todo ese campo de texto debe estar encerrado entre comillas dobles.
    *   Ejemplo: `"La pregunta, que es un poco larga, dice así:",Opción A,,,Opción B,,,"Esta es la explicación, también algo extensa."`
*   **Saltos de Línea:** Los saltos de línea dentro de un campo del CSV no suelen ser bien soportados o pueden requerir un formato especial (`\n` dentro de comillas) que podría no ser interpretado visualmente como un salto de línea por el quiz. Es mejor evitar saltos de línea directos en el contenido del CSV y gestionar el formato del texto en la presentación (CSS/HTML si fuera necesario, aunque este quiz no lo hace actualmente).
