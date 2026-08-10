# `featured` flag snapshot

Taken 2026-08-10T12:26:23.626Z before clearing all flags.

- products total: **122**
- `featured: true` at snapshot time: **111**

The homepage rail queries `featured: true` ordered by `updatedAt desc`.
With almost every product flagged, "Featured" meant "most recently edited",
not a curated selection. All flags are cleared so the owner can pick 4-6
in the admin product editor; until then the rail hides itself rather than
claiming the shop is empty.

## Restore

To put every flag back exactly as it was:

```sql
UPDATE "Product" SET featured = true WHERE id IN (
  'cms9cqjl7000111muyg1capi2',
  'cms9b8hrs0001f8t7xiowuk96',
  'cmsgbn2w00001t1chpknr6g9u',
  'cms4tp4ty0001eqxvzmmbadiq',
  'cms6290ff0001fdsmvql3jcew',
  'cmsatfab10005he7x9bprusfo',
  'cms9152qd00012p9rpgupqj61',
  'cms8z0ttw00013zz5jp5fx4tl',
  'cmsah4iua0001zappdvw4c887',
  'cmsac4mn40001omexnkogsiew',
  'cmsabm81500017bgg9a1l78f0',
  'cms92idc80001ttcu2r69e8um',
  'cms578nno0001jr6sq5phvigx',
  'cmsd2f75j0003xfnl3fcl9otj',
  'cmsd2qsmz0005pjclrqbzcusa',
  'cmsgai04700026k5cim13kwl1',
  'cms4wdtl90001x1mh127py0zy',
  'cmsajj927000291ufr27aexly',
  'cmsa72uo100015x0lvciizqhf',
  'cmsd6fm1200018s02lqneuspg',
  'cmsd9o6u70004r3jbyum8i348',
  'cms65ikyk0001vz1l30jv8x4u',
  'cms677uhx0001kr9ecz3tks1m',
  'cms4yk5pb0001t3aabkqr2oki',
  'cmsg0mh1p0004ayfzyxpa2sdn',
  'cmsa7nixc00013zn0tswdjmo5',
  'cmsa58a2a000112dh8kccowa9',
  'cmsa60dro0002gsjknj58ys9v',
  'cmsa6d2xg00023jxrvtxpu0xo',
  'cmsaa0w3v0001o6qc1bpdxabl',
  'cmsaelbey0006tw9ib19ed2ur',
  'cmsa9mj770001113wvci5xj44',
  'cmsa93l6j00064o2fxr9qs4qi',
  'cmrolyiy2000ymfrcw28ctcl4',
  'cms5zgrqo0004dwavyskobpcs',
  'cms5wk8x60001wdrea56h0e3t',
  'cms4vg4xm00015l2oui220ec3',
  'cmsdf5nx30001iss6889uu9fg',
  'cms7d6j95000513cic5k08v19',
  'cms7bb9280002ejyvh1o11cov',
  'cms51x3oz0001gf87xs15edhf',
  'cms7cinnp00015bhmexib1lan',
  'cms6b6sgf0002125knjxjpu06',
  'cmsfxe8zb000279xbr3qzjod3',
  'cmsfxf92j0001u15rv5ms7csm',
  'cms693nko0001ys62whi1oob6',
  'cmrolyidd000qmfrcm5c6a5ic',
  'cmrolyhxt000kmfrcqxyqobhr',
  'cms7g0osm0002w9i2873h1wy1',
  'cms7kufdq00016lc6yjfcd1ju',
  'cmrolyj390010mfrc8h2asfcp',
  'cmrolyh7w000amfrc724y6abg',
  'cms68h5df0001pb35yw3r1zog',
  'cmsaic8y70001sc0bern6k4dj',
  'cmsbnqbkh000230vvnjxemb3g',
  'cms7mccso0001oeb62jno3s53',
  'cms4suf3n0001x24oetogdzx7',
  'cmsagjyjk0002oc8138ta37l4',
  'cmsdfrdpc000412inr1s1hb47',
  'cms7qdf1f0005gxk6nrps1u6t',
  'cmrolyi2z000mmfrcuma4xi8f',
  'cms8znl1u0001re9voge1oej3',
  'cmsg5kmjc0002665aar9y75po',
  'cmsfv8rom0001x6patrclifit',
  'cmsfwlrg40001ahis31ry6ud4',
  'cmrolyhi9000emfrcoph36wi4',
  'cmsd3dro20001lpyr6m8ruwxm',
  'cmsgflac50002zrpcc3jka7kt',
  'cms6cdi270002iswzxzla4gj1',
  'cms6er9za00055m8824bba3mr',
  'cmsahx2k90006fm0m5epar6ed',
  'cms7p9wf20001122jdjnheulh',
  'cmsahlm7s0001fm0meke4wtmc',
  'cms7fceal00022308eyj9ur8f',
  'cmsdgcvls0001wm1aoxb0hubw',
  'cms69urjz00012ybtw3nhp744',
  'cmsdcr4wc0001f9co2r3ox2n4',
  'cms4ucr6r0001eynuz1zhaxbu',
  'cmsdejvam0001d044mywwyseo',
  'cms4plbon0005bowdenx82emd',
  'cmsdc3dyq0001sdqqkb12ple4',
  'cmsa3iocl0001jj1yqrai5ggi',
  'cmsg2jiuw0001e5agtafu6v1x',
  'cmsg180la000111gyw5y5io78',
  'cmrxot6sb0002emxghg18nhay',
  'cmrolyisw000wmfrcuecpch1u',
  'cms90fi830006ysskkc4bz492',
  'cms91n9fj00013xqnwnd959ip',
  'cmsa0wo8t0001q151gsnj1jfq',
  'cms6g7bw50001t2e8iqwbr34y',
  'cmryqjq140003kyng291sn001',
  'cmscxq1wy0001ejm7ubfgu73h',
  'cmscy45bz00099dzmmu8a62ag',
  'cmscz557t00019j2t3kc6m3ni',
  'cmscxz6xf00019dzmithv675i',
  'cmsc2vilv0002icjzpdov05r0',
  'cmsdde2m0000155o25dtohbd4',
  'cmsgd7e0u0001rkiavi8qq4p0',
  'cmsgc7y6m0001rqg2omrg09c4',
  'cmsgd1vne0001xr62k2p30osg',
  'cms7jul6x000113qtorjqurs5',
  'cmsadssi900042fl3jez68jhi',
  'cmsacjlqf0001141bk4t2ttc5',
  'cmsad34xi0002euugmjdv8g31',
  'cmsae5ur30007euugerxn639u',
  'cms7ip3bs0001ko5avz90rcy8',
  'cmrolygxh0008mfrcr2hjtqdh',
  'cmsdhxzqm0001swguwcc8t8ft',
  'cmsdid43t0005njbfcwha5c7m',
  'cmsaiyven0001z4vhveccls3e',
  'cmsde337h0001y24f3r3lz7nd'
);
```

