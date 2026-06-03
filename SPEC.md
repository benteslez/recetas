# SPEC — Hub de recetas (recetas.html)

## Principios
- Un único archivo `recetas.html`. Todo embebido. Vanilla JS. Sin frameworks/build/CDN
  (excepto Google Fonts). Funciona 100% offline.
- Persistencia: localStorage. Preparado para futura sync Supabase (perfiles + timestamps),
  pero Supabase NO se implementa: dejar `// TODO: sync Supabase`.
- Multi-perfil: ruben / sergio / invitado. El perfil activo elige qué parte de
  `estadoUsuario` se lee/escribe. `ingredientes` y `recetas` son COMPARTIDOS.
- FUERA DE ALCANCE (no implementar): control por voz; import de recetas por URL.

## Esquema de datos (CERRADO)
Raíz en localStorage:
  {
    "schemaVersion": 1,
    "ingredientes": [...],   // catálogo normalizado
    "recetas": [...],
    "estadoUsuario": { "<perfil>": { "<idReceta>": {...} } }
  }

### Ingrediente del catálogo
  {
    "clave": "cebolla",            // slug único (minúsculas, sin acentos, guion medio)
    "nombre": "Cebolla",
    "categoriaCompra": "verduras_fruta",
    "densidad": null,              // g/ml | null  (conversión ml<->g)
    "gramosPorUnidad": 150,        // number | null
    "alias": ["cebollas"]          // string[] | []
  }

### Receta
  {
    "id": "tortilla-patatas",      // slug único
    "nombre": "Tortilla de patatas",
    "tipo": "huevos",              // enum 1, UNA categoría
    "tags": ["clasico","tapas"],
    "dieta": ["vegetariano"],      // enum 2, varias
    "racionesBase": 4,
    "tiempoPrep": 20,              // MINUTOS
    "tiempoCoccion": 15,           // MINUTOS
    "dificultad": "media",         // facil|media|dificil
    "fuente": null,                // URL/libro | null
    "imagen": null,                // ruta/URL/dataURI | null
    "ingredientes": [
      {
        "ref": "cebolla",          // -> ingredientes.clave | null (ad-hoc)
        "nombre": "Cebolla",
        "cantidad": 1,             // number | null (null = al gusto, NO escala)
        "cantidadMax": null,       // number | null (rangos)
        "unidad": "ud",            // enum 3 | null
        "grupo": null,             // "masa"|"relleno"|"salsa"|null
        "opcional": false,         // true => fuera del % de búsqueda inversa
        "nota": null
      }
    ],
    "pasos": [
      {
        "n": 1,
        "titulo": "Pochar la cebolla",  // etiqueta de temporizador | null
        "texto": "Pochar a fuego medio hasta transparentar.",
        "tiempo": 600,             // SEGUNDOS | null -> botón temporizador
        "temperatura": null,       // °C | null (horno)
        "usa": ["cebolla"]         // refs de ingredientes del paso | []
      }
    ],
    "notas": null,
    "creado": "2026-06-02T10:00:00Z",     // ISO 8601 UTC
    "modificado": "2026-06-02T10:00:00Z"  // ISO 8601 UTC (last-write-wins)
  }

### Estado de usuario  estadoUsuario["<perfil>"]["<idReceta>"]
  {
    "favorito": true,
    "valoracion": 5,               // 1-5 | null
    "vecesCocinada": 3,
    "ultimaVez": "2026-05-20",     // ISO date | null
    "notasPersonales": "Menos sal.",
    "ajustes": "Subir horno a 200°.",
    "estado": "favorita",          // por_probar|favorita|descartada|null
    "colecciones": ["cenas-rapidas"]
  }

## Invariantes (validar al guardar e importar)
1. `clave`, `id`, `ref`, `colecciones[]` son slugs (minúsculas, sin acentos, guion medio).
2. Todo `ingrediente.ref != null` debe existir en el catálogo; si no, tratar como ad-hoc
   y AVISAR al importar (no descartar en silencio).
