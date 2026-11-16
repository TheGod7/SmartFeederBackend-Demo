# Food catalog sources

This document explains the source of each statistic stored in `Food`.
The numbers correspond to specific formulas and package sizes; they must not
be interpreted as universal values for an entire brand.

## How to read the data

```text
proteinPercent   proteína cruda declarada, porcentaje mínimo o publicado
fatPercent       grasa cruda declarada, porcentaje mínimo o publicado
fiberPercent     fibra cruda declarada, porcentaje máximo o publicado
moisturePercent  humedad declarada, porcentaje máximo o publicado
energyKcalPerKg  metabolizable energy in kcal per kilogram
nutritionBasis   as_fed o dry_matter
sourceUrl        página usada como referencia
```

### kcal/kg criterion

A number is stored only when a source publishes energy for the formula
being consulted. If the page only shows protein, fat, fiber, and moisture, the
field must remain `null`. `0` is not used because it would mean that the food
has no energy, which would be incorrect.

When a secondary source or distributor publishes the value and the official
page does not, the value is recorded as a secondary reference and identified
in the corresponding section.

## Cats

### Royal Canin Indoor Adult

Stored product:

```text
brand: Royal Canin
name: Indoor Adult
species: cat
productType: dry
lifeStage: adult
```

Recorded values:

```text
Proteína: 27%
Grasa: 11%
Fibra: 5.7%
Humedad: 8%
Energía: 3534 kcal/kg
```

Source:

- [Royal Canin México - Indoor Adult](https://www.royalcanin.com/mx/cats/products/retail-products/indoor-adult-2529)

The 3534 kcal/kg energy value and guaranteed analysis were published for
Indoor Adult. The product is intended for adult indoor cats.

### NUPEC Felino Senior

Stored product:

```text
brand: NUPEC
name: Felino Senior
species: cat
productType: dry
lifeStage: senior
```

Recorded values:

```text
Proteína: 34%
Grasa: 14%
Fibra: 5%
Humedad: 12%
Energía: null
```

Sources:

- [Tienda NUPEC - Felino Senior](https://store.nupec.com/product/nupec-felino-senior-1-5-kg/)
- [NUPEC - Felino Senior](https://nupec.com/es/nutricion-felina/nutricion-diaria/felino-senior)

The consulted product sheets show the guaranteed analysis but do not publish a
verifiable metabolizable-energy value in kcal/kg. Therefore, the catalog
returns `null` rather than an estimated value.

### Hill's Science Diet Adult Salmon

Stored product:

```text
brand: Hill's Science Diet
name: Adult Salmon
species: cat
productType: dry
lifeStage: adult
nutritionBasis: dry_matter
```

Recorded values:

```text
Proteína: 33.8%
Grasa: 19.8%
Fibra: 1.5%
Humedad: null
Energía: 3942 kcal/kg
```

Source:

- [Hill's México - Adult Salmon & Brown Rice Dry](https://www.hillspet.com.mx/cat-food/science-diet-adult-salmon-brown-rice-dry)

The page publishes the energy and the main percentages on a dry-matter basis.
Since moisture was not verifiably shown in the consulted product sheet, it is
left as `null` instead of assuming a typical percentage.

### Purina Cat Chow Adulto Carne

Stored product:

```text
brand: Purina Cat Chow
name: Adulto Carne
species: cat
productType: wet
lifeStage: adult
```

Recorded values:

```text
Proteína: 10.5%
Grasa: 2.5%
Fibra: 0.6%
Humedad: 82%
Energía: 917 kcal/kg
```

Source for the Mexican analysis:

- [Purina México - Cat Chow Adultos Carne](https://purina.com.mx/catchow/productos/purina-cat-chow-alimento-humedo-gatos-adultos-sabor-carne)

The 917 kcal/kg energy value was calculated from 78 kcal per 85 g
published for the equivalent wet-food package:

```text
78 kcal / 0.085 kg = 917.6 kcal/kg
```

It was rounded to `917` in the catalog. It should not be confused with dry Cat
Chow: searches for dry formulas report approximately 3700 kcal/kg in other
markets and package sizes. The current record is specifically wet food.

## Dogs

### Purina Dog Chow Adultos Carne

Stored product:

```text
brand: Purina Dog Chow
name: Adultos Carne
species: dog
productType: dry
lifeStage: adult
```

Recorded values:

```text
Proteína: 21%
Grasa: 10%
Fibra: 4%
Humedad: 12%
Energía: aproximadamente 3600 kcal/kg
```

Sources:

- [Purina México - Dog Chow Adultos Todos los Tamaños](https://purina.com.mx/dogchow/productos/dog-chow-adultos-todos-tamanos-carne)
- [La Granja - Dog Chow Adulto Medianos y Grandes](https://lagranjamed.com/tienda/alimentos/alimento-seco/dog-chow-adulto-medianos-y-grandes-sabor-carne-y-pollo-2/)
- [H-E-B México - Purina Dog Chow](https://www.heb.com.mx/purina-dog-chow-alimento-seco-perros-adultos-medianos-y-grandes-bulto-de-500-g-510568/p)

The official page supports the product and guaranteed analysis. The
approximately 3600 kcal/kg value appears in commercial product sheets or
distributor listings for the same formula or an equivalent package, so it is
marked as approximate and may vary by package.

### PEDIGREE Adulto Res y Vegetales

Stored product:

```text
brand: PEDIGREE
name: Adulto Res y Vegetales
species: dog
productType: dry
lifeStage: adult
```

Recorded values:

```text
Proteína: 21%
Grasa: 8%
Fibra: 4%
Humedad: 12%
Energía: null
```

Source:

- [PEDIGREE México - Adulto Res and Vegetales](https://www.pedigree.com.mx/nuestros-productos/alimento-seco/pedigree-croquetas-adulto-con-res-y-vegetales)

The public product sheet shows the guaranteed analysis but does not publish an
official kcal/kg figure for this Mexican formula. Some commercial listings
provide estimated ranges of 3200-3400 kcal/kg, but they are not included
because they are not confirmed data for this package. To obtain it accurately,
read the Mexican package or request the technical sheet from Mars/PEDIGREE.

### Royal Canin Medium Adult

Stored product:

```text
brand: Royal Canin
name: Medium Adult
species: dog
productType: dry
lifeStage: adult
```

Recorded values:

```text
Proteína: 25%
Grasa: 14%
Fibra: 1.2%
Humedad: 10.5%
Energía: 3857 kcal/kg
```

Sources:

- [Royal Canin México - Adult](https://www.royalcanin.com/mx/dogs/products/vet-products/adult-3705)
- [Gosvet - Royal Canin Medium Adult](https://gosvet.com/producto/royal-canine-adult-medium-4kg/)

The energy figure and values used in the catalog come from product sheets and
distributors. There are small differences between countries, formulas, and
packages; prioritize the label on the package that is purchased.

### NUPEC Adulto Razas Medianas y Grandes

Stored product:

```text
brand: NUPEC
name: Adulto Razas Medianas y Grandes
species: dog
productType: dry
lifeStage: adult
```

Recorded values:

```text
Proteína: 24%
Grasa: 12%
Fibra: 4%
Humedad: 9%
Energía: 3500 kcal/kg
```

Sources:

- [NUPEC México - Adulto de Raza Mediana y Grande](https://www.nupec.mx/productos/croquetas-nupec-adulto-de-raza-mediana-y-grande/)
- [NUPEC - Adulto](https://nupec.com/es/nutricion-canina/nutricion-diaria/adulto)
- [Mercado Libre México - NUPEC Adulto](https://www.mercadolibre.com.mx/nupec-adulto-de-raza-mediana-y-grande-perro-5kg/p/MLM8737762)

The 3500 kcal/kg figure appears in the commercial technical sheet associated
with the formula. The published guaranteed analysis includes protein, fat,
fiber, moisture, ash, and nitrogen-free extract.

### Hill's Science Diet Adult Chicken and Barley

Stored product:

```text
brand: Hill's Science Diet
name: Adult Chicken and Barley
species: dog
productType: dry
lifeStage: adult
nutritionBasis: dry_matter
```

Recorded values:

```text
Proteína: 24.9%
Grasa: 15.2%
Fibra: 1.7%
Humedad: null
Energía: 3585 kcal/kg
```

Source:

- [Hill's México - Adult Chicken and Barley](https://www.hillspet.com.mx/dog-food/science-diet-adult-chicken-barley)

The consulted product sheet publishes 3585 kcal/kg and the percentages on a
dry-matter basis. Moisture was not added because it was not verifiably
published in the same product sheet.

## Catalog energy summary

| Product | kcal/kg | Treatment |
|---|---:|---|
| Royal Canin Indoor Adult | 3534 | Published |
| NUPEC Felino Senior | `null` | Not published in the consulted sheet |
| Hill's Adult Salmon | 3942 | Published |
| Purina Cat Chow Adulto Carne wet | 917 | Converted from 78 kcal/85 g |
| Purina Dog Chow Adultos | 3600 approx. | Equivalent commercial sheet |
| PEDIGREE Adulto Res y Vegetales | `null` | Estimates only; not included |
| Royal Canin Medium Adult | 3857 | Product/distributor sheet |
| NUPEC Adulto | 3500 | Commercial technical sheet |
| Hill's Adult Chicken and Barley | 3585 | Published |

## Images

The images in `imageUrl` are representative of the species, not official
package photographs. They are used so that the frontend has an image from the
start. For a commercial product, replace them with owned or appropriately
licensed images.