## Products flagged at snapshot time

| Product | id | active |
| --- | --- | --- |
| 777 MEN Super Love Perfume Set (2 Pcs) | `cms9cqjl7000111muyg1capi2` | yes |
| 777 MEN Super Love Perfume Set (2 Pcs) | `cms9b8hrs0001f8t7xiowuk96` | no |
| American Dream Cocoa Butter Lemon Cream | `cmsgbn2w00001t1chpknr6g9u` | yes |
| Asantee Papaya & Honey Soap 125g | `cms4tp4ty0001eqxvzmmbadiq` | yes |
| ASANTEE Tamarind & Goat Milk Herbal Soap (สบู่สมุนไพรมะขามผสมนมแพะ) | `cms6290ff0001fdsmvql3jcew` | yes |
| Baby Line Perfumed Baby Petroleum Jelly | `cmsatfab10005he7x9bprusfo` | yes |
| BARA Eau De Parfum 2-Piece Luxury Gift Set | `cms9152qd00012p9rpgupqj61` | yes |
| Barakkat Rouge 540 Eau De Parfum | `cms8z0ttw00013zz5jp5fx4tl` | yes |
| Barakkat Rouge 540 Fragrance Mist (Brume Parfumée) | `cmsah4iua0001zappdvw4c887` | yes |
| Bath & Baby Week Beauty Summery Body Mist | `cmsac4mn40001omexnkogsiew` | yes |
| Bath & Body Week LES FLORAUX Lune Smell Body Mist | `cmsabm81500017bgg9a1l78f0` | yes |
| BLEU DE PARFUM Paris 50ml Eau de Parfum Set | `cms92idc80001ttcu2r69e8um` | yes |
| Bouchou Soft Soap Moisturizing & Soothing (Gentle Baby & Family Bar) | `cms578nno0001jr6sq5phvigx` | yes |
| Boudchou Baby Ointment (Pommade Bébé) | `cmsd2f75j0003xfnl3fcl9otj` | yes |
| Boudchou Baby Petroleum Jelly / Crème Onctueuse Protectrice | `cmsd2qsmz0005pjclrqbzcusa` | yes |
| Cantu Shea Butter for Natural Hair Coconut Curling Cream | `cmsgai04700026k5cim13kwl1` | yes |
| Carambola Black Spots Herbal Soap with Honey | `cms4wdtl90001x1mh127py0zy` | yes |
| Change De Canal Fragrance Mist (Brume Parfumée) | `cmsajj927000291ufr27aexly` | yes |
| Coconut Fantasy Fine Fragrance Mist | `cmsa72uo100015x0lvciizqhf` | yes |
| Dabur Herbolene Aloe Jelly | `cmsd6fm1200018s02lqneuspg` | yes |
| Dabur Herbolene Aloe Jelly | `cmsd9o6u70004r3jbyum8i348` | yes |
| Dalan Glycerin Soap Organic Lime | `cms65ikyk0001vz1l30jv8x4u` | yes |
| Dalan Glycerin Soap Organic Olive Oil | `cms677uhx0001kr9ecz3tks1m` | yes |
| Dalan Glycerin Soap with Organic Argan Oil | `cms4yk5pb0001t3aabkqr2oki` | yes |
| DAX Pomade Now With Lanolin | `cmsg0mh1p0004ayfzyxpa2sdn` | yes |
| Dear Body Autumn Cicada Fine Fragrance Mist | `cmsa7nixc00013zn0tswdjmo5` | yes |
| Dear Body Be Myself Fine Fragrance Mist | `cmsa58a2a000112dh8kccowa9` | yes |
| Dear Body Border Girl Fine Fragrance Mist | `cmsa60dro0002gsjknj58ys9v` | yes |
| Dear Body Brilliant Sunflower Fine Fragrance Mist | `cmsa6d2xg00023jxrvtxpu0xo` | yes |
| Dear Body NOIR for men Body Mist | `cmsaa0w3v0001o6qc1bpdxabl` | yes |
| Dear Body Noir Fragrance Mist | `cmsaelbey0006tw9ib19ed2ur` | yes |
| Dear Body SCARLET for Men Body Mist | `cmsa9mj770001113wvci5xj44` | yes |
| Dear Body Sweet Vanilla Fine Fragrance Mist | `cmsa93l6j00064o2fxr9qs4qi` | yes |
| Deep Conditioner — Moisture Lock | `cmrolyiy2000ymfrcw28ctcl4` | no |
| Dettol Juniors Glycerine Soap | `cms5zgrqo0004dwavyskobpcs` | yes |
| Dettol Original Antibacterial Soap 100g | `cms5wk8x60001wdrea56h0e3t` | yes |
| Dove Original Beauty Cream Bar 100g | `cms4vg4xm00015l2oui220ec3` | yes |
| DRODAVEN Whitening Papaya + Milk Body Lotion | `cmsdf5nx30001iss6889uu9fg` | yes |
| Duru Fresh Sensations Beauty Soap – Floral Infusion (Pack of 4) | `cms7d6j95000513cic5k08v19` | yes |
| Duru Fresh Sensations Beauty Soap – Ocean Breeze (Pack of 4) | `cms7bb9280002ejyvh1o11cov` | yes |
| Duru Natural Olive Soap with Olive Oil Extract | `cms51x3oz0001gf87xs15edhf` | yes |
| Duru Perfume Beauties Beauty Soap – Orchid Charm (Pack of 4) | `cms7cinnp00015bhmexib1lan` | yes |
| EVA Bathing Soap Refresh (Coconut & Lavender) | `cms6b6sgf0002125knjxjpu06` | yes |
| Exfoliating Gold Face & Body Scrub (With Natural Exfoliating Fruit Shells & Gold Pearl) | `cmsfxe8zb000279xbr3qzjod3` | yes |
| Exfoliating Gold Face & Body Scrub (With Natural Exfoliating Fruit Shells & Gold Pearl) | `cmsfxf92j0001u15rv5ms7csm` | no |
| Extract Whitening Herbal Soap Papaya Calaman | `cms693nko0001ys62whi1oob6` | yes |
| Eyeshadow Palette — Earth Tones | `cmrolyidd000qmfrcm5c6a5ic` | no |
| Full Coverage Foundation — Deep | `cmrolyhxt000kmfrcqxyqobhr` | no |
| Geisha Caring Coconut & Honey Soap | `cms7g0osm0002w9i2873h1wy1` | yes |
| Geisha Soothing Aloe Vera & Honey Soap (Strong & Long Lasting Daily Bathing Bar) | `cms7kufdq00016lc6yjfcd1ju` | yes |
| Hair Growth Oil — Rosemary & Peppermint | `cmrolyj390010mfrc8h2asfcp` | no |
| Hyaluronic Acid Hydrating Serum | `cmrolyh7w000amfrc724y6abg` | no |
| Imperial Leather Timeless Classic Bathing Bar Soap | `cms68h5df0001pb35yw3r1zog` | yes |
| Intense Wood Fragrance Mist (Brume Parfumée) | `cmsaic8y70001sc0bern6k4dj` | yes |
| Johnson's Baby Aqueous Cream Lightly Fragranced 350ml | `cmsbnqbkh000230vvnjxemb3g` | yes |
| KOJIC WHITE X2 Double Whitening Suite Soap (By Nano D-ne) | `cms7mccso0001oeb62jno3s53` | yes |
| Kojie San Classic Skin Lightening Soap | `cms4suf3n0001x24oetogdzx7` | yes |
| Kristal Fragrance Mist (Brume Parfumée) | `cmsagjyjk0002oc8138ta37l4` | yes |
| LA TCHADIENNE Whitening Lotion Super White Face & Body Lotion | `cmsdfrdpc000412inr1s1hb47` | yes |
| Lab White Atom Whitening Egg Yolk Soap | `cms7qdf1f0005gxk6nrps1u6t` | yes |
| Matte Liquid Lipstick — Mocha | `cmrolyi2z000mmfrcuma4xi8f` | no |
| MAYORA Eau De Parfum 2-Piece Luxury Gift Set | `cms8znl1u0001re9voge1oej3` | yes |
| Mega Growth Break-Free Hair & Scalp Food | `cmsg5kmjc0002665aar9y75po` | yes |
| MIADI Hair Curl Activator Gel | `cmsfv8rom0001x6patrclifit` | yes |
| MIADI Hair Mouldin' Gel Wax (With Olive Oil) | `cmsfwlrg40001ahis31ry6ud4` | yes |
| Mineral Sunscreen SPF 50 | `cmrolyhi9000emfrcoph36wi4` | no |
| More Up Aloe Vera & Vitamin E 2-in-1 Pure Petroleum Jelly | `cmsd3dro20001lpyr6m8ruwxm` | yes |
| Movit Sheen Hair Spray Olive & Argan Oil | `cmsgflac50002zrpcc3jka7kt` | yes |
| MPYA Rungu-Medi Anti-Bacterial Soap | `cms6cdi270002iswzxzla4gj1` | yes |
| NINA Family Soap Bathing Bar (Rose & Peach) | `cms6er9za00055m8824bba3mr` | yes |
| ONIRO Fragrance Mist (Brume Parfumée) | `cmsahx2k90006fm0m5epar6ed` | yes |
| Original Pure Egyptian Magic Whitening Gold Soap (With Egg Yolk & L-Glutathione) | `cms7p9wf20001122jdjnheulh` | yes |
| Oud For Glory (Bade'e Al Oud) Fragrance Mist (Brume Parfumée) | `cmsahlm7s0001fm0meke4wtmc` | yes |
| Papaya Carrot Gluta Soap Scrub Beads | `cms7fceal00022308eyj9ur8f` | yes |
| Piment Doux 5 Days Extra Whitening Milk (Lait Traitant) | `cmsdgcvls0001wm1aoxb0hubw` | yes |
| Protex Gentle Anti-Germ Bar Soap | `cms69urjz00012ybtw3nhp744` | yes |
| Purec Egyptian Gold 14Days Face & Body Lotion | `cmsdcr4wc0001f9co2r3ox2n4` | yes |
| Pyary Ayurvedic Turmeric Soap | `cms4ucr6r0001eynuz1zhaxbu` | yes |
| RDL Papaya Extract Whitening Hand & Body Lotion + Vitamin E | `cmsdejvam0001d044mywwyseo` | yes |
| Rinju Beauté Réelle Body & Hand Cream | `cms4plbon0005bowdenx82emd` | yes |
| Roushun Turmeric with Vitamin C Lighten Body Lotion | `cmsdc3dyq0001sdqqkb12ple4` | yes |
| SCANOAL A PARIS Eau de Parfum Spray Set (2 Pcs) | `cmsa3iocl0001jj1yqrai5ggi` | yes |
| Silky Cool Cucumber Face and Body Scrub Cream | `cmsg2jiuw0001e5agtafu6v1x` | yes |
| Silky Cool Milk Face and Body Scrub | `cmsg180la000111gyw5y5io78` | yes |
| soap | `cmrxot6sb0002emxghg18nhay` | yes |
| Sulfate-Free Shampoo — Curl Care | `cmrolyisw000wmfrcuecpch1u` | no |
| Super Love Eau De Parfum 2-Piece Gift Set | `cms90fi830006ysskkc4bz492` | yes |
| SUPER LOVE' RED Eau de Parfum 2PCS Gift Set | `cms91n9fj00013xqnwnd959ip` | yes |
| Sweet Rose Eau de Parfum Spray for Women | `cmsa0wo8t0001q151gsnj1jfq` | yes |
| Turmeric Super Whitening Soap (Body Repair, Anti Dark Spots & Anti-aging) | `cms6g7bw50001t2e8iqwbr34y` | yes |
| vaseline | `cmryqjq140003kyng291sn001` | no |
| Vaseline Blue Seal Aloe Vera Perfumed Petroleum Jelly 240ml | `cmscxq1wy0001ejm7ubfgu73h` | yes |
| Vaseline Blue Seal Baby Perfumed Petroleum Jelly | `cmscy45bz00099dzmmu8a62ag` | yes |
| Vaseline Blue Seal Cocoa Butter Perfumed Petroleum Jelly | `cmscz557t00019j2t3kc6m3ni` | yes |
| Vaseline Blue Seal Men Cooling Perfumed Petroleum Jelly 240ml | `cmscxz6xf00019dzmithv675i` | yes |
| Vaseline Blue Seal Original 100% Pure Petroleum Jelly 240ml | `cmsc2vilv0002icjzpdov05r0` | yes |
| Vaseline Intensive Care Cocoa Radiant Vitalizing Body Oil | `cmsdde2m0000155o25dtohbd4` | yes |
| Veet Gold Turmeric Super Whitening Oil | `cmsgd7e0u0001rkiavi8qq4p0` | yes |
| Veet Gold Turmeric Super Whitening Oil | `cmsgc7y6m0001rqg2omrg09c4` | yes |
| Veet Gold Turmeric Super Whitening Oil | `cmsgd1vne0001xr62k2p30osg` | yes |
| Veet Gold Vitamin C Body Corrector Soap (7 Days Whitening and Glowing Soap SPF15) | `cms7jul6x000113qtorjqurs5` | yes |
| Verlorna World Barakkat Rouge 540 Body Mist | `cmsadssi900042fl3jez68jhi` | yes |
| Verlorna World Fantsly | `cmsacjlqf0001141bk4t2ttc5` | yes |
| Verlorna World For Away Body Mist | `cmsad34xi0002euugmjdv8g31` | yes |
| Verlorna World Ideal Fragrance Mist | `cmsae5ur30007euugerxn639u` | yes |
| Victoria Super Colorful (VSC) Carrot 7 Days Extra Whitening Soap | `cms7ip3bs0001ko5avz90rcy8` | yes |
| Vitamin C Brightening Serum | `cmrolygxh0008mfrcr2hjtqdh` | no |
| White Express Lait Éclaircissant – Complexe Duo-Éclat | `cmsdhxzqm0001swguwcc8t8ft` | yes |
| White Express Lait Éclaircissant – Extra Whitening Lotion 500ml | `cmsdid43t0005njbfcwha5c7m` | yes |
| Yara Pink Fragrance Mist (Brume Parfumée) | `cmsaiyven0001z4vhveccls3e` | yes |
| Zwitsal Baby Body Lotion with Avocado Oil – 400ml | `cmsde337h0001y24f3r3lz7nd` | yes |
