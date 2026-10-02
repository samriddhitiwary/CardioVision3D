# CardioTwin Heart Asset Manifest

## Source

Local BodyParts3D source directory:

`frontend/public/models/heart/BP51782_FMA3_2_1_inference_isa_FMA67135_Postnatal_anatomical_structure/`

Inventory:

- OBJ files: 129
- Total source size: 29,359,001 bytes
- Total vertices: 271,706
- Total faces/triangles: 407,681

The source OBJ files are intentionally ignored by Git and must remain unmodified.

## Heart Body

Selected heart-body objects favor recognizable external cardiac anatomy while avoiding the full internal anatomy set.

| Role | Source file | Vertices | Triangles | Confidence | Reason |
|---|---|---:|---:|---|---|
| HeartBody_LeftVentricle | `MM474_BP51876_FMA84850_Free wall of left ventricle.obj` | 3,039 | 5,530 | CONFIRMED | Broad left ventricular free-wall mesh; useful external mass. |
| HeartBody_RightVentricle_Outflow | `MM538_BP51878_FMA49208_Wall of outflow part of right ventricle.obj` | 852 | 1,442 | CONFIRMED | Right ventricular outflow wall gives anterior/right-sided context. |
| HeartBody_RightVentricle_Inflow | `MM598_BP51861_FMA49207_Wall of inflow part of right ventricle.obj` | 4,887 | 8,560 | CONFIRMED | Main right ventricular inflow wall. |
| HeartBody_LeftAtrium_Anterior | `MM632_BP51844_FMA49292_Anterior wall proper of left atrium.obj` | 2,659 | 5,012 | CONFIRMED | External left atrial wall. |
| HeartBody_LeftAtrium_Posterior | `MM633_BP51882_FMA9542_Posterior wall of left atrium.obj` | 2,583 | 5,040 | CONFIRMED | Complements left atrial body. |
| HeartBody_LeftAtrium_Lateral | `MM456_BP51862_FMA9306_Lateral wall of left atrium.obj` | 1,428 | 2,548 | CONFIRMED | Lateral left atrial contour. |
| HeartBody_LeftAtrium_Superior | `MM460_BP51866_FMA9562_Superior wall of left atrium.obj` | 888 | 1,578 | CONFIRMED | Superior left atrial contour near great vessels. |
| HeartBody_RightAtrium_Anterior | `MM559_BP51843_FMA49285_Anterior wall proper of right atrium.obj` | 1,094 | 1,694 | CONFIRMED | External right atrial wall. |
| HeartBody_RightAtrium_Lateral | `MM560_BP51837_FMA49286_Lateral wall proper of right atrium.obj` | 3,387 | 6,022 | CONFIRMED | Lateral right atrial body. |

## LAD

BodyParts3D uses formal terminology for LAD anatomy. The relevant term is `anterior interventricular branch of left coronary artery`, with diagonal and septal branches.

