# Results

Cells show mean ± standard deviation over runs (expected 3 per frame and tool). "partial" means fewer runs or frames than expected. These are raw measurements, not pass or fail. Arbitrary Tailwind values are reported without judgement: pixel-exact Tailwind needs them. Runs scored after the scroller fix leave out of clipped and overlapping text any blocks inside deliberate horizontal scrollers.

Runs found:

- data-table / ours: run 1, 2, 3
- ecommerce / ours: run 2, 3, 4
- mobile / ours: run 1, 2, 3

## SSIM (higher is closer)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 0.960 ± 0.008 |
| mobile | 0.975 ± 0.005 |
| data-table | 0.961 ± 0.016 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 0.965 ± 0.008 (partial 3/10 frames) |

## Luma correlation 64x64 (higher is closer)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 0.999 ± 0.001 |
| mobile | 0.999 ± 0.000 |
| data-table | 0.997 ± 0.002 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 0.999 ± 0.001 (partial 3/10 frames) |

## Text match, Dice (higher is closer)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 0.999 ± 0.001 |
| mobile | 1.000 ± 0.000 |
| data-table | 1.000 ± 0.000 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 1.000 ± 0.000 (partial 3/10 frames) |

## Block match (higher is closer)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 0.992 ± 0.000 |
| mobile | 0.962 ± 0.032 |
| data-table | 1.000 ± 0.000 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 0.985 ± 0.020 (partial 3/10 frames) |

## Position distance, normalised (lower is closer)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 0.001 ± 0.000 |
| mobile | 0.003 ± 0.001 |
| data-table | 0.001 ± 0.000 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 0.002 ± 0.001 (partial 3/10 frames) |

## Text colour CIEDE2000 (lower is closer)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 0.00 ± 0.00 |
| mobile | 0.00 ± 0.00 |
| data-table | 0.00 ± 0.00 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 0.00 ± 0.00 (partial 3/10 frames) |

## Narrow overflow, px (lower is better)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 0 ± 0 |
| mobile | 0 ± 0 |
| data-table | 0 ± 0 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 0 ± 0 (partial 3/10 frames) |

## Wide overflow, px (lower is better)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 0 ± 0 |
| mobile | 0 ± 0 |
| data-table | 0 ± 0 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 0 ± 0 (partial 3/10 frames) |

## Clipped text blocks, narrow + wide (lower is better)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 0 ± 0 |
| mobile | 6 ± 7 |
| data-table | 22 ± 19 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 9 ± 11 (partial 3/10 frames) |

## Overlapping text pairs, narrow + wide (lower is better)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 0 ± 0 |
| mobile | 0 ± 0 |
| data-table | 1 ± 1 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 0 ± 0 (partial 3/10 frames) |

## Hard-coded colours in source (lower is better)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 0 ± 0 |
| mobile | 1 ± 0 |
| data-table | 2 ± 2 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 1 ± 1 (partial 3/10 frames) |

## Arbitrary Tailwind values in source (informational)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 32 ± 17 |
| mobile | 26 ± 22 |
| data-table | 16 ± 14 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 25 ± 8 (partial 3/10 frames) |

## CSS variables defined (informational)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 11 ± 3 |
| mobile | 10 ± 5 |
| data-table | 21 ± 3 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 14 ± 6 (partial 3/10 frames) |

## CSS variable uses in source (informational)

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 2 ± 0 |
| mobile | 2 ± 0 |
| data-table | 2 ± 1 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 2 ± 0 (partial 3/10 frames) |

## Components

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 10 ± 1 |
| mobile | 5 ± 1 |
| data-table | 7 ± 1 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 7 ± 3 (partial 3/10 frames) |

## Lines of code

| Frame | ours |
| --- | --- |
| landing | partial (0/3) |
| dashboard | partial (0/3) |
| auth-mobile | partial (0/3) |
| settings | partial (0/3) |
| pricing | partial (0/3) |
| ecommerce | 263 ± 40 |
| mobile | 136 ± 26 |
| data-table | 226 ± 7 |
| messy | partial (0/3) |
| material | partial (0/3) |
| **Overall** | 208 ± 65 (partial 3/10 frames) |

