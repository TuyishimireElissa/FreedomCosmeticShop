import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const publishedAt = new Date('2026-07-18T09:00:00.000Z')

const STARTER_POSTS = [
  {
    slug: 'uburyo-bwo-kwita-ku-ruhu-buri-munsi',
    title: 'A Simple Daily Skincare Routine for Rwanda',
    titleRw: 'Uburyo Bworoshye bwo Kwita ku Ruhu Buri Munsi', // verified-rw
    excerpt: 'A practical routine built around gentle cleansing, moisturizing and daily sun protection.',
    excerptRw: 'Gahunda yoroshye ishingiye ku gusukura uruhu buhoro, kurushyiraho amavuta arutosa no kururinda izuba buri munsi.', // verified-rw
    content: `# A Simple Daily Skincare Routine

A useful routine does not need many products. Start with a few steps and observe how your skin responds.

## Morning

1. Cleanse gently. Use a mild cleanser and avoid scrubbing aggressively.
2. Moisturize. Choose a texture that feels comfortable for your skin.
3. Use broad-spectrum sunscreen according to its package directions. Sun protection matters even when the day feels cool or cloudy.

## Evening

1. Remove makeup or sunscreen gently when needed.
2. Cleanse without over-washing.
3. Moisturize again if your skin feels dry or tight.

## Introduce products carefully

Read the ingredient list and warnings on the package. Add one unfamiliar product at a time and consider a small patch test. Stop using a product if it causes significant irritation.

Cosmetic guidance cannot diagnose or treat a skin condition. Persistent pain, swelling, severe irritation or acne that concerns you should be discussed with a qualified health professional.

FreedomCosmeticShop listings show current product information and recorded warnings where available. Check the package because manufacturers may update formulas.`,
    contentRw: `# Uburyo Bworoshye bwo Kwita ku Ruhu Buri Munsi

Kwita ku ruhu ntibisaba ibicuruzwa byinshi. Tangira n’intambwe nke, urebe uko uruhu rwawe rubyakira.

## Mu gitondo

1. Sukura uruhu buhoro. Koresha igikoresho cyoroheje kandi wirinde kurukuba cyane.
2. Shyiraho amavuta atuma uruhu rugumana ubuhehere. Hitamo ayoroheye uruhu rwawe.
3. Koresha igikoresho kirinda izuba ukurikije amabwiriza ari ku gipfunyika. Kurinda uruhu izuba ni ingenzi no ku munsi ukonje cyangwa urimo ibicu.

## Nimugoroba

1. Kuraho ibikoresho byo kwisiga cyangwa ibyo kwirinda izuba buhoro igihe bikenewe.
2. Sukura uruhu ariko wirinde kurukaraba kenshi cyane.
3. Ongera ushyireho amavuta arutosa niba rwumye cyangwa rukanyaraye.

## Koresha igicuruzwa gishya witonze

Soma ibigize igicuruzwa n’imiburo biri ku gipfunyika. Ongeramo igicuruzwa kimwe gishya, kandi ushobora kubanza kugerageza duke ku gice gito cy’uruhu. Hagarika kugikoresha niba gitera uburyaryate bukomeye.

Inama ku bikoresho byo kwisiga ntisimbura isuzuma cyangwa ubuvuzi. Niba ufite ububabare, kubyimba, uburyaryate bukomeye cyangwa ibiheri biguhangayikishije, vugana n’umukozi w’ubuzima ubifitiye ubumenyi.

Urupapuro rw’igicuruzwa kuri FreedomCosmeticShop rugaragaza amakuru n’imiburo byanditswe aho biboneka. Buri gihe genzura n’ibiri ku gipfunyika kuko uwagikoze ashobora guhindura ibigize.`, // verified-rw
    category: 'skincare',
    tags: JSON.stringify(['skincare', 'routine', 'rwanda']),
    status: 'PUBLISHED',
    publishedAt,
    authorName: 'FreedomCosmeticShop',
    metaTitle: 'Simple Daily Skincare Routine for Rwanda',
    metaTitleRw: 'Uburyo Bworoshye bwo Kwita ku Ruhu mu Rwanda', // verified-rw
    metaDescription: 'A careful daily skincare routine with cleansing, moisturizing, sunscreen and product-safety reminders.',
    metaDescriptionRw: 'Gahunda yo kwita ku ruhu irimo kurusukura, kurutosa, kururinda izuba no gukoresha ibicuruzwa witonze.', // verified-rw
  },
  {
    slug: 'uburyo-bwo-guhitamo-umubavu',
    title: 'How to Choose and Use a Fragrance Carefully',
    titleRw: 'Uburyo bwo Guhitamo no Gukoresha Umubavu Witonze', // verified-rw
    excerpt: 'Compare fragrance families, test gradually and follow package safety guidance.',
    excerptRw: 'Gereranya ubwoko bw’imibavu, uyigerageze buhoro kandi ukurikize amabwiriza y’umutekano ari ku gipfunyika.', // verified-rw
    content: `# How to Choose and Use a Fragrance Carefully

Fragrance preference is personal. A scent that works for one person may not suit another, and the smell can change after it has been on skin for a while.

## Start with fragrance families

Fresh and citrus scents often feel light. Floral scents focus on flower notes. Woody scents can include cedar or sandalwood notes. Warm scents may include vanilla, amber or spice notes. These labels describe style; they do not guarantee how a fragrance will smell on you.

## Test before deciding

When a tester is available, try a small amount and wait before deciding. Avoid testing many fragrances on the same area at once. Do not apply fragrance to irritated or broken skin.

## Use and store it safely

Follow the package directions and warnings. Keep fragrance away from eyes, flames and high heat. Store it closed and away from direct sunlight. If you know that fragrance ingredients trigger sensitivity for you, review the label carefully and seek professional advice when needed.

FreedomCosmeticShop does not publish a fragrance as suitable for allergies unless reliable product information supports that statement.`,
    contentRw: `# Uburyo bwo Guhitamo no Gukoresha Umubavu Witonze

Gukunda umubavu runaka biterwa n’umuntu. Impumuro ibereye umuntu umwe ishobora kutabera undi, kandi ishobora guhinduka imaze igihe ku ruhu.

## Banza umenye ubwoko bw’impumuro

Imibavu ifite impumuro nziza kandi yoroheje ishobora kuba irimo impumuro z’indimu cyangwa amacunga. Hari iyibanda ku ndabo, iyibanda ku biti, n’iyibanda ku mpumuro zishyushye nka vanilla cyangwa ibirungo. Aya mazina asobanura ubwoko bw’impumuro; ntabwo yemeza uko izahumura kuri wowe.

## Gerageza mbere yo guhitamo

Niba hari iyo kugerageza, koresha duke maze utegereze mbere yo gufata icyemezo. Irinde kugerageza imibavu myinshi ahantu hamwe icyarimwe. Ntugashyire umubavu ku ruhu rwakomeretse cyangwa rurimo uburyaryate.

## Wukoreshe kandi uwubike neza

Kurikiza amabwiriza n’imiburo biri ku gipfunyika. Irinde ko ugera mu maso, ku muriro cyangwa ahantu hashyushye cyane. Wubike ufunze kandi utari ku zuba. Niba hari ibigize imibavu umubiri wawe utihanganira, genzura ibyanditse kandi usabe inama y’inzobere igihe bikenewe.

FreedomCosmeticShop ntivuga ko umubavu ubereye abafite allergie keretse hari amakuru yizewe y’igicuruzwa abyemeza.`, // verified-rw
    category: 'fragrance',
    tags: JSON.stringify(['fragrance', 'guide', 'rwanda']),
    status: 'PUBLISHED',
    publishedAt,
    authorName: 'FreedomCosmeticShop',
    metaTitle: 'How to Choose a Fragrance in Rwanda',
    metaTitleRw: 'Uburyo bwo Guhitamo Umubavu mu Rwanda', // verified-rw
    metaDescription: 'A practical fragrance guide covering scent families, testing, safe use and storage.',
    metaDescriptionRw: 'Amabwiriza yo guhitamo umubavu, kuwugerageza, kuwukoresha no kuwubika neza.', // verified-rw
  },
  {
    slug: 'kwita-ku-ruhu-rugira-amavuta',
    title: 'A Careful Routine for Oily Skin',
    titleRw: 'Uburyo bwo Kwita ku Ruhu Rugira Amavuta', // verified-rw
    excerpt: 'Gentle steps for oily skin without promises to diagnose, cure or eliminate acne.',
    excerptRw: 'Intambwe zoroheje zo kwita ku ruhu rugira amavuta, nta kwizeza gusuzuma cyangwa kuvura ibiheri.', // verified-rw
    content: `# A Careful Routine for Oily Skin

Oily skin can feel shiny, but harsh washing can leave it irritated. A simple routine is easier to assess than changing several products at once.

## A basic routine

1. Use a gentle cleanser according to its directions.
2. Use a lightweight moisturizer if it is comfortable for your skin. Oily skin can still feel dehydrated.
3. Apply broad-spectrum sunscreen according to the package instructions.
4. Remove makeup gently before sleeping.

## Read product claims carefully

Terms such as “non-comedogenic” or “oil-free” should be trusted only when the manufacturer records them. They do not guarantee that every person will have the same experience.

Avoid aggressive scrubbing and avoid combining unfamiliar active ingredients without reliable guidance. Introduce one product at a time so that it is easier to notice irritation.

Cosmetics do not diagnose or cure acne. Speak with a qualified health professional if breakouts are painful, persistent, scarring or otherwise concerning.

Use the filters and recorded product details on FreedomCosmeticShop to compare current options, then confirm the ingredient list on the package.`,
    contentRw: `# Uburyo bwo Kwita ku Ruhu Rugira Amavuta

Uruhu rugira amavuta rushobora kubengerana, ariko kurukaraba cyangwa kurukuba bikabije bishobora kurutera uburyaryate. Gahunda yoroshye iroroha kuyigenzura kurusha guhindura ibicuruzwa byinshi icyarimwe.

## Gahunda y’ibanze

1. Koresha igikoresho cyoroheje cyo gusukura ukurikije amabwiriza yacyo.
2. Koresha amavuta yoroheje atuma uruhu rugumana ubuhehere niba abereye uruhu rwawe. Uruhu rugira amavuta na rwo rushobora kubura ubuhehere.
3. Koresha igikoresho kirinda izuba ukurikije amabwiriza ari ku gipfunyika.
4. Kuraho ibikoresho byo kwisiga buhoro mbere yo kuryama.

## Soma neza ibyo igicuruzwa kivuga

Amagambo nka “non-comedogenic” cyangwa “oil-free” akwiye kwizerwa gusa iyo uwakoze igicuruzwa yayanditse. Ntabwo yemeza ko abantu bose bazabona igisubizo kimwe.

Irinde gukuba uruhu cyane no kuvanga ibigize ibicuruzwa bishya udafite amabwiriza yizewe. Ongeramo igicuruzwa kimwe kugira ngo byorohe kubona icyateye uburyaryate.

Ibikoresho byo kwisiga ntibisuzuma kandi ntibivura ibiheri. Vugana n’umukozi w’ubuzima ubifitiye ubumenyi niba ibiheri bibabaza, bimara igihe, bisiga inkovu cyangwa biguhangayikishije.

Koresha inshungura n’amakuru yanditswe kuri FreedomCosmeticShop ugereranye ibicuruzwa biriho, hanyuma wemeze ibigize igicuruzwa ureba ku gipfunyika.`, // verified-rw
    category: 'skincare',
    tags: JSON.stringify(['oily-skin', 'skincare', 'rwanda']),
    status: 'PUBLISHED',
    publishedAt,
    authorName: 'FreedomCosmeticShop',
    metaTitle: 'A Careful Oily-Skin Routine for Rwanda',
    metaTitleRw: 'Uburyo bwo Kwita ku Ruhu Rugira Amavuta mu Rwanda', // verified-rw
    metaDescription: 'A gentle oily-skin routine with product-safety guidance and no medical treatment claims.',
    metaDescriptionRw: 'Gahunda yoroheje yo kwita ku ruhu rugira amavuta n’amabwiriza yo gukoresha ibicuruzwa witonze.', // verified-rw
  },
] as const

async function main() {
  console.log('Seeding three bilingual starter beauty guides...')
  for (const post of STARTER_POSTS) {
    const { publishedAt: initialPublishedAt, ...content } = post
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: { ...content, publishedAt: initialPublishedAt },
      update: content,
    })
    console.log(`Prepared: ${post.slug}`)
  }
  console.log('Bilingual starter beauty guides are ready.')
}

main()
  .catch((error) => {
    console.error('Blog starter seed failed:', error instanceof Error ? error.message : 'unknown')
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