| Role | Source file | Vertices | Triangles | Confidence | Reason |
|---|---|---:|---:|---|---|
| LAD_Trunk_Proximal | `MM420_BP51969_FMA74912_Trunk of anterior interventricular branch of left coronary artery.obj` | 397 | 642 | CONFIRMED | Anatomical name directly maps to LAD/anterior interventricular trunk. |
| LAD_Trunk_Mid | `MM424_BP51969_FMA74912_Trunk of anterior interventricular branch of left coronary artery.obj` | 610 | 1,104 | CONFIRMED | Same anatomical name; different center/dimensions, likely another trunk segment. |
| LAD_Trunk_Distal | `MM425_BP51969_FMA74912_Trunk of anterior interventricular branch of left coronary artery.obj` | 511 | 912 | CONFIRMED | Same anatomical name; spatially more distal/inferior segment. |
| LAD_DiagonalBranch | `MM422_BP51972_FMA3860_Diagonal branch of anterior descending branch of left coronary artery.obj` | 1,118 | 2,016 | CONFIRMED | Diagonal branch of anterior descending branch. |
| LAD_LeftAnteriorBranch_Second | `MM423_BP51965_FMA3888_Second left anterior branch of anterior interventricular branch of left coronary artery.obj` | 748 | 1,268 | LIKELY | Branch of the anterior interventricular branch; LAD-associated. |
| LAD_LeftAnteriorBranch_Third | `MM432_BP51962_FMA3890_Third left anterior branch of anterior interventricular branch of left coronary artery.obj` | 1,138 | 1,922 | LIKELY | Branch of the anterior interventricular branch; LAD-associated. |
| LAD_SeptalBranch_Proximal | `MM431_BP51970_FMA3893_Anterior septal branch of anterior interventricular artery.obj` | 752 | 1,286 | CONFIRMED | Septal branch from anterior interventricular artery. |
| LAD_SeptalBranch_Mid | `MM433_BP51970_FMA3893_Anterior septal branch of anterior interventricular artery.obj` | 1,288 | 2,242 | CONFIRMED | Same name; different center/dimensions, retained as separate segment. |
| LAD_SeptalBranch_Distal | `MM434_BP51970_FMA3893_Anterior septal branch of anterior interventricular artery.obj` | 1,352 | 2,182 | CONFIRMED | Same name; spatially separate segment. |

## LCX

| Role | Source file | Vertices | Triangles | Confidence | Reason |
|---|---|---:|---:|---|---|
| LCX_Trunk_Proximal | `MM426_BP51973_FMA74923_Trunk of circumflex branch of left coronary artery.obj` | 434 | 764 | CONFIRMED | Anatomical name directly maps to LCX trunk. |
| LCX_Trunk_Distal | `MM635_BP51973_FMA74923_Trunk of circumflex branch of left coronary artery.obj` | 6,180 | 12,248 | CONFIRMED | Same anatomical name, larger and spatially distinct; retained as another LCX trunk segment. |
| LCX_PosteriorVentricularBranch | `MM428_BP51937_FMA3914_First posterior ventricular branch of circumflex coronary artery.obj` | 1,413 | 2,164 | CONFIRMED | Branch of circumflex coronary artery. |

## RCA

| Role | Source file | Vertices | Triangles | Confidence | Reason |
|---|---|---:|---:|---|---|
| RCA_Trunk_Proximal | `MM436_BP51977_FMA3802_Trunk of right coronary artery.obj` | 442 | 774 | CONFIRMED | Anatomical name directly maps to RCA trunk. |
| RCA_Trunk_Mid | `MM439_BP51977_FMA3802_Trunk of right coronary artery.obj` | 795 | 1,402 | CONFIRMED | Same name, spatially distinct trunk segment. |
| RCA_Trunk_Distal | `MM556_BP51977_FMA3802_Trunk of right coronary artery.obj` | 576 | 1,066 | CONFIRMED | Same name, separate center/dimensions. |
| RCA_AnteriorVentricularBranch | `MM437_BP51980_FMA3815_First anterior ventricular branch of right coronary artery.obj` | 1,082 | 1,792 | CONFIRMED | Branch of right coronary artery. |
| RCA_SinoatrialNodalBranch | `MM438_BP51922_FMA3823_Sinoatrial nodal branch of right coronary artery.obj` | 433 | 640 | CONFIRMED | Branch of right coronary artery. |
| RCA_MarginalBranch | `MM440_BP51950_FMA3818_Marginal branch of right coronary artery.obj` | 1,018 | 1,426 | CONFIRMED | Branch of right coronary artery. |
| RCA_ConusBranch | `MM441_BP51955_FMA3807_Conus branch of right coronary artery.obj` | 780 | 1,308 | CONFIRMED | Branch of right coronary artery. |
| RCA_AtrioventricularNodeBranch | `MM443_BP51952_FMA3851_Atrioventricular node branch of right coronary artery.obj` | 2,041 | 3,518 | CONFIRMED | Branch of right coronary artery. |
| RCA_PosteriorVentricularBranch | `MM444_BP51956_FMA3837_First posterior ventricular branch of right coronary artery.obj` | 524 | 950 | CONFIRMED | Branch of right coronary artery. |
| RCA_AnteriorAtrialBranch | `MM445_BP51957_FMA3829_Anterior atrial branch of right coronary artery.obj` | 524 | 888 | CONFIRMED | Branch of right coronary artery. |

