// Semilla del pensum, transcrita de la malla que registró el estudiante.
// Una materia por línea: semestre|estado|tipo|nombre|prerrequisitos
// estado: A = aprobada, C = cursando, P = pendiente
// tipo: O = obligatoria, F = profundizacion
// Los prerrequisitos van separados por ";" con el nombre exacto de otra línea.
// Los créditos no se conocen: se cargan como null y se editan en la vista Pensum.
export const PENSUM_SEED_TEXT = `
1|P|O|Matemáticas Generales|
1|P|O|Introducción a la Ingeniería en Sistemas|
1|P|O|Lógica de programación|
1|P|O|Lectura y Escritura en Ingeniería|
1|P|O|Uniquindianidad|
2|P|O|Cálculo diferencial|Matemáticas Generales
2|P|O|Álgebra lineal|Matemáticas Generales
2|P|O|Programación I|Lógica de programación
2|P|O|Pensamiento Sistémico|
2|P|O|Fundamentos de Electricidad, electrónica y telecomunicaciones|
3|P|O|Cálculo integral|Cálculo diferencial
3|P|O|Física general|Cálculo diferencial
3|P|O|Matemáticas discretas|Álgebra lineal
3|P|O|Programación II|Programación I
3|P|O|Teoría y diseño organizacional|Pensamiento Sistémico
4|P|O|Cálculo multivariado y vectorial|Cálculo integral
4|P|O|Ecuaciones diferenciales|Cálculo integral
4|P|O|Segunda lengua I|
4|P|O|Programación III|Programación II
4|P|O|Fundamentos de infraestructura computacional|Fundamentos de Electricidad, electrónica y telecomunicaciones
5|P|O|Estadística y probabilidad|Cálculo integral
5|P|O|Teoría de grafos|Matemáticas discretas
5|P|O|Segunda lengua II|Segunda lengua I
5|P|O|Estructura de datos|Programación III
5|P|O|Sistemas de Información|Teoría y diseño organizacional
6|P|O|Dirección estratégica de tecnologías de la información|Sistemas de Información
6|P|O|Análisis numérico|Ecuaciones diferenciales
6|P|O|Base de datos I|Estadística y probabilidad;Estructura de datos
6|P|O|Ingeniería de software I|Programación III
6|P|O|Infraestructura computacional|Fundamentos de infraestructura computacional
7|P|O|Teoría de lenguajes formales|Teoría de grafos
7|P|O|Base de datos II|Base de datos I;Dirección estratégica de tecnologías de la información
7|P|O|Programación avanzada|Estructura de datos
7|P|O|Ingeniería de software II|Ingeniería de software I
7|P|O|Infraestructura de comunicaciones|Infraestructura computacional
8|P|O|Ingeniería económica|Teoría de lenguajes formales;Estadística y probabilidad
8|P|O|Fundamentos de H.C.I|Ingeniería de software I
8|P|O|Seminario de investigación|
8|P|O|Ingeniería de software III|Ingeniería de software II
8|P|O|Administración de infraestructura de tecnología informática|
9|P|O|Formación y evaluación de proyectos|Ingeniería económica;Seminario de investigación
9|P|O|Administración|
9|P|O|Análisis de algoritmos|Estructura de datos
9|P|F|Profundización I|
9|P|F|Profundización II|
10|P|O|Administración de proyectos|Formación y evaluación de proyectos
10|P|O|Inteligencia Artificial|Cálculo multivariado y vectorial;Análisis de algoritmos
10|P|O|Legislación laboral y propiedad intelectual|
10|P|F|Profundización III|
10|P|F|Profundización IV|
10|P|O|Seminario de Ingeniería|
11|P|O|Trabajo de grado|Profundización III;Profundización IV
11|P|O|Ética profesional|
`;