3. `tipo` ∈ enum 1; cada `dieta` ∈ enum 2; `unidad` ∈ enum 3 o null.
4. Si `cantidadMax != null` => `cantidadMax >= cantidad`.
5. `modificado >= creado`; ambos ISO 8601 UTC.
6. `pasos[].n` consecutivos desde 1, sin huecos.

## Enums
### 1 tipo
reposteria, panaderia, pizzas, pasta, arroces, sopas_cremas, legumbres, carnes,
pescados_mariscos, huevos, verduras_ensaladas, salsas_fondos, desayunos,
aperitivos_tapas, bebidas, conservas
### 2 dieta
vegetariano, vegano, sin_gluten, sin_lactosa, sin_frutos_secos
### 3 unidad
g, kg, ml, l, cda, cdta, taza, ud, diente, rodaja, loncha, rama, hoja, pizca,
al_gusto, cn
### 4 categoriaCompra
verduras_fruta, carniceria, pescaderia, lacteos_huevos, panaderia, despensa_secos,
conservas, congelados, especias_condimentos, bebidas, otros
### 5 dificultad
facil, media, dificil
### 6 estado (usuario)
por_probar, favorita, descartada

## Diseño
- Moderno, limpio, mucho aire, jerarquía clara, esquinas redondeadas suaves, sombras sutiles.
  Móvil-first (se usa en la cocina).
- Fuentes (Google Fonts): títulos "Fraunces"; interfaz "Inter"; cifras/cantidades
  "JetBrains Mono" (para alinear números).
- Color por `tipo` de receta: familias de color suaves y accesibles para chips/tarjetas.
- Modo claro/oscuro con toggle persistido; por defecto respeta prefers-color-scheme.
- Todo el tema con CSS custom properties. CSS comentado.
- Navegación por secciones (chips/pestañas): Biblioteca · Buscar · Inversa · Compra ·
  Planificador · Conversores · Datos.
- Accesibilidad de cocina: opción de fuente grande y alto contraste; botones grandes en
  modo cocina y temporizadores; controles principales accesibles abajo en móvil.

## Trampas técnicas (CRÍTICO)
T1. TEMPORIZADORES: NO acumular ticks con setInterval (se ralentizan/pausan en segundo
    plano en móvil). Guardar timestamp de FIN (Date.now()+dur) y calcular restante como
    `fin - Date.now()` en cada render. Persistir temporizadores activos (sobreviven a
    recarga/cambio de pestaña).
T2. UNIDADES DE TIEMPO: tiempoPrep/tiempoCoccion en MINUTOS; paso.tiempo en SEGUNDOS.
    Es deliberado. Documentarlo en el código donde se use.
T3. CATÁLOGO NORMALIZADO: suma de lista de compra y búsqueda inversa usan `ref`, NUNCA
    comparación de nombres. ref:null (ad-hoc) no se suma entre recetas.
T4. ESCALADO: cantidad:null no se multiplica. Escalar cantidad y cantidadMax. Redondeo
    legible (nada de "1.5 huevos").
T5. ESTADO DE USUARIO SEPARADO: favorito/valoración/notas viven en estadoUsuario[perfil],
    NUNCA dentro de la receta.
T6. EXPORT LIMPIO: serializar solo el modelo de datos puro (sin nodos DOM ni campos
    calculados) para no inflar el JSON.
T7. CAMPOS DERIVADOS: tiempo total y % de cobertura se CALCULAN en runtime, no se guardan.
T8. WAKE LOCK y VIBRACIÓN: con detección de soporte y fallback silencioso.
T9. SONIDO: beep con Web Audio API (oscillator), sin archivos externos.

## Organización del código (mantener en todas las fases)
Secciones claras y comentadas: (a) DATOS/seed, (b) ESTADO+persistencia, (c) UTILIDADES,
(d) RENDER por sección, (e) EVENTOS. No romper funcionalidades de fases anteriores.