## Left Coronary Stem

| Role | Source file | Vertices | Triangles | Confidence | Handling |
|---|---|---:|---:|---|---|
| LeftCoronaryStem | `MM557_BP58405_FMA4685_Stem of left coronary artery.obj` | 370 | 500 | CONFIRMED | Kept as neutral coronary anatomy. It is not labeled as LAD or LCX because the common left coronary stem precedes the bifurcation. |

## Great Vessels

| Role | Source file | Vertices | Triangles | Confidence | Reason |
|---|---|---:|---:|---|---|
| Aorta_Ascending | `MM506_BP51985_FMA23733_Ascending aorta proper.obj` | 1,492 | 2,684 | CONFIRMED | Orientation and anatomical context. |
| Aorta_Bulb | `MM558_BP51975_FMA15098_Wall of bulb of aorta.obj` | 2,327 | 3,888 | CONFIRMED | Aortic root/bulb context near coronary origins. |
| GreatVessel_PulmonaryTrunk | `MM607_BP58392_FMA15086_Pulmonary trunk proper.obj` | 2,504 | 3,734 | CONFIRMED | Improves orientation next to aorta and ventricles. |

## Excluded Structures

The following groups were intentionally excluded from the processed model:

- Cardiac veins and coronary sinus objects: useful anatomy, but not predicted targets and could confuse artery-specific LAD/LCX/RCA highlighting.
- Valve leaflets, fibrous rings, papillary muscles, trabeculae, conduction system nodes/bundles: internal/detail anatomy that would increase complexity without improving vessel risk visualization.
- Many duplicated/separate ventricular wall components: the minimum recognizable external body was preferred over a full 129-object anatomy viewer.
- Extra septal wall fragments: mostly internal and could obscure coronary visibility.

## Duplicate Resolution

Duplicate anatomical names were compared by vertex count, triangle count, bounding boxes, centers, and dimensions.

- LAD trunk files `MM420`, `MM424`, `MM425` share the same anatomical name but have distinct centers and dimensions. They are treated as separate trunk segments.
- LAD anterior septal branches `MM431`, `MM433`, `MM434` share the same anatomical name but are spatially distinct. They are retained as separate septal branch segments.
- LCX trunk files `MM426` and `MM635` share the same anatomical name but differ strongly in size and location. Both are retained as LCX segments.
- RCA trunk files `MM436`, `MM439`, `MM556` share the same anatomical name but are spatially distinct. They are retained as RCA trunk segments.
- Left ventricular free-wall files are numerous. Only the broad `MM474` object is selected for the minimal body; smaller fragments are excluded for simplicity.
- Coronary sinus duplicates are excluded because they are venous structures.

## Spatial Alignment Validation

The selected objects share a common BodyParts3D coordinate frame. The conversion script never centers individual OBJ files. It loads selected objects in original coordinates, computes one combined bounding box, then applies one shared centering and uniform scale transform to the complete selected model.

The coronary objects occupy the same coordinate range as the selected cardiac walls:

- LAD objects center around the anterior/left ventricular region.
- LCX objects center around the left/posterior atrioventricular region.
- RCA objects center around the right/anterior and inferior cardiac regions.
- Aortic bulb and ascending aorta align near the superior heart and left coronary stem.

This supports using the selected source meshes as one spatially aligned anatomical model.

## Anatomical Limitations

- This manifest relies on source filenames and mesh geometry inspection. No external anatomical metadata was found locally.
- Some branch segment names are repeated across several OBJ files. They appear spatially distinct, but BodyParts3D does not provide an explicit parent-child coronary graph in the local OBJ directory.
- The processed GLB preserves separate logical groups but does not encode disease, stenosis, or model prediction values.
- The heart-body selection is intentionally lightweight and may not include every external surface.
