# Fuentes del catálogo de alimentos

Este documento explica de dónde sale cada estadística guardada en `Food`.
Los números corresponden a fórmulas y presentaciones concretas; no deben
interpretarse como valores universales de una marca completa.

## Cómo leer los datos

```text
proteinPercent   proteína cruda declarada, porcentaje mínimo o publicado
fatPercent       grasa cruda declarada, porcentaje mínimo o publicado
fiberPercent     fibra cruda declarada, porcentaje máximo o publicado
moisturePercent  humedad declarada, porcentaje máximo o publicado
energyKcalPerKg  energía metabolizable en kcal por kilogramo
nutritionBasis   as_fed o dry_matter
sourceUrl        página usada como referencia
```

### Criterio para kcal/kg

Solo se guarda una cifra cuando una fuente publica energía para la fórmula
consultada. Si la página solo muestra proteína, grasa, fibra y humedad, el
campo debe permanecer `null`. No se usa `0` porque significaría que el
alimento no tiene energía, lo cual sería incorrecto.

Cuando una fuente secundaria o distribuidor publica el valor y la página
oficial no lo muestra, el valor se registra como referencia secundaria y se
indica en la sección correspondiente.

## Gatos

### Royal Canin Indoor Adult

Producto guardado:

```text
brand: Royal Canin
name: Indoor Adult
species: cat
productType: dry
lifeStage: adult
```

Valores registrados:

```text
Proteína: 27%
Grasa: 11%
Fibra: 5.7%
Humedad: 8%
Energía: 3534 kcal/kg
```

Fuente:

- [Royal Canin México - Indoor Adult](https://www.royalcanin.com/mx/cats/products/retail-products/indoor-adult-2529)

La energía de 3534 kcal/kg y el análisis garantizado fueron publicados para
Indoor Adult. El producto está destinado a gatos adultos de interior.

### NUPEC Felino Senior

Producto guardado:

```text
brand: NUPEC
name: Felino Senior
species: cat
productType: dry
lifeStage: senior
```

Valores registrados:

```text
Proteína: 34%
Grasa: 14%
Fibra: 5%
Humedad: 12%
Energía: null
```

Fuentes:

- [Tienda NUPEC - Felino Senior](https://store.nupec.com/product/nupec-felino-senior-1-5-kg/)
- [NUPEC - Felino Senior](https://nupec.com/es/nutricion-felina/nutricion-diaria/felino-senior)

Las fichas consultadas muestran el análisis garantizado, pero no publican una
cifra verificable de energía metabolizable en kcal/kg. Por eso el catálogo
devuelve `null` y no un valor estimado.

### Hill's Science Diet Adult Salmon

Producto guardado:

```text
brand: Hill's Science Diet
name: Adult Salmon
species: cat
productType: dry
lifeStage: adult
nutritionBasis: dry_matter
```

Valores registrados:

```text
Proteína: 33.8%
Grasa: 19.8%
Fibra: 1.5%
Humedad: null
Energía: 3942 kcal/kg
```

Fuente:

- [Hill's México - Adult Salmon & Brown Rice Dry](https://www.hillspet.com.mx/cat-food/science-diet-adult-salmon-brown-rice-dry)

La página publica la energía y los porcentajes principales sobre materia seca.
Como la humedad no se mostró de forma verificable en la ficha consultada, se
deja `null` en vez de asumir un porcentaje típico.

### Purina Cat Chow Adulto Carne

Producto guardado:

```text
brand: Purina Cat Chow
name: Adulto Carne
species: cat
productType: wet
lifeStage: adult
```

Valores registrados:

```text
Proteína: 10.5%
Grasa: 2.5%
Fibra: 0.6%
Humedad: 82%
Energía: 917 kcal/kg
```

Fuente de análisis mexicano:

- [Purina México - Cat Chow Adultos Carne](https://purina.com.mx/catchow/productos/purina-cat-chow-alimento-humedo-gatos-adultos-sabor-carne)

La energía de 917 kcal/kg se calculó a partir de 78 kcal por sobre de 85 g
publicadas para la presentación húmeda equivalente:

```text
78 kcal / 0.085 kg = 917.6 kcal/kg
```

Se redondeó a `917` en el catálogo. No debe confundirse con Cat Chow seco:
las búsquedas de fórmulas secas reportan aproximadamente 3700 kcal/kg en otros
mercados y presentaciones. El registro actual es específicamente húmedo.

## Perros

### Purina Dog Chow Adultos Carne

Producto guardado:

```text
brand: Purina Dog Chow
name: Adultos Carne
species: dog
productType: dry
lifeStage: adult
```

Valores registrados:

```text
Proteína: 21%
Grasa: 10%
Fibra: 4%
Humedad: 12%
Energía: aproximadamente 3600 kcal/kg
```

Fuentes:

- [Purina México - Dog Chow Adultos Todos los Tamaños](https://purina.com.mx/dogchow/productos/dog-chow-adultos-todos-tamanos-carne)
- [La Granja - Dog Chow Adulto Medianos y Grandes](https://lagranjamed.com/tienda/alimentos/alimento-seco/dog-chow-adulto-medianos-y-grandes-sabor-carne-y-pollo-2/)
- [H-E-B México - Purina Dog Chow](https://www.heb.com.mx/purina-dog-chow-alimento-seco-perros-adultos-medianos-y-grandes-bulto-de-500-g-510568/p)

La página oficial respalda el producto y el análisis garantizado. La cifra de
aproximadamente 3600 kcal/kg aparece en fichas comerciales/distribuidores de
la misma fórmula o de una presentación equivalente, por lo que se marca como
aproximada y puede variar por presentación.

### PEDIGREE Adulto Res y Vegetales

Producto guardado:

```text
brand: PEDIGREE
name: Adulto Res y Vegetales
species: dog
productType: dry
lifeStage: adult
```

Valores registrados:

```text
Proteína: 21%
Grasa: 8%
Fibra: 4%
Humedad: 12%
Energía: null
```

Fuente:

- [PEDIGREE México - Adulto Res y Vegetales](https://www.pedigree.com.mx/nuestros-productos/alimento-seco/pedigree-croquetas-adulto-con-res-y-vegetales)

La ficha pública muestra el análisis garantizado, pero no publica una cifra
oficial de kcal/kg para esta fórmula mexicana. Algunos resultados comerciales
dan rangos estimados de 3200-3400 kcal/kg, pero no se incorporan porque no son
un dato confirmado de la presentación. Para obtenerlo con exactitud se debe
leer el empaque mexicano o solicitar la ficha técnica a Mars/PEDIGREE.

### Royal Canin Medium Adult

Producto guardado:

```text
brand: Royal Canin
name: Medium Adult
species: dog
productType: dry
lifeStage: adult
```

Valores registrados:

```text
Proteína: 25%
Grasa: 14%
Fibra: 1.2%
Humedad: 10.5%
Energía: 3857 kcal/kg
```

Fuentes:

- [Royal Canin México - Adult](https://www.royalcanin.com/mx/dogs/products/vet-products/adult-3705)
- [Gosvet - Royal Canin Medium Adult](https://gosvet.com/producto/royal-canine-adult-medium-4kg/)

La cifra de energía y los valores usados en el catálogo provienen de fichas de
producto y distribuidores. Hay pequeñas diferencias entre país, fórmula y
presentación; se debe priorizar la etiqueta del empaque que se compre.

### NUPEC Adulto Razas Medianas y Grandes

Producto guardado:

```text
brand: NUPEC
name: Adulto Razas Medianas y Grandes
species: dog
productType: dry
lifeStage: adult
```

Valores registrados:

```text
Proteína: 24%
Grasa: 12%
Fibra: 4%
Humedad: 9%
Energía: 3500 kcal/kg
```

Fuentes:

- [NUPEC México - Adulto de Raza Mediana y Grande](https://www.nupec.mx/productos/croquetas-nupec-adulto-de-raza-mediana-y-grande/)
- [NUPEC - Adulto](https://nupec.com/es/nutricion-canina/nutricion-diaria/adulto)
- [Mercado Libre México - NUPEC Adulto](https://www.mercadolibre.com.mx/nupec-adulto-de-raza-mediana-y-grande-perro-5kg/p/MLM8737762)

La cifra de 3500 kcal/kg aparece en la ficha técnica comercial asociada a la
fórmula. El análisis garantizado publicado incluye proteína, grasa, fibra,
humedad, cenizas y ELN.

### Hill's Science Diet Adult Chicken and Barley

Producto guardado:

```text
brand: Hill's Science Diet
name: Adult Chicken and Barley
species: dog
productType: dry
lifeStage: adult
nutritionBasis: dry_matter
```

Valores registrados:

```text
Proteína: 24.9%
Grasa: 15.2%
Fibra: 1.7%
Humedad: null
Energía: 3585 kcal/kg
```

Fuente:

- [Hill's México - Adult Chicken and Barley](https://www.hillspet.com.mx/dog-food/science-diet-adult-chicken-barley)

La ficha consultada publica 3585 kcal/kg y los porcentajes sobre materia seca.
No se agregó humedad porque no estaba publicada de forma verificable en la
misma ficha.

## Resumen de energía en el catálogo

| Producto | kcal/kg | Tratamiento |
|---|---:|---|
| Royal Canin Indoor Adult | 3534 | Publicado |
| NUPEC Felino Senior | `null` | No publicado en ficha consultada |
| Hill's Adult Salmon | 3942 | Publicado |
| Purina Cat Chow Adulto Carne húmedo | 917 | Convertido desde 78 kcal/85 g |
| Purina Dog Chow Adultos | 3600 aprox. | Ficha comercial equivalente |
| PEDIGREE Adulto Res y Vegetales | `null` | Solo estimaciones no incorporadas |
| Royal Canin Medium Adult | 3857 | Ficha de producto/distribuidor |
| NUPEC Adulto | 3500 | Ficha técnica comercial |
| Hill's Adult Chicken and Barley | 3585 | Publicado |

## Imágenes

Las imágenes de `imageUrl` son representativas de la especie, no fotografías
oficiales del empaque. Se usan para que el frontend tenga una imagen desde el
primer momento. Para un producto comercial se deben sustituir por imágenes
propias o con licencia adecuada.

