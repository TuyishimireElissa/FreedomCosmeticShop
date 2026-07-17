import type { TranslationShape, EnglishTranslations } from './en'

/**
 * Kinyarwanda translations.
 * 🔍 REVIEW: Every translated value in this file must be reviewed by a fluent
 * Kinyarwanda speaker before it is enabled for production customers.
 */
export const rw = {
  common: {
    loading: 'Birimo gutegurwa...', error: 'Habaye ikibazo', retry: 'Ongera ugerageze', save: 'Bika', cancel: 'Hagarika', confirm: 'Emeza', delete: 'Siba', edit: 'Hindura', view: 'Reba', close: 'Funga', back: 'Subira inyuma', next: 'Komeza', previous: 'Ibibanza', search: 'Shakisha', filter: 'Shungura', sort: 'Tondeka', clear: 'Siba byose', apply: 'Koresha', submit: 'Ohereza', yes: 'Yego', no: 'Oya', or: 'cyangwa', and: 'na', currency: 'RWF', free: 'UBUNTU', required: 'Birasabwa', optional: 'Si ngombwa', new: 'Gishya', hot: 'Gikunzwe', sale: 'Cyagabanyijwe', sold_out: 'Byashize', in_stock: 'Birahari', low_stock: 'Hasigaye {count} gusa!', authentic: '100% Umwimerere', // 🔍 REVIEW
  },
  accessibility: {
    skip_to_content: 'Simbukira ku bikubiye ku rupapuro', // verified-rw
    required: '(birasabwa)', // verified-rw
    close: 'Funga', // verified-rw
    go_back: 'Subira inyuma', // verified-rw
    remove_item: 'Kuraho {item}', // verified-rw
    payment_status_paid: 'Yishyuwe', // verified-rw
    payment_status_pending: 'Kwishyura birategerejwe', // verified-rw
    payment_status_failed: 'Kwishyura ntibyakunze', // verified-rw
    payment_status_refunded: 'Amafaranga yasubijwe', // verified-rw
    payment_status_overdue: 'Kwishyura byarengeje igihe', // verified-rw
    pause_carousel: 'Hagarika uruhererekane rw’amashusho', // verified-rw
    play_carousel: 'Komeza uruhererekane rw’amashusho', // verified-rw
    slide_position: 'Ishusho {current} kuri {total}', // verified-rw
    reviews_carousel: 'Uruhererekane rw’ibitekerezo by’abakiriya', // verified-rw
    cart_added: '{product} yashyizwe mu gitebo. Umubare ni {quantity}.', // verified-rw
    cart_removed: '{product} yakuwe mu gitebo.', // verified-rw
    cart_quantity: 'Umubare wa {product} wahinduwe uba {quantity}.', // verified-rw
    cart_restored: '{product} yasubijwe mu gitebo.', // verified-rw
    cart_cleared: 'Igitebo cyasigaye kirimo ubusa.', // verified-rw
    cart_saved_for_later: '{product} yimuriwe mu byo kubika.', // verified-rw
    cart_moved_from_saved: '{product} yimuriwe mu gitebo.', // verified-rw
  },
  low_data: {
    title: 'Uburyo bwo kuzigama interineti', // verified-rw
    description: 'Gabanya interineti ikoreshwa kandi urubuga rufunguke vuba kuri murandasi icumbagira.', // verified-rw
    turn_on: 'Fungura uburyo bwo kuzigama interineti', // verified-rw
    turn_off: 'Funga uburyo bwo kuzigama interineti', // verified-rw
    data_saver: 'Kuzigama interineti', // verified-rw
    full_data: 'Interineti isanzwe', // verified-rw
    preference: 'Hitamo uko interineti ikoreshwa', // verified-rw
    auto: 'Byikoresha', // verified-rw
    auto_description: 'Igenzura murandasi', // verified-rw
    on: 'Birakora', // verified-rw
    on_description: 'Ikoresha interineti nke', // verified-rw
    off: 'Birafunze', // verified-rw
    off_description: 'Ubwiza bwuzuye', // verified-rw
    slow_detected: 'Twabonye murandasi icumbagira ({type})', // verified-rw
    save_data_detected: 'Mucukumbuzi yawe yasabye kugabanya interineti ikoreshwa.', // verified-rw
    current_status: 'Uko bimeze ubu: {status}', // verified-rw
    status_saver: 'Kuzigama interineti birakora', // verified-rw
    status_full: 'Interineti isanzwe', // verified-rw
    settings_title: 'Interineti n’umuvuduko', // verified-rw
    settings_description: 'Hitamo uko FreedomCosmeticShop ikoresha interineti kuri iki gikoresho.', // verified-rw
    account_settings: 'Igenamiterere rya konti', // verified-rw
    carousel_paused: 'Uburyo bwo kuzigama interineti: guhindura amashusho byikora byahagaritswe.', // verified-rw
    hero_optimized: 'Uburyo bwo kuzigama interineti: hifashishijwe ishusho yoroheje.', // verified-rw
    deferred_section: '{section} ntikirafungurwa kugira ngo interineti ya telefoni izigamwe.', // verified-rw
    load_section: 'Fungura {section}', // verified-rw
  },
  offline: {
    title: 'Nta murongo wa interineti uhari', // verified-rw
    cart_saved: 'Impinduka zo mu gitebo zirabikwa kuri iki gikoresho. Serivisi zikenera interineti zizagaruka numara kongera kuyibona.', // verified-rw
  },
  network: {
    retrying: 'Murandasi yagize ikibazo. Turongera kugerageza ({attempt}/{max})…', // verified-rw
    offline: 'Nta murongo wa interineti uhari. Ongera uwubone maze ugerageze. Amakuru wanditse aracyahari.', // verified-rw
    request_failed: 'Ubusabe ntibwashoboye kurangira. Genzura murandasi wongere ugerageze. Amakuru wanditse aracyahari.', // verified-rw
    server_error: 'Seriveri ntiyashoboye kurangiza ubusabe. Ongera ugerageze utiriwe wongera kwandika amakuru yawe.', // verified-rw
  },
  nav: {
    home: 'Ahabanza', products: 'Ibicuruzwa', categories: 'Ibyiciro', brands: 'Ibirango', bundles: 'Gahunda n’amatsinda', quiz: 'Shakisha gahunda yanjye', wholesale: 'Kurangura', wholesale_offer: 'Kurangura — ibiciro bya buri gicuruzwa', blog: 'Inkuru', about: 'Abo turi bo', contact: 'Twandikire', account: 'Konti yanjye', orders: 'Ibyo natumije', wishlist: 'Ibyo nifuza', cart: 'Igitebo', login: 'Injira', register: 'Iyandikishe', logout: 'Sohoka', admin: 'Ubuyobozi', help: 'Ubufasha', language: 'Ururimi', signed_out: 'Wasohotse neza', sign_in_wishlist: 'Injira kugira ngo ubike ibyo ukunda', payment_methods: 'Uburyo bwo kwishyura twemera', account_menu: 'Ibikubiye muri konti', product_categories: 'Ibyiciro by’ibicuruzwa', mobile_navigation: 'Ibikubiye kuri telefoni', language_selected: 'Ururimi: {language}', english_selected: 'Hahiswemo Icyongereza.', french_coming: 'Igifaransa kizongerwamo vuba.', kinyarwanda_selected: 'Hahiswemo Ikinyarwanda.', language_change: 'Ururimi: {language}. Kanda uhindure.', open_search: 'Fungura ahashakirwa', close_search: 'Funga ahashakirwa', open_menu: 'Fungura urutonde', close_menu: 'Funga urutonde', whatsapp_support: 'Ubufasha kuri WhatsApp', search_placeholder: 'Shakisha ibita ku ruhu, ibikoresho byo kwisiga, ibita ku musatsi...', // 🔍 REVIEW // verified-rw
  },
  announcement: {
    free_delivery: 'Kubigezwaho ni ubuntu ku bicuruzwa birengeje {amount} RWF', // verified-rw
    promotion: 'Kode {code} igabanya {percent}%', // verified-rw
    dismiss: 'Funga iri tangazo', // verified-rw
  },
  footer: {
    description: 'Ahantu ho mu Rwanda wabona ibita ku ruhu, ibikoresho byo kwisiga n’ibita ku musatsi. Ibicuruzwa by’umwimerere, ibiciro biboneye no kubigeza hirya no hino mu Rwanda.', // verified-rw
    shop: 'Guhaha', help: 'Ubufasha', track_order: 'Kurikirana ibyo watumije', delivery_kigali: 'Kubigeza muri Kigali: iminsi 1–3', delivery_provinces: 'Mu ntara: iminsi 3–5', shipping_policy: 'Politiki yo kugeza ibicuruzwa', returns_refunds: 'Gusubiza ibicuruzwa n’amafaranga', faq: 'Ibibazo bikunze kubazwa', privacy_policy: 'Politiki y’amakuru bwite', terms_conditions: 'Amabwiriza n’amategeko', contact: 'Twandikire', whatsapp_chat: 'Ganira natwe kuri WhatsApp', we_accept: 'Uburyo bwo kwishyura twemera', made_in_rwanda: 'Byakozwe n’urukundo mu Rwanda 🇷🇼', all_rights_reserved: 'Uburenganzira bwose burubahirizwa.', wholesale_beauty: 'Kurangura ibicuruzwa by’ubwiza', genuine: '100% Umwimerere', genuine_products: 'Ibicuruzwa by’umwimerere', fast_delivery: 'Kubigeza vuba', all_districts: 'Uturere 30 twose', simple_payment: 'Kwishyura mu buryo bworoshye', local_support: 'Ubufasha bwo mu Rwanda', here_to_help: 'Twiteguye kugufasha', returns_days: 'Gusubiza mu minsi {days}', admin_dashboard: 'Urubuga rw’ubuyobozi', safe_pay: 'Kwishyura bitekanye', secured_by: 'Birinze na {provider}', mobile_money_accepted: 'Twemera Mobile Money', whatsapp_support: 'Ubufasha kuri WhatsApp', // verified-rw
  },
  home: {
    apply_wholesale: 'Saba konti yo kurangura', // verified-rw
    apply_wholesale_account: 'Saba konti yo kurangura', // verified-rw
    authentic_percent: 'Ibicuruzwa by’umwimerere 100%', // verified-rw
    authentic_products: 'Ibicuruzwa by’umwimerere', // verified-rw
    authorized_genuine: 'Ibicuruzwa by’umwimerere 100% biva ku bacuruzi babyemerewe', // verified-rw
    beauty_expertise: 'Ubumenyi mu by’ubwiza', // verified-rw
    beauty_guides: 'Inama n’amabwiriza by’ubwiza', // verified-rw
    best_sellers_subtitle: 'Ibicuruzwa abakiriya bakunda, twaguhitiyemo.', // verified-rw
    brand_subtitle: 'Ibicuruzwa by’umwimerere by’ibirango ukunda.', // verified-rw
    brands_coming: 'Ibirango bishya by’ubwiza biri hafi kwiyongera mu bubiko.', // verified-rw
    brands_load_failed: 'Ibirango dukorana ntibyashoboye gufunguka.', // verified-rw
    browse_offers: 'Reba ibicuruzwa byagabanyijwe', // verified-rw
    bulk_support: 'Ubufasha ku bicuruzwa byinshi', // verified-rw
    categories_unavailable: 'Ibyiciro ntibiboneka by’akanya.', // verified-rw
    category_subtitle: 'Reba ibicuruzwa by’ubwiza by’umwimerere byahitiwe uburyo bwose bwo kwita ku mubiri, amabara y’uruhu n’imisatsi itandukanye.', // verified-rw
    code_copied: 'Kode yakoporowe!', // verified-rw
    code_ready: 'Kode {code} yiteguye gukoreshwa mu kwishyura.', // verified-rw
    collection_safe_retry: 'Ibicuruzwa byawe biratekanye—ongera ugerageze.', // verified-rw
    collections_coming: 'Ibyiciro bishya by’ibicuruzwa by’ubwiza biri hafi kuboneka.', // verified-rw
    copy_coupon: 'Koporora kode {code}', // verified-rw
    copy_failed: 'Gukoporora ntibyakunze', // verified-rw
    credit_available: 'Inguzanyo irahari', // verified-rw
    curated_collections: 'Ibyiciro twaguhitiyemo', // verified-rw
    days_nationwide: 'Iminsi 1-5 mu Rwanda hose', // verified-rw
    default_offer_description: 'Gabanyirizwa 10% kuri komande ya mbere. Ishyura na MTN MoMo cyangwa ugejejweho.', // verified-rw
    default_offer_discount: 'IGABANYIRIZWA RYA 10%', // verified-rw
    delivery_days: 'Iminsi 1-3 muri Kigali, iminsi 3-5 mu ntara', // verified-rw
    ends_in: 'Birarangira mu', // verified-rw
    explore_best_sellers: 'Reba ibicuruzwa bikunzwe cyane', // verified-rw
    fast_rwanda_delivery: 'Kubigeza vuba mu Rwanda', // verified-rw
    featured_campaigns: 'Kwamamaza ibicuruzwa by’ubwiza byatoranyijwe', // verified-rw
    featured_essentials: 'Ibicuruzwa by’ingenzi by’ubwiza', // verified-rw
    featured_subtitle: 'Ibita ku ruhu, ibikoresho byo kwisiga n’ibita ku musatsi twaguhitiyemo kandi biboneka mu Rwanda.', // verified-rw
    first_share_experience: 'Ba uwa mbere gusangiza abandi uko igicuruzwa cyakunyuzemo.', // verified-rw
    flash_sale: 'Igabanyirizwa ry’ibicuruzwa by’ubwiza', // verified-rw
    flash_subtitle: 'Ibicuruzwa bikunzwe ku biciro byagabanyijwe mu gihe gito.', // verified-rw
    freedom_favourites: 'Ibyatoranyijwe na Freedom', // verified-rw
    freedom_wholesale: 'Kurangura kuri Freedom', // verified-rw
    fresh_products_coming: 'Ibicuruzwa bishya biri hafi kuboneka.', // verified-rw
    from_reviews: 'bivuye ku bitekerezo {count}', // verified-rw
    genuine_beauty_products: 'Ibicuruzwa by’ubwiza by’umwimerere', // verified-rw
    guides_preparing: 'Inama nshya z’ubwiza zirimo gutegurwa.', // verified-rw
    hero_subtitle: 'Reba ibita ku ruhu, ibikoresho byo kwisiga n’ibita ku musatsi byiza byahitiwe ikirere cy’u Rwanda n’uruhu rukungahaye kuri melanine.', // verified-rw
    hero_title: 'Ubwisanzure mu bwiza bw’u Rwanda 🇷🇼', // verified-rw
    hero_description: 'Ibicuruzwa by’umwimerere 100%. Ishyura na MTN MoMo. Tukabikugezaho vuba mu Rwanda hose.', // verified-rw
    hero_cta_primary: 'Haha nonaha', // verified-rw
    hero_cta_secondary: 'Ibiciro byo kurangura', // verified-rw
    hero_alt: 'Ibicuruzwa by’ubwiza bya FreedomCosmeticShop mu Rwanda', // verified-rw
    join_wholesale_program: 'Saba kubona ibiciro byo kurangura byashyizweho kuri buri gicuruzwa.', // verified-rw
    just_arrived: 'Bimaze kuhagera', // verified-rw
    just_arrived_subtitle: 'Ibicuruzwa bishya, amabara agezweho n’ibindi by’ubwiza bishya biboneka mu Rwanda.', // verified-rw
    kigali_all_districts: 'Kigali n’uturere 30 twose', // verified-rw
    loading_promotions: 'Kwamamaza ibicuruzwa byatoranyijwe birimo gufunguka', // verified-rw
    loved_by_rwandans: 'Bikunzwe n’Abanyarwanda', // verified-rw
    loved_rwanda: 'Bikunzwe mu Rwanda hose', // verified-rw
    loyalty_rewards: 'Ibihembo by’indahemuka', // verified-rw
    made_for_routine: 'Byagenewe gahunda yawe', // verified-rw
    made_for_rwanda: 'Byagenewe u Rwanda', // verified-rw
    melanin_formulas: 'Amabara n’ibigize ibicuruzwa bikwiriye uruhu rukungahaye kuri melanine', // verified-rw
    momo_airtel: 'MTN MoMo na Airtel', // verified-rw
    momo_cod: 'MTN MoMo cyangwa kwishyura ugejejweho', // verified-rw
    new_arrivals_subtitle: 'Ibicuruzwa bishya bimaze kugera mu bubiko.', // verified-rw
    new_this_week: 'Bishya muri iki cyumweru', // verified-rw
    next_banner: 'Igikurikira', // verified-rw
    next_reviews: 'Ibitekerezo bikurikira', // verified-rw
    next_sale_preparing: 'Igabanyirizwa rikurikira ririmo gutegurwa.', // verified-rw
    pay_instantly: 'Ishyura ako kanya', // verified-rw
    pay_when_received: 'Ishyura ubibonye', // verified-rw
    pay_your_way: 'Ishyura uko ushaka — Mobile Money cyangwa amafaranga', // verified-rw
    premium_for_rwanda: 'Ibicuruzwa byiza by’ubwiza mu Rwanda', // verified-rw
    previous_banner: 'Igibanza', // verified-rw
    previous_reviews: 'Ibitekerezo bibanza', // verified-rw
    priority_delivery: 'Kubigeza mbere', // verified-rw
    pro_invoices: 'Inyemezabwishyu z’umwuga', // verified-rw
    products_count: 'Ibicuruzwa {count}', // verified-rw
    products_load_failed: 'Ibicuruzwa ntibyashoboye gufunguka.', // verified-rw
    purchased_product: 'Yaguze: {product}', // verified-rw
    rating_stars: 'Amanota {rating} kuri 5', // verified-rw
    real_stories: 'Inkuru nyazo z’abakiriya', // verified-rw
    registered_businesses: 'Ku bucuruzi bwanditswe mu Rwanda', // verified-rw
    retry_banners: 'Ongera ufungure amatangazo', // verified-rw
    retry_collections_hint: 'Ongera ugerageze gufungura ibyiciro.', // verified-rw
    retry_details: 'Ongera ufungure ibisobanuro', // verified-rw
    retry_products: 'Ongera ufungure ibicuruzwa', // verified-rw
    retry_reviews: 'Ongera ufungure ibitekerezo', // verified-rw
    retry_sale: 'Ongera ufungure ibyagabanyijwe', // verified-rw
    review_group: 'Jya ku itsinda ry’ibitekerezo {number}', // verified-rw
    reviews_countrywide: 'Ibitekerezo nyabyo by’abakiriya bacu hirya no hino mu Rwanda.', // verified-rw
    reviews_load_failed: 'Ibitekerezo ntibyashoboye gufunguka', // verified-rw
    reviews_unavailable: 'Ibitekerezo by’abakiriya ntibiboneka', // verified-rw
    rwanda_beauty_destination: 'Ahantu h’ubwiza mu Rwanda', // verified-rw
    sale_load_failed: 'Ibicuruzwa byagabanyijwe ntibyashoboye gufunguka.', // verified-rw
    salon_shop_owner: 'Ufite salon cyangwa iduka?', // verified-rw
    scroll_brands_left: 'Subiza ibirango ibumoso', // verified-rw
    scroll_brands_right: 'Komeza ibirango iburyo', // verified-rw
    shop_category: 'Haha ukurikije icyiciro', // verified-rw
    shop_collection: 'Reba ibicuruzwa', // verified-rw
    shop_now: 'Haha nonaha', // verified-rw
    show_banner: 'Erekana itangazo {number}', // verified-rw
    simple_local_payments: 'Kwishyura mu buryo bworoshye bwo mu Rwanda', // verified-rw
    special_offer: 'Igabanyirizwa ryihariye', // verified-rw
    store_guarantees: 'Ibyo iduka ryizeza', // verified-rw
    stories_load_failed: 'Inkuru z’ubwiza ntizashoboye gufunguka.', // verified-rw
    stories_unavailable: 'Inkuru z’abakiriya ntiziboneka by’akanya.', // verified-rw
    testimonials: 'Ibyo abakiriya bavuga', // verified-rw
    today_only: 'Uyu munsi gusa', // verified-rw
    top_brands: 'Ibirango bikunzwe', // verified-rw
    top_rated: '★ Byahawe amanota menshi', // verified-rw
    up_to_off: 'Bishyirwaho kuri buri gicuruzwa', // verified-rw
    verified_experiences: 'Ibitekerezo byemejwe by’abakiriya babonye ibicuruzwa bishya bakunda.', // verified-rw
    view_all: 'Reba byose', // verified-rw
    weekend_offer: 'Gabanyirizwa 15% mu mpera z’icyumweru. Ishyura na MTN MoMo cyangwa ugejejweho. Komande ntoya ni 10,000 RWF.', // verified-rw
    wholesale_benefits_failed: 'Ibyiza byo kurangura ntibyashoboye gufunguka.', // verified-rw
    wholesale_load_failed: 'Amakuru yo kurangura ntiyashoboye gufunguka', // verified-rw
    wholesale_minimum_audience: 'Komande ntoya: 50,000 RWF · Kuri salon, amaduka, spa n’abacuruzi bo mu Rwanda', // verified-rw
    wholesale_savings: 'Zigama kugera kuri {percent}% · Komande ntoya {amount}', // verified-rw
    wholesale_subtitle: 'Saba kubona ibiciro byo kurangura byashyizweho kuri buri gicuruzwa. Igabanyirizwa, inguzanyo na komande ntoya bitashyizweho ntibitangazwa.', // verified-rw
    wholesale_title: 'Ubusabe bwo kurangura ku bucuruzi bwanditswe mu Rwanda.', // verified-rw
    wholesale_unavailable: 'Amakuru yo kurangura ntashobora kuboneka', // verified-rw
    wonderful_experience: 'Igicuruzwa na serivisi byo guhaha byaranshimishije.', // verified-rw
    write_code: 'Andika iyi kode: {code}', // verified-rw

    weekend_discount: 'IGABANYIRIZWA RYA 15%', // verified-rw
    brand_logo: 'Ikirango cya {brand}', // verified-rw

    copy_code: 'Koporora', // verified-rw
    coupon_percent: 'Igabanyirizwa rya {value}%', // verified-rw
    coupon_fixed: 'Igabanyirizwa rya {amount}', // verified-rw
    coupon_free_shipping: 'Kubigezwaho ku buntu', // verified-rw
    coupon_minimum: 'Komande ntoya: {amount}', // verified-rw
    coupon_maximum: 'Igabanyirizwa ntarengwa: {amount}', // verified-rw
    coupon_per_user: 'Buri mukiriya ayikoresha inshuro {count}', // verified-rw
    coupon_selected_products: 'Ikoreshwa ku bicuruzwa cyangwa ibyiciro byatoranyijwe gusa', // verified-rw
    coupon_valid_until: 'Ikoreshwa kugeza ku wa {date}', // verified-rw

    trust_title: 'Kuki wahaha natwe', // verified-rw
    trust_subtitle: 'Amakuru asobanutse ku kugeza ibicuruzwa, kwishyura, kubisubiza n’ubucuruzi bwacu.', // verified-rw
    trust_note: 'Twerekana gusa amakuru y’ubucuruzi yemejwe na politiki z’iduka ziriho ubu.', // verified-rw
    trust_kigali_delivery: '1,000 RWF · Kubigeza uwo munsi aho bishoboka iyo watumije mbere y’isaha yatangajwe.', // verified-rw
    trust_district_delivery: 'Tugeza ibicuruzwa mu turere 30 twose. Ikiguzi nyacyo kigaragara mu gihe cyo kwishyura.', // verified-rw
    trust_returns: 'Gusubiza mu minsi {days} ku bicuruzwa byujuje ibisabwa kandi bidafunguye.', // verified-rw
    trust_payment_providers: 'MTN MoMo · Airtel Money · Visa · Mastercard', // verified-rw
    trust_authentic_detail: 'Aho ibicuruzwa byavuye n’amakuru y’ibirango bigaragara ku rupapuro rw’igicuruzwa.', // verified-rw
    trust_registered_business: 'Ubucuruzi bwanditswe', // verified-rw
    trust_rdb_number: 'RDB: {number}', // verified-rw
    trust_location: 'Aho ubucuruzi bukorera', // verified-rw
    trust_location_detail: '{sector}, {district}, Kigali', // verified-rw
    trust_support_hours: 'Ubufasha kuri WhatsApp: {hours}', // verified-rw

    section_reviews: 'Ibitekerezo by’abakiriya', // verified-rw
    verified_reviews_count: 'Ubuguzi {count} bwemejwe', // verified-rw

    whatsapp_title: 'Ukeneye ubufasha?', // verified-rw
    whatsapp_subtitle: 'Ohereza ubutumwa kuri WhatsApp kugira ngo abagufasha bagufashe.', // verified-rw
    whatsapp_hours: 'Amasaha y’ubufasha: {hours}', // verified-rw
    quiz_title: 'Shakisha gahunda mu bicuruzwa biriho ubu', // verified-rw
    quiz_subtitle: 'Subiza ibibazo bitandatu urebe ibicuruzwa bihuye n’icyiciro, ikibazo, amafaranga n’ibyo ukunda.', // verified-rw
    quiz_cta: 'Tangira ibibazo', // verified-rw
    quiz_time: 'Ibibazo bitandatu · kugura si ngombwa', // verified-rw
  },
  categories: {
    all: 'Ibicuruzwa byose', skincare: 'Kwita ku ruhu', makeup: 'Ibikoresho byo kwisiga', haircare: 'Kwita ku musatsi', fragrance: 'Imibavu', body_care: 'Kwita ku mubiri', mens: "Ibikoresho by'abagabo", natural: 'Ibikomoka ku bidukikije', gifts: 'Impano', new_arrivals: 'Ibicuruzwa bishya', best_sellers: 'Ibicuruzwa bikunzwe cyane', on_sale: 'Ibyagabanyijwe', // 🔍 REVIEW // verified-rw
  },
  product: {
    wholesale_application_hint: 'Igiciro cyo kurangura gishobora kuboneka iyo cyashyizweho kuri iki gicuruzwa.', // verified-rw
    wholesale_terms_hint: 'Saba konti yo kurangura kugira ngo urebe ibiciro byashyizweho ku gicuruzwa n’ingano.', // verified-rw
    apply_wholesale: 'Saba konti yo kurangura', // verified-rw
    add_to_cart: 'Shyira mu gitebo', adding: 'Birimo gushyirwa...', added: 'Byashyizwemo!', buy_now: 'Gura nonaha', add_to_wishlist: 'Shyira mu byo wifuza', remove_from_wishlist: 'Kura mu byo wifuza', share: 'Sangiza abandi', share_whatsapp: 'Sangiza kuri WhatsApp', description: 'Ibisobanuro', ingredients: 'Ibigize igicuruzwa', how_to_use: 'Uko gikoreshwa', reviews: 'Ibitekerezo', delivery: 'Kugeza no gusubiza ibicuruzwa', related: 'Ibindi wakunda', also_bought: 'Abandi bakiriya baguze na byo', no_reviews: 'Nta gitekerezo kiratangwa. Ba uwa mbere!', write_review: 'Tanga igitekerezo', verified_purchase: 'Ubuguzi bwemejwe', helpful: 'Byamfashije', skin_type: "Ubwoko bw'uruhu", shade: 'Ibara', volume: 'Ingano', for_skin: 'Ku ruhu rwa {skinType}', out_of_stock_notify: 'Mumenyeshe nibigaruka', price_from: 'Guhera kuri {price} RWF', original_price: 'Igiciro cya mbere: {price} RWF', you_save: 'Uzigama {amount} RWF ({percent}%)', earn_points: 'Urahabwa amanota {points} ugura iki gicuruzwa', authentic_guarantee: '✅ Igicuruzwa cy’umwimerere 100%', delivery_estimate: 'Reba ikiguzi cyo kukugezaho', select_district: 'Hitamo akarere kawe', no_image: 'Nta shusho', view_product: 'Reba {product}', rating_label: 'Amanota {rating} kuri 5, ibitekerezo {count}', login_to_add: 'Injira kugira ngo ushyire ibicuruzwa mu gitebo', select_shade: 'Hitamo ibara', save_percent: 'Zigama {percent}%', complete_routine: 'Uzuza ibikoresho ukoresha', product_not_found: 'Igicuruzwa nticyabonetse', unavailable_hint: 'Igicuruzwa gishobora kuba cyimuwe cyangwa kitariho by’akanya.', browse_products: 'Reba ibicuruzwa', beauty: 'Ubwiza', about_product: 'Ibyerekeye {product}', key_ingredients: 'Iby’ingenzi bikigize', ingredients_missing: 'Ibigize iki gicuruzwa ntibirongerwamo.', loading_reviews: 'Ibitekerezo byemejwe birimo gufunguka...', based_on_reviews: 'Bishingiye ku bitekerezo {count} byemejwe', positive_experience: 'Igitekerezo cyiza kuri iki gicuruzwa.', reviews_count: 'Ibitekerezo {count}', verified_customer: 'Umukiriya wemejwe', verified: 'Byemejwe', no_approved_reviews: 'Nta bitekerezo byemejwe biraboneka.', first_review: 'Ba uwa mbere gutanga igitekerezo kuri iki gicuruzwa.', delivery_across_rwanda: 'Kugeza ibicuruzwa mu Rwanda hose', free_delivery_returns: 'Kubigezwaho ni ubuntu ku byujuje ibisabwa birengeje 50,000 RWF. Ibicuruzwa bidafunguye bishobora gusubizwa mu minsi 7.', delivery_estimator: 'Kubara ikiguzi cyo kukugezaho', available_districts: 'Biboneka mu turere 30 twose tw’u Rwanda', calculating_delivery: 'Ikiguzi cyo kukugezaho kirimo kubarwa...', delivery_fee_label: 'Amafaranga yo kukugezaho', estimated_time: 'Igihe biteganyijwe', decrease_quantity: 'Gabanya umubare', increase_quantity: 'Ongera umubare', size_label: 'Ingano', fast_delivery: 'Kubigeza vuba', payment_flexible: 'Ishyura uko wifuza', easy_returns: 'Gusubiza byoroshye', officially_rwanda: 'Biri mu Rwanda ku mugaragaro', local_business: 'Ubucuruzi bwo mu Rwanda bukorera i Kigali', authorized_distributors: 'Bivuye ku bacuruzi babyemerewe', zone: 'Agace', fee: 'Ikiguzi', time: 'Igihe', quantity_label: 'Umubare', unit_price: 'Igiciro cya kimwe', retail_price: 'Igiciro cyo kudandaza: {price}', wholesale_price: 'Igiciro cyawe cyo kurangura (nibura ibice {count})', price_updated: 'Igiciro cyahindutse', out_of_stock_update: 'Byashize mu bubiko', product_removed: 'Igicuruzwa ntikikiboneka', product_removed_hint: 'Iki gicuruzwa cyakuwe ku rubuga.', link_copied: 'Ihuza ryakoporowe!', instagram_copy_hint: 'Rishyire mu nkuru ya Instagram cyangwa mu butumwa bwihariye.', share_anywhere: 'Risangize aho ushaka.', delivery_times_short: 'Kigali iminsi 1–2, mu ntara iminsi 3–5', payment_methods_short: 'MTN MoMo cyangwa kwishyura ugejejweho', return_policy_short: 'Ibicuruzwa bidafunguye bisubizwa mu minsi 7', pay_mobile_short: 'Ishyura ako kanya ukoresheje Mobile Money', same_day: 'Uwo munsi', days_2_3: 'Iminsi 2–3', days_3_4: 'Iminsi 3–4', you_save_label: 'Ibyo uzigama', // 🔍 REVIEW // verified-rw

    hover_zoom: 'Shyiraho akambi ubone ishusho nini', // verified-rw
    image_number: '{product} — ishusho {number}', // verified-rw
    next_image: 'Ishusho ikurikira', // verified-rw
    no_image_available: 'Nta shusho y’igicuruzwa iboneka', // verified-rw
    previous_image: 'Ishusho ibanza', // verified-rw
    show_image: 'Erekana ishusho {number}', // verified-rw

    image_type_product: 'Igicuruzwa', // verified-rw
    image_type_packaging: 'Igipfunyika', // verified-rw
    image_type_back_label: 'Aho ibigize byanditse', // verified-rw
    image_type_seal: 'Ikimenyetso cy’umwimerere', // verified-rw
    image_type_texture: 'Uko giteye', // verified-rw
    image_type_size_scale: 'Ikigereranyo cy’ingano', // verified-rw
    image_type_shade: 'Ibara', // verified-rw
    image_type_lifestyle: 'Uko gikoreshwa', // verified-rw
    image_type_video: 'Videwo', // verified-rw
    play_video: 'Fungura videwo y’igicuruzwa', // verified-rw
    video: 'Videwo', // verified-rw
    photos_count: 'Amafoto {count}', // verified-rw

    product_information: 'Amakuru y’igicuruzwa', // verified-rw
    expected_results: 'Ibyitezwe ku gicuruzwa', // verified-rw
    authenticity: 'Umwimerere w’igicuruzwa', // verified-rw
    country_of_origin: 'Igihugu cyakorewemo', // verified-rw
    imported_by: 'Cyatumijwe na', // verified-rw
    hair_type: 'Ubwoko bw’umusatsi', // verified-rw
    fragrance_notes: 'Impumuro zirimo', // verified-rw
    fragrance_top: 'Impumuro ibanza', // verified-rw
    fragrance_middle: 'Impumuro yo hagati', // verified-rw
    fragrance_base: 'Impumuro isoza', // verified-rw
    warnings: 'Imiburo', // verified-rw
    allergens: 'Ibishobora gutera allergie', // verified-rw
    period_after_opening: 'Nyuma yo gufungura', // verified-rw
    use_within: 'Koresha mu mezi {months} nyuma yo gufungura.', // verified-rw
    ingredients_inci_note: 'Buri gihe genzura urutonde rw’ibigize ruri ku gipfunyika, kuko uwagikoze ashobora guhindura ibigize.', // verified-rw
    results_timeframe: 'Igihe gisanzwe cyatanzwe', // verified-rw
    results_disclaimer: 'Icyitonderwa ku byitezwe', // verified-rw
    results_disclaimer_text: 'Ibyo igicuruzwa kimarira umuntu biratandukana bitewe n’umuntu, gahunda n’uko gikoreshwa. Aya makuru si inama y’ubuvuzi kandi ntabwo yizeza igisubizo runaka.', // verified-rw
    authenticity_verified: 'Umwimerere w’iki gicuruzwa waremejwe', // verified-rw
    authenticity_not_verified: 'Nta cyemezo cy’umwimerere cyanditswe', // verified-rw
    authenticity_not_verified_detail: 'Ntabwo twerekana ko igicuruzwa cyemejwe nk’umwimerere kugeza amakuru yo kubyemeza yanditswe kuri iki gicuruzwa.', // verified-rw
    reviews_unavailable: 'Ibitekerezo ntibiboneka by’akanya.', // verified-rw
    delivery_exact_fee: 'Hitamo akarere kawe urebe ikiguzi cyo kukugezaho n’igihe giteganyijwe. Ikiguzi cya nyuma cyemezwa mu gihe cyo kwishyura.', // verified-rw
  },
  search: {
    placeholder: 'Shakisha ibita ku ruhu, ibikoresho byo kwisiga, ibita ku musatsi...', results: 'Ibisubizo {count} kuri "{query}"', no_results: 'Nta bicuruzwa byabonetse kuri "{query}"', no_results_hint: 'Gerageza andi magambo cyangwa urebe mu byiciro', suggestions: 'Ibyifuzo', popular: 'Ibikunze gushakishwa', local_terms: 'Amagambo akoreshwa mu Rwanda', price_searches: 'Shakisha ukurikije igiciro', recent: 'Ibyashakishijwe vuba', clear_recent: 'Siba ibyashakishijwe vuba', price_under: 'Munsi ya {price} RWF', price_range: 'Hagati ya {min} na {max} RWF', searching: 'Birimo gushakishwa...', search_in: 'Shakisha muri {category}', filters_active: 'Inshungura {count} zirakoreshwa', filters: 'Inshungura', reset: 'Subiza ku ntangiriro', category: 'Icyiciro', brand: 'Ikirango', all_brands: 'Ibirango byose', price_range_label: 'Urwego rw’ibiciro (RWF)', minimum: 'Igiciro gito', maximum: 'Igiciro kinini', skin_type: 'Ubwoko bw’uruhu', customer_rating: 'Amanota y’abakiriya', and_up: '{rating} no hejuru', in_stock_only: 'Ibirahari gusa', products_load_failed_hint: 'Reba umurongo wa interineti wongere ugerageze.', no_filter_results: 'Nta bicuruzwa bihuye n’inshungura', broaden_search: 'Gerageza gukuraho inshungura cyangwa ukoreshe amagambo rusange.', wishlist_failed: 'Guhindura ibyo wifuza ntibyakunze', removed_wishlist: 'Cyakuwe mu byo wifuza', saved_wishlist: 'Cyabitswe mu byo wifuza', // 🔍 REVIEW // verified-rw

    adjust_filters_hint: 'Gerageza guhindura inshungura cyangwa amagambo yo gushakisha. Reba icyiciro cyangwa ukureho zimwe mu nshungura.', // verified-rw
    all_categories: 'Ibyiciro byose', // verified-rw
    all_ratings: 'Amanota yose', // verified-rw
    catalog: 'Urutonde rw’ibicuruzwa', // verified-rw
    clear_all_filters: 'Siba inshungura zose', // verified-rw
    clear_search: 'Siba ibishakishwa', // verified-rw
    filter_brand: 'Ikirango: {brand}', // verified-rw
    filter_by_price: 'Shungura ukurikije igiciro', // verified-rw
    filter_category: 'Icyiciro: {category}', // verified-rw
    filter_search: 'Ishakisha: “{query}”', // verified-rw
    filter_skin: 'Uruhu: {skin}', // verified-rw
    for_query: 'kuri', // verified-rw
    grid_view: 'Erekana mu dusanduku', // verified-rw
    list_view: 'Erekana ku rutonde', // verified-rw
    loading_products: 'Ibicuruzwa birimo gufunguka...', // verified-rw
    load_more_products: 'Fungura ibindi bicuruzwa', // verified-rw
    loading_more_products: 'Ibindi bicuruzwa birimo gufunguka…', // verified-rw
    showing_products: 'Hagaragara ibicuruzwa {shown} kuri {total}', // verified-rw
    minimum_rating: 'Amanota make', // verified-rw
    products_found: 'Habonetse ibicuruzwa {count}', // verified-rw
    recently_viewed: 'Ibyo uheruka kureba', // verified-rw
    remove_filter: 'Kuraho inshungura: {filter}', // verified-rw
    sort_best_selling: 'Ibigurishwa cyane', // verified-rw
    sort_relevance: 'Ibihuye cyane n’ibishakishwa', // verified-rw
    sort_rating: 'Ibyahawe amanota meza', // verified-rw
    sort_popular: 'Ibigurishwa cyane', // verified-rw
    sort_by: 'Tondeka ukurikije', // verified-rw
    sort_newest: 'Ibishya mbere', // verified-rw
    sort_price_high: 'Igiciro: kinini kugera ku gito', // verified-rw
    sort_price_low: 'Igiciro: gito kugera ku kinini', // verified-rw
    sort_top_rated: 'Ibyahawe amanota menshi', // verified-rw
    stars_up: 'Amanota {rating} no hejuru', // verified-rw
    view_all_results: 'Reba ibisubizo byose kuri “{query}”', // verified-rw
    price_under_5000: 'Munsi ya 5,000 RWF', // verified-rw
    price_5000_10000: 'Hagati ya 5,000 na 10,000 RWF', // verified-rw
    price_10000_15000: 'Hagati ya 10,000 na 15,000 RWF', // verified-rw
    price_over_15000: 'Hejuru ya 15,000 RWF', // verified-rw
    zero_results_title: 'Ibyashakishijwe ntibiboneke', // verified-rw
    zero_results_badge: 'Ibicuruzwa bibura · iminsi 30 ishize', // verified-rw
    zero_results_description: 'Amagambo nyayo abakiriya bashakishije ntibabone ibicuruzwa. Banza uyagenzure mbere yo kwemeza ibicuruzwa bashobora kuba bakeneye.', // verified-rw
    zero_results_empty: 'Nta byashakishijwe ntibiboneke byanditswe mu minsi 30 ishize.', // verified-rw
    zero_results_count: 'Byashakishijwe inshuro {count}', // verified-rw
    zero_results_terms: 'Amagambo {count} yashakishijwe', // verified-rw
    zero_results_load_failed: 'Amakuru y’ibyashakishijwe ntibiboneke ntiyashoboye gufunguka.', // verified-rw
  },
  cart: {
    title: 'Igitebo cyanjye', empty: 'Igitebo cyawe kirimo ubusa', empty_hint: 'Shyiramo ibicuruzwa kugira ngo utangire!', browse_products: 'Reba ibicuruzwa', items: 'Ibicuruzwa {count}', subtotal: 'Igiteranyo mbere y’ibindi', delivery: 'Kukugezaho', delivery_free: 'UBUNTU', delivery_calculated: 'Kibarwa mu gihe cyo kwishyura', discount: 'Igabanyirizwa', total: 'Igiteranyo cyose', coupon: 'Kode y’igabanyirizwa', coupon_placeholder: 'Andika kode y’igabanyirizwa', apply_coupon: 'Koresha', remove_coupon: 'Kuraho', coupon_applied: 'Kode yakoreshejwe! Uzigama {amount} RWF', coupon_invalid: 'Kode y’igabanyirizwa ntiyemewe', coupon_expired: 'Iyi kode yararengeje igihe', continue_shopping: 'Komeza guhaha', checkout: 'Komeza wishyure', save_for_later: 'Bika uzagure nyuma', remove: 'Kuraho', update: 'Hindura', quantity: 'Umubare', free_delivery_hint: 'Ongeraho ibicuruzwa bya {amount} RWF ubone kubigezwaho ku buntu!', free_delivery_achieved: '🎉 Urabigezwaho ku buntu!', loyalty_redeem: 'Koresha amanota {points} ugabanyirizwe {value} RWF', wholesale_minimum: 'Amafaranga make yo kurangura ni {amount} RWF. Ongeraho {remaining} RWF.', savings: 'Uzigama {amount} RWF yose hamwe!', // 🔍 REVIEW
    coupon_apply_failed: 'Kode y’igabanyirizwa ntiyashoboye gukoreshwa', // verified-rw
    empty_discover: 'Reba ibita ku ruhu, ibikoresho byo kwisiga n’ibita ku musatsi by’umwimerere byahitiwemo abakiriya bo mu Rwanda.', // verified-rw
    your_selection: 'Ibyo wahisemo', // verified-rw
    shopping_cart: 'Igitebo cy’ibyo ugura', // verified-rw
    remove_product: 'Kuraho {product}', // verified-rw
    price_each: '{price} kuri kimwe', // verified-rw
    code_applied: 'Kode {code} yakoreshejwe', // verified-rw
    you_save_amount: 'Uzigama {amount}', // verified-rw
    coupon_example: 'Andika {code}', // verified-rw
    applying: 'Birimo gukoreshwa…', // verified-rw
    use_code_prefix: 'Koresha', // verified-rw
    for_percent_off: 'ugabanyirizwe {percent}%.', // verified-rw
    kigali_delivery_notice: 'Ikiguzi kigaragara ni icyo muri Kigali; ikiguzi nyacyo cy’akarere kawe kibarwa mu gihe cyo kwishyura.', // verified-rw
    secure: 'Bitekanye', // verified-rw
    your_cart: 'Igitebo cyawe', // verified-rw
    currently_empty: 'Igitebo cyawe kirimo ubusa.', // verified-rw
    drawer_summary: 'Ibicuruzwa {count} · {subtotal}', // verified-rw
    realtime_removed: '“{product}” yakuwe mu gitebo cyawe kuko itakiboneka.', // verified-rw
    price_now: 'Igiciro cya “{product}” ubu ni {price}', // verified-rw
    delivery_fee_checkout: 'Ikiguzi cyo kukugezaho kibarwa mu gihe cyo kwishyura.', // verified-rw
    view_cart: 'Reba igitebo', // verified-rw
    removed_from_cart: 'Cyakuwe mu gitebo', // verified-rw
    undo: 'Subizamo', // verified-rw
    invalid_coupon: 'Kode ntiyemewe', // verified-rw
    coupon_applied_title: 'Kode yakoreshejwe!', // verified-rw
    coupon_validation_failed: 'Kugenzura kode ntibyashobotse', // verified-rw
    share_message: '🛍️ Igitebo cyanjye kuri FreedomCosmeticShop:\n\n{items}\n\nIgiteranyo: {subtotal}\n\nHaha kuri FreedomCosmeticShop! 🌸', // verified-rw
    empty_friendly_hint: 'Nta bicuruzwa urashyira mu gitebo. Tangira guhaha!', // verified-rw
    start_shopping: 'Tangira guhaha', // verified-rw
    items_in_cart: 'Ibicuruzwa {count} mu gitebo cyawe', // verified-rw
    saved_count: 'Ibicuruzwa {count} byabitswe uzagure nyuma', // verified-rw
    save_product_later: 'Bika {product} uzagure nyuma', // verified-rw
    empty_or_restore: 'Igitebo kirimo ubusa — shyiramo ibicuruzwa cyangwa usubizemo ibyo wabitse.', // verified-rw
    share_whatsapp: 'Sangiza igitebo kuri WhatsApp', // verified-rw
    clear_confirm: 'Urashaka gukura ibicuruzwa byose mu gitebo?', // verified-rw
    cleared: 'Igitebo cyasibiwe', // verified-rw
    clear_cart: 'Siba ibiri mu gitebo', // verified-rw
    saved_for_later_count: 'Ibyabitswe ngo bizagurwe nyuma ({count})', // verified-rw
    move_to_cart: 'Subiza mu gitebo', // verified-rw
    remove_from_saved: 'Kura mu byabitswe', // verified-rw
    free_shipping: 'Kubigezwaho ni ubuntu!', // verified-rw
    coupon_removed: 'Kode yakuweho', // verified-rw
    coupon_suggestions: 'Gerageza: WELCOME10 (igabanya 10%) cyangwa WEEKEND15 (igabanya 15%)', // verified-rw
    loyalty_points: 'Amanota y’indahemuka', // verified-rw
    points_balance: 'Ufite amanota {points} (inota 1 = RWF 1)', // verified-rw
    points_redeem_placeholder: 'Amanota ushaka gukoresha', // verified-rw
    amount_applied: 'Hagabanyijwe {amount}', // verified-rw
    delivery_province_estimate: 'Intara yo kukugezaho (ikigereranyo)', // verified-rw
    coupon_discount: 'Igabanyirizwa rya kode', // verified-rw
    undo_remove: '{name} yakuwe mu gitebo', stock_available: 'Mu bubiko harimo {count}', max_reached: 'Wageze ku mubare wose uboneka', saved_for_later: 'Ibyabitswe uzagure nyuma ({count})', delivery_estimate: 'Ikigereranyo cyo kukugezaho', coupon_terms_title: 'Amabwiriza ya kode', coupon_will_save: 'Uzigama {amount}', coupon_cannot_apply: 'Ntishobora gukoreshwa — ongeraho {amount}', // verified-rw
    complete_routine: 'Uzuza gahunda yawe', // verified-rw
    same_category_suggestions: 'Ibicuruzwa biri mu bubiko byo mu byiciro bimwe n’ibiri mu gitebo cyawe.', // verified-rw
    coupon_minimum: 'Komande ntoya: {amount}', // verified-rw
    coupon_maximum: 'Igabanyirizwa ntarengwa: {amount}', // verified-rw
    coupon_expires: 'Izarangira ku wa: {date}', // verified-rw
    coupon_uses_remaining: 'Hasigaye kuyikoresha inshuro {count} zose hamwe', // verified-rw
    coupon_per_customer: 'Buri mukiriya ayikoresha kugeza ku nshuro {count}', // verified-rw
    coupon_selected_only: 'Ikoreshwa gusa ku bicuruzwa cyangwa ibyiciro byatoranyijwe', // verified-rw
    coupon_free_delivery: 'Kubigezwaho ku buntu', // verified-rw
    coupon_percent_off: 'Igabanyirizwa rya {value}% ku bicuruzwa byujuje ibisabwa', // verified-rw
    coupon_fixed_off: 'Igabanyirizwa rya {amount} ku bicuruzwa byujuje ibisabwa', // verified-rw
    coupon_not_started: 'Iyi kode ntiratangira gukoreshwa', // verified-rw
    coupon_usage_reached: 'Inshuro iyi kode yemerewe gukoreshwa zarangiye', // verified-rw
    coupon_no_eligible_items: 'Nta gicuruzwa kiri mu gitebo cyujuje ibisabwa n’iyi kode', // verified-rw
    coupon_empty_cart: 'Banza ushyire mu gitebo igicuruzwa cyujuje ibisabwa', // verified-rw
  },
  confirmation: {
    title: 'Komande yemejwe', // verified-rw
    thank_you: 'Murakoze, {name}. Komande yawe yakiriwe.', // verified-rw
    received: 'Komande yawe yakiriwe.', // verified-rw
    order_number_label: 'Nimero ya komande', // verified-rw
    payment_title: 'Amakuru yo kwishyura', // verified-rw
    payment_method: 'Uburyo', // verified-rw
    payment_status: 'Imiterere yo kwishyura', // verified-rw
    paid: 'Yishyuwe', // verified-rw
    pending: 'Hategerejwe icyemezo cy’utanga serivisi', // verified-rw
    pay_on_delivery: 'Kwishyura ugejejweho', // verified-rw
    delivery_title: 'Igihe cyo kukugezaho', // verified-rw
    expected_delivery: 'Igihe biteganyijwe kugerera', // verified-rw
    estimate_pending: 'Igihe cyo kukugezaho kirimo gutegurwa', // verified-rw
    delivery_fee_label: 'Ikiguzi cyo kukugezaho: {amount}', // verified-rw
    delivery_to: 'Aho ibicuruzwa bigezwa', // verified-rw
    destination_pending: 'Aho ibicuruzwa bigezwa harimo gufunguka', // verified-rw
    landmark_value: 'Ikimenyetso cy’aho uri: {landmark}', // verified-rw
    updates_linked: 'Amakuru ya komande ahujwe na {phone}. Kubona SMS cyangwa imeyili biterwa na serivisi y’ubutumwa yashyizweho.', // verified-rw
    track_order: 'Kurikirana komande yanjye', // verified-rw
    share_whatsapp: 'Sangiza kuri WhatsApp', // verified-rw
    continue_shopping: 'Komeza guhaha', // verified-rw
    support_title: 'Ukeneye ubufasha?', // verified-rw
    support_hint: 'Koresha uburyo bwemejwe bwo kuvugana natwe buboneka cyangwa ufungure urupapuro rwo kutwandikira.', // verified-rw
    call_support: 'Hamagara abagufasha', // verified-rw
    contact_support: 'Vugana n’abagufasha', // verified-rw
    direct_contact_unavailable: 'Nimero yemejwe yo kuvugana n’abagufasha ntirashyirwaho. Koresha urupapuro rwo kutwandikira.', // verified-rw
    share_message: 'Komande {order} ya FreedomCosmeticShop\nIgiteranyo: {total}\nAho igezwa: {destination}\nIgihe giteganyijwe: {expected}', // verified-rw
    support_message: 'Muraho FreedomCosmeticShop. Nkeneye ubufasha kuri komande {order}.', // verified-rw
    confirming_payment: 'Turimo kwemeza ko wishyuye', // verified-rw
    keep_open: 'Reka uru rupapuro rufunguye mu gihe dutegereje igisubizo cy’utanga serivisi.', // verified-rw
    verification_attention: 'Kwemeza ubwishyu bikeneye kugenzurwa', // verified-rw
    verification_attention_hint: 'Banza ugenzure imiterere ya komande mbere yo kongera kwishyura.', // verified-rw
    payment_not_completed: 'Kwishyura ntikwarangiye', // verified-rw
    order_details_unavailable: 'Kwishyura byemejwe ariko amakuru ya komande ntiyashoboye gufunguka. Kurikirana komande cyangwa uvugane n’abagufasha.', // verified-rw
    email_payment_title: 'Kwishyura byemejwe', // verified-rw
    email_order_title: 'Komande yemejwe', // verified-rw
    email_intro: 'Muraho {name}, amakuru ya komande yawe ya FreedomCosmeticShop ari hasi.', // verified-rw
    sms_provider_accepted: 'Utanga serivisi ya SMS yakiriye ubutumwa bwo kwemeza bwoherezwa kuri {phone}.', // verified-rw
    sms_send_failed: 'SMS yo kwemeza ntiyashoboye koherezwa. Komande yawe irabitswe kandi ushobora kuyikurikirana hano.', // verified-rw
    email_provider_accepted: 'Utanga serivisi ya imeyili yakiriye ubutumwa bwo kwemeza bwoherezwa kuri {email}.', // verified-rw
    email_send_failed: 'Imeyili yo kwemeza ntiyashoboye koherezwa. Komande yawe irabitswe.', // verified-rw
    email_not_configured: 'Serivisi yo kwemeza kuri imeyili ntirashyirwaho ubu.', // verified-rw
    stock_review_notice: 'Twakiriye ubwishyu bwawe, ariko ububiko bugomba kugenzurwa. Tuzakuvugisha mbere yo kukugezaho.', // verified-rw
    notification_payment_title: 'Kwishyura byemejwe', // verified-rw
    notification_payment_body: 'Komande {order} yemejwe kandi irimo gutegurwa.', // verified-rw
    notification_stock_review: 'Twakiriye ubwishyu bwa komande {order}. Ububiko bugomba kugenzurwa kandi tuzakuvugisha mbere yo kukugezaho.', // verified-rw
    payment_review_notice: 'Twakiriye ubundi bwishyu bw’iyi komande. Ntukongere kwishyura; tuzabugenzura kandi tukuvugishe.', // verified-rw
    notification_payment_review: 'Twakiriye ubundi bwishyu bwa komande {order}. Ntukongere kwishyura; tuzabugenzura kandi tukuvugishe.', // verified-rw
  },
  checkout: {
    title: 'Kwishyura', step_address: 'Aho ibicuruzwa bigezwa', step_payment: 'Kwishyura', step_review: 'Kugenzura ibyo utumije', step_confirm: 'Kwemeza', full_name: 'Amazina yose', full_name_placeholder: 'Andika amazina yawe yose', phone: 'Nimero ya telefoni', phone_placeholder: '+250 7XX XXX XXX', phone_hint: 'Tuzajya twohereza amakuru y’ibyo watumije kuri iyi nimero', province: 'Intara', province_select: 'Hitamo intara', district: 'Akarere', district_select: 'Hitamo akarere', sector: 'Umurenge (si ngombwa)', sector_placeholder: 'Andika umurenge', landmark: 'Ikimenyetso cy’aho utuye / Umuhanda', landmark_placeholder: 'Andika ikimenyetso kiri hafi cyangwa umuhanda', landmark_hint: 'Fasha umumotari kubona aho uherereye', notes: 'Amabwiriza yo kukugezaho (si ngombwa)', notes_placeholder: 'Andika amabwiriza yo kukugezaho', save_address: 'Bika iyi aderesi uzayikoreshe ubutaha', saved_addresses: 'Aderesi zabitswe', use_saved: 'Koresha iyi aderesi', delivery_fee: 'Amafaranga yo kukugezaho', delivery_time: 'Igihe biteganyijwe kugerera', same_day: 'Uyu munsi mbere ya saa kumi n’ebyiri', free_delivery: 'Kubigezwaho ku buntu', payment_method: 'Wifuza kwishyura ute?', mtn_momo: 'MTN Mobile Money', mtn_popular: 'Ikoreshwa cyane mu Rwanda', airtel_money: 'Airtel Money', card_payment: 'Visa / Mastercard', cod: 'Kwishyura ugejejweho', cod_kigali_only: 'Muri Kigali gusa', credit: 'Inguzanyo yo kurangura', credit_available: 'Ufite {amount} RWF ushobora gukoresha', momo_title: 'Ishyura ukoresheje MTN Mobile Money', momo_enter_number: 'Andika nimero yawe ya MTN MoMo', momo_number_placeholder: '078 XXX XXXX', momo_hint: 'Igomba kuba nimero ya MTN itangira 078 cyangwa 079', momo_airtel_hint: 'Igomba kuba nimero ya Airtel itangira 073 cyangwa 072', momo_pay_button: 'Ishyura {amount} RWF ukoresheje MoMo', momo_waiting_title: 'Reba telefoni yawe!', momo_waiting_message: 'Twohereje ubusabe bwo kwishyura kuri {phone}. Fungura MTN MoMo wemeze {amount} RWF.', momo_waiting_hint: 'Dutegereje ko wishyura...', momo_timeout: 'Igihe cyo kwishyura cyarangiye. Ongera ugerageze.', momo_cancel: 'Hagarika kwishyura', momo_success: 'Kwishyura byemejwe! ✅', momo_failed: 'Kwishyura ntibyakunze. Ongera ugerageze.', momo_wrong_number: 'Andika nimero ya MTN yemewe itangira 078 cyangwa 079', momo_steps: ['Kanda ahanditse “Ishyura ukoresheje MoMo”', 'Reba ubusabe bwa MTN kuri telefoni yawe', 'Andika PIN yawe ya MTN wemeze', 'Ibyo watumije bihita byemezwa! 🎉'], order_summary: 'Incamake y’ibyo utumije', items_ordered: 'Ibicuruzwa watumije', place_order: 'Emeza ibyo utumije', agree_terms: 'Mu kwemeza ibyo utumije, wemeye', terms: 'Amabwiriza n’amategeko', order_confirmed: 'Ibyo watumije byemejwe! 🎉', order_number: 'Nimero y’ibyo watumije', thank_you: 'Murakoze {name}!', order_confirmed_message: 'Ibyo watumije byakiriwe neza. Tuzabigeza mu karere ka {district}, Kigali.', sms_sent: 'Ubutumwa bwa SMS bwoherejwe kuri {phone}', track_order: 'Kurikirana ibyo natumije', continue_shopping: 'Komeza guhaha', share_order: 'Sangiza kuri WhatsApp', download_app: 'Shyira porogaramu yacu kuri telefoni ugure vuba!', // 🔍 REVIEW

    account_abbreviation: 'Konti', // verified-rw
    add_before_checkout: 'Shyira ibicuruzwa mu gitebo mbere yo kwishyura.', // verified-rw
    additional_notes: 'Andi mabwiriza', // verified-rw
    address_directions_placeholder: 'Nimero y’inzu, umuhanda, umudugudu cyangwa ibisobanuro byumvikana', // verified-rw
    airtel_instant_prompt: 'Ishyura ako kanya ukoresheje Airtel — urabona ubusabe kuri telefoni.', // verified-rw
    airtel_number: 'Nimero ya Airtel Money', // verified-rw
    airtel_pay_prefixes: 'Ishyura ukoresheje nimero itangira 072 cyangwa 073', // verified-rw
    airtel_prefix_error: 'Nimero za Airtel zitangira 072 cyangwa 073', // verified-rw
    airtel_same_flow: 'Ishyura na Airtel — bikora kimwe na MTN', // verified-rw
    airtel_wrong_number: 'Andika nimero ya Airtel yemewe (072 cyangwa 073)', // verified-rw
    all_rwanda_covered: 'Tugeza mu Rwanda hose:', // verified-rw
    amount_on_delivery: 'Amafaranga yo kwishyura ugejejweho:', // verified-rw
    amount_received: 'Twakiriye {amount}', // verified-rw
    approve_network_payment: 'Reba telefoni yawe wemeze ubusabe bwa {network} kugira ngo urangize kwishyura {amount}.', // verified-rw
    approve_on_phone: 'Emeza kuri telefoni…', // verified-rw
    approve_prompt_phone: 'Emeza ubusabe bwa {network} kuri {phone}.', // verified-rw
    auto_timeout: 'Birahagarara mu gihe cya {time}', // verified-rw
    back_home: 'Subira ahabanza', // verified-rw
    back_to_cart: 'Subira mu gitebo', // verified-rw
    back_to_payment: 'Subira ku kwishyura', // verified-rw
    bank_transfer: 'Kohereza amafaranga kuri banki', // verified-rw
    bank_transfer_hint: 'Ohereza amafaranga kuri konti yacu ya banki. Ibyo watumije byoherezwa tumaze kwemeza ko wishyuye.', // verified-rw
    calculating: 'Birimo kubarwa…', // verified-rw
    call_on_arrival: 'Hamagara ugeze hafi', // verified-rw
    card_16_digits: 'Andika imibare 16 y’ikarita', // verified-rw
    card_number: 'Nimero y’ikarita', // verified-rw
    card_redirect_notice: 'Nyuma yo kwemeza komande, urakomereza ku rubuga rwa Flutterwave rutekanye. FreedomCosmeticShop ntibika amakuru y’ikarita yawe.', // verified-rw
    card_secure_3d: 'Kwishyura n’ikarita kuri Flutterwave mu buryo butekanye (3D Secure).', // verified-rw
    card_start_failed: 'Kwishyura n’ikarita ntibyashoboye gutangira', // verified-rw
    cell_example: 'urugero: Akabuye', // verified-rw
    cell_example_freedom: 'urugero: Freedom', // verified-rw
    cell_optional: 'Akagari (si ngombwa)', // verified-rw
    check_phone_approve: 'Reba telefoni yawe wemeze ubusabe.', // verified-rw
    checkout_failed: 'Kwishyura ntibyakunze', // verified-rw
    choose_how_pay: 'Hitamo uburyo ushaka kwishyura', // verified-rw
    choose_payment: 'Hitamo uburyo bwo kwishyura', // verified-rw
    cod_districts_only: 'Biboneka muri Gasabo, Kicukiro na Nyarugenge gusa', // verified-rw
    confirm_correct: 'Emeza ko amakuru yose ari yo.', // verified-rw
    confirmation_share_message: '✅ Komande {order} ya FreedomCosmeticShop\nIgiteranyo: {total}\nKugeza: {delivery}\nKwishyura: {payment}\nMurakoze! 🇷🇼', // verified-rw
    continue_payment: 'Komeza ku kwishyura', // verified-rw
    coupon_code: 'Kode ({code})', // verified-rw
    creating_order: 'Komande irimo gukorwa…', // verified-rw
    customer: 'Umukiriya', // verified-rw
    cvv_digits: 'CVV y’imibare 3', // verified-rw
    deliver_to: 'Bigezwe kuri', // verified-rw
    delivery_fees_updated: 'Ibiciro byo kugeza ibicuruzwa byahindutse', // verified-rw
    delivery_intro: 'Tubwire neza aho tugomba kukugeza ibicuruzwa byawe by’ubwiza.', // verified-rw
    delivery_to: 'Kubigeza {place}', // verified-rw
    delivery_to_area: 'Kubigeza {district}, {province}', // verified-rw
    delivery_zone_update: 'Agace {zone}: {fee} RWF (ubuntu hejuru ya {threshold} RWF)', // verified-rw
    district_coverage: 'Uturere 3 twa Kigali, 5 two mu Majyaruguru, 8 two mu Majyepfo, 7 two mu Burasirazuba na 7 two mu Burengerazuba.', // verified-rw
    elapsed: 'kimaze', // verified-rw
    elapsed_time: 'Igihe kimaze: {time}', // verified-rw
    email_optional: 'Imeyili (si ngombwa)', // verified-rw
    error_delivery_details: 'Andika amakuru asobanutse y’aho bigezwa', // verified-rw
    error_full_name: 'Andika amazina yawe yose', // verified-rw
    error_rwanda_phone: 'Koresha nimero ya telefoni yo mu Rwanda yemewe', // verified-rw
    error_select_district: 'Hitamo akarere', // verified-rw
    error_select_sector: 'Hitamo cyangwa wandike umurenge', // verified-rw
    estimated_delivery_label: 'Biteganyijwe kugera:', // verified-rw
    exact_amount_ready: 'Tegura amafaranga nyayo yo guha umumotari ukugejejeho.', // verified-rw
    expiry: 'Igihe ikarita izarangirira', // verified-rw
    expiry_format: 'Mu buryo bwa MM/YY', // verified-rw
    flutterwave_redirect: 'Urakomereza ku rupapuro rwa Flutterwave rwo kwishyura rutekanye.', // verified-rw
    flutterwave_secure: 'Kwishyura kuri Flutterwave mu buryo butekanye', // verified-rw
    full_name_example: 'urugero: Aline Uwase', // verified-rw
    full_name_example_mugisha: 'urugero: Aline Mugisha', // verified-rw
    full_name_sample: 'Amina Uwase', // verified-rw
    information_secure: 'Amakuru yawe arahishwe kandi aratekanye.', // verified-rw
    initiating_payment: 'Kwishyura birimo gutangira...', // verified-rw
    invalid_email: 'Imeyili ntiyemewe', // verified-rw
    items_count: 'Ibicuruzwa ({count})', // verified-rw
    items_label: 'Ibicuruzwa', // verified-rw
    landmark_example: 'Hafi y’ishuri, urusengero cyangwa ahantu hazwi', // verified-rw
    landmark_kbc_example: 'urugero: Hafi ya KBC', // verified-rw
    landmark_kct_example: 'Hafi y’inyubako ya KCT', // verified-rw
    landmark_optional: 'Ikimenyetso cy’aho uri (si ngombwa)', // verified-rw
    loyalty: 'Amanota y’indahemuka', // verified-rw
    mobile_money_start_failed: 'Kwishyura na Mobile Money ntibyashoboye gutangira', // verified-rw
    mtn_fastest: 'MTN MoMo ni bwo buryo bwihuse bwo kwemeza komande yawe.', // verified-rw
    mtn_fastest_popular: 'Bwihuse kandi bukoreshwa cyane mu Rwanda', // verified-rw
    mtn_instant_prompt: 'Ishyura ako kanya na MTN — ubone ubusabe kuri telefoni', // verified-rw
    mtn_instant_prompt_period: 'Ishyura ako kanya na MTN — ubone ubusabe kuri telefoni.', // verified-rw
    mtn_number: 'Nimero ya MTN MoMo', // verified-rw
    mtn_prefix_error: 'Nimero za MTN zitangira 078 cyangwa 079', // verified-rw
    name_required: 'Amazina arakenewe', // verified-rw
    notes_gate_example: 'urugero: Uhamagare ugeze ku muryango', // verified-rw
    order_cancelled: 'Komande yahagaritswe', // verified-rw
    order_confirmed_sms: 'Komande yemejwe · SMS yoherejwe kuri telefoni yawe', // verified-rw
    order_create_failed: 'Komande ntiyashoboye gukorwa', // verified-rw
    order_failed: 'Komande ntiyakunze', // verified-rw
    order_not_found: 'Komande ntiyabonetse', // verified-rw
    order_not_found_hint: 'Ntabwo twabonye iyi komande. Ishobora kuba yarakuweho.', // verified-rw
    order_placed_payment_failed: 'Komande yawe yakiriwe ariko kwishyura ntibyakunze. Ushobora kongera kugerageza ku rupapuro rwo kuyikurikirana.', // verified-rw
    order_share_message: '🛍️ Komande {order} ya FreedomCosmeticShop\n\n{items}\n\nIgiteranyo: {total}\nKwishyura: {payment}\nImiterere: {status}\n\nYikurikiranire kuri freedomcosmeticshop.rw 🌸', // verified-rw
    order_status: 'Imiterere ya komande', // verified-rw
    pay_airtel_amount: 'Ishyura {amount} na Airtel', // verified-rw
    pay_amount: 'Ishyura {amount}', // verified-rw
    pay_cash_arrival: 'Ishyura amafaranga ugejejweho', // verified-rw
    pay_cash_arrival_period: 'Ishyura amafaranga ugejejweho.', // verified-rw
    pay_momo_amount: 'Ishyura {amount} na MoMo', // verified-rw
    pay_rider_arrival: 'Ishyura umumotari akugejejeho', // verified-rw
    payment_confirmed_title: 'Kwishyura byemejwe!', // verified-rw
    payment_could_not_complete: 'Kwishyura ntibyashoboye kurangira. Ongera ugerageze.', // verified-rw
    payment_failed_title: 'Kwishyura ntibyakunze', // verified-rw
    payment_prompt_sent: 'Ubusabe bwo kwishyura bwoherejwe!', // verified-rw
    payment_secured_by: 'Kwishyura kwawe kurinzwe na', // verified-rw
    payment_successful: 'Kwishyura byakunze!', // verified-rw
    payment_timeout_hint: 'Ntabwo twabonye icyemezo cyo kwishyura. Ongera ugerageze.', // verified-rw
    payment_timeout_title: 'Igihe cyo kwishyura cyarangiye', // verified-rw
    phone_rwanda: 'Nimero ya telefoni (+250)', // verified-rw
    place_order_amount: 'Emeza komande · {amount}', // verified-rw
    place_order_failed: 'Kwemeza komande ntibyakunze', // verified-rw
    placing_order: 'Komande yawe irimo kwemezwa...', // verified-rw
    please_try_again: 'Ongera ugerageze.', // verified-rw
    questions_call: 'Niba ufite ikibazo, duhamagare kuri', // verified-rw
    receipt_whatsapp_suffix: 'kuri WhatsApp. Komande yawe yoherezwa tumaze kwemeza ko wishyuye.', // verified-rw
    received_contact_prefix: 'Twakiriye komande yawe kandi tuzaguhamagara kuri', // verified-rw
    received_phone_updates: 'Twakiriye komande yawe kandi tuzakumenyesha amakuru kuri telefoni.', // verified-rw
    remaining_time: 'Igihe gisigaye: {time}', // verified-rw
    review_order: 'Genzura komande', // verified-rw
    review_your_order: 'Genzura komande yawe', // verified-rw
    rwanda_payment_security: 'Kwishyura birahishwe kandi birinzwe n’abatanga serivisi zo kwishyura mu Rwanda', // verified-rw
    rwanda_phone_example: 'Andika nimero yo mu Rwanda yemewe (urugero: 0788123456)', // verified-rw
    save_address_button: 'Bika aderesi', // verified-rw
    save_address_future: 'Bika iyi aderesi uzayikoreshe ku zindi komande', // verified-rw
    sector_required: 'Umurenge', // verified-rw
    secure_rwanda_checkout: 'Kwishyura mu Rwanda mu buryo butekanye', // verified-rw
    select_district_first: 'Banza uhitemo akarere', // verified-rw
    select_district_for_fee: 'Hitamo akarere kawe urebe ikiguzi cyo kukugezaho', // verified-rw
    select_payment_method: 'Hitamo uburyo bwo kwishyura', // verified-rw
    select_province_first: 'Banza uhitemo intara', // verified-rw
    select_sector: 'Hitamo umurenge', // verified-rw
    send_receipt_prefix: 'Nyuma yo kohereza amafaranga, ohereza inyemezabwishyu kuri', // verified-rw
    sidebar_counts: 'Ibicuruzwa {items} · ibice {units}', // verified-rw
    sms_updates_next: 'Tuzohereza amakuru kuri SMS kuri {phone} igihe komande yemejwe, yoherejwe kandi igejejwe.', // verified-rw
    street_address: 'Aderesi y’umuhanda', // verified-rw
    street_delivery_details: 'Umuhanda / amakuru yo kukugezaho', // verified-rw
    street_placeholder: 'Nimero y’inzu, izina ry’umuhanda, inzu ubamo...', // verified-rw
    street_required: 'Aderesi y’umuhanda irakenewe', // verified-rw
    summary_counts: 'Ibice {units} mu bicuruzwa {products}', // verified-rw
    thank_you_order: 'Murakoze gutumiza!', // verified-rw
    to_confirm: 'kugira ngo tuyemeze.', // verified-rw
    units_count: 'Ibice {count}', // verified-rw
    use_registered_mtn: 'Koresha nimero yanditse kuri MTN Mobile Money', // verified-rw
    ussd_prompt_hint: 'Urabona ubusabe bwa USSD kuri telefoni kugira ngo wemeze kwishyura.', // verified-rw
    valid_network_number: 'Andika nimero ya {network} yemewe.', // verified-rw
    valid_phone: 'Andika nimero ya telefoni yemewe', // verified-rw
    view_my_order: 'Reba komande yanjye', // verified-rw
    waiting_approval: 'Dutegereje ko wemeza kwishyura', // verified-rw
    waiting_approval_dots: 'Dutegereje ko wemeza kwishyura...', // verified-rw
    waiting_payment: 'Dutegereje ko wishyura...', // verified-rw
    what_next: 'Ni iki gikurikiraho?', // verified-rw
    where_deliver: 'Komande yawe tuyigeze he?', // verified-rw

    pin_private: 'PIN yawe uyandika kuri telefoni yawe gusa. Ntabwo tuyibona.', // verified-rw
    cell_required: 'Akagari', // verified-rw
    village_required: 'Umudugudu', // verified-rw
    select_cell: 'Hitamo akagari', // verified-rw
    select_sector_first: 'Banza uhitemo umurenge', // verified-rw
    select_village: 'Hitamo umudugudu', // verified-rw
    select_cell_first: 'Banza uhitemo akagari', // verified-rw
    error_select_province: 'Hitamo intara', // verified-rw
    error_select_cell: 'Hitamo akagari', // verified-rw
    error_select_village: 'Hitamo umudugudu', // verified-rw
    phone_format_hint: 'Nimero yo mu Rwanda ihita yandikwa itangijwe na +250.', // verified-rw
    use_saved_count: 'Koresha aderesi yabitswe ({count})', // verified-rw
    address_home_label: 'Mu rugo', // verified-rw
    address_saved: 'Aderesi yabitswe', // verified-rw
    whatsapp_location: 'Sangiza aho ibicuruzwa bigezwa kuri WhatsApp', // verified-rw
    whatsapp_location_message: 'Aho FreedomCosmeticShop igeza ibicuruzwa:\nAmazina: {name}\nIntara: {province}\nAkarere: {district}\nUmurenge: {sector}\nAkagari: {cell}\nUmudugudu: {village}\nIkimenyetso cy’aho uri: {landmark}', // verified-rw
    cod_kigali_warning: 'Kwishyura ugejejweho biboneka muri Kigali gusa.', // verified-rw
    cod_kigali_warning_detail: 'Aderesi wahisemo iri hanze ya Kigali. Hitamo MTN MoMo, Airtel Money cyangwa ikarita.', // verified-rw
    kigali_only: 'Muri Kigali gusa', // verified-rw
    cod_exact_amount: 'Uzishyura umumotari {amount}. Tegura amafaranga nyayo.', // verified-rw
    secure_amount: 'Kwishyura na Mobile Money bitekanye · {amount}', // verified-rw
    recommended: 'Ni byo tugusaba', // verified-rw
    network_phone: 'Nimero ya {network} Mobile Money', // verified-rw
    mtn_prefix_hint: 'Koresha nimero ya MTN Rwanda itangira 078 cyangwa 079.', // verified-rw
    airtel_prefix_hint: 'Koresha nimero ya Airtel Rwanda itangira 072 cyangwa 073.', // verified-rw
    invalid_network_phone: 'Andika nimero ya {network} yo mu Rwanda yemewe.', // verified-rw
    amount_to_approve: 'Amafaranga nyayo yo kwemeza', // verified-rw
    charging_phone: 'Telefoni iri bwishyure', // verified-rw
    change_phone: 'Hindura nimero ya telefoni', // verified-rw
    merchant: 'Ugurishije', // verified-rw
    pin_on_phone: 'Andika PIN kuri telefoni yawe gusa', // verified-rw
    pin_warning: 'FreedomCosmeticShop ntizigera igusaba PIN ya Mobile Money. Emeza ubusabe bw’utanga serivisi kandi wandike PIN kuri telefoni yawe bwite gusa.', // verified-rw
    payment_timeout_safe_help: 'Ntabwo twabonye icyemezo mu gihe cyari giteganyijwe. Banza ugenzure amafaranga ya Mobile Money n’imiterere ya komande mbere yo kongera kugerageza, kuko uwatanze serivisi ashobora kuba akiri gutunganya ubwishyu.', // verified-rw
    payment_failed_recovery: 'Kwishyura ntikwemejwe. Genzura nimero ya telefoni n’amafaranga ahari, wongere ugerageze cyangwa uhitemo ubundi buryo.', // verified-rw
    retry_payment: 'Ongera ugerageze kwishyura', // verified-rw
    get_whatsapp_help: 'Saba ubufasha kuri WhatsApp', // verified-rw
    payment_help_message: 'Muraho FreedomCosmeticShop. Nkeneye ubufasha ku kwishyura komande.', // verified-rw
    check_phone_title: 'Reba telefoni yawe', // verified-rw
    prompt_sent_to: 'Ubusabe bwo kwishyura bwa {network} bwoherejwe kuri {phone}.', // verified-rw
    waiting_with_time: 'Dutegereje icyemezo cy’utanga serivisi · hasigaye {time}', // verified-rw
    cancel_waiting: 'Hagarika gutegereza usubire ku buryo bwo kwishyura', // verified-rw
    stock_changed_before_payment: 'Ububiko bwahindutse mbere yo kwishyura. Kwishyura ntikwatangiye. Subira mu gitebo ugenzure umubare w’ibicuruzwa bikiboneka.', // verified-rw
  },
  auth: {
    login_title: 'Murakaza neza', login_subtitle: 'Injira muri konti yawe ya FreedomCosmeticShop', phone_or_email: 'Nimero ya telefoni cyangwa imeyili', phone_placeholder: '+250 7XX XXX XXX', password: 'Ijambo ry’ibanga', show_password: 'Erekana', hide_password: 'Hisha', forgot_password: 'Wibagiwe ijambo ry’ibanga?', login_button: 'Injira', logging_in: 'Birimo kwinjira...', no_account: 'Nta konti ufite?', register_link: 'Iyandikishe hano', register_title: 'Fungura konti', register_subtitle: 'Injira muri FreedomCosmeticShop uyu munsi', full_name: 'Amazina yose', full_name_placeholder: 'Andika amazina yawe yose', email: 'Imeyili (si ngombwa)', email_placeholder: 'Andika imeyili yawe', phone: 'Nimero ya telefoni', phone_hint: 'Nimero yo mu Rwanda (+250 cyangwa 07X)', password_hint: 'Nibura inyuguti 8', confirm_password: 'Emeza ijambo ry’ibanga', skin_type: "Ubwoko bw’uruhu rwawe (si ngombwa)", skin_type_hint: 'Bidufasha kukugira inama y’ibicuruzwa bikubereye', terms_agree: 'Nemeye', terms_link: 'Amabwiriza n’amategeko', register_button: 'Fungura konti', registering: 'Konti irimo gufungurwa...', have_account: 'Usanzwe ufite konti?', login_link: 'Injira hano', otp_title: 'Emeza nimero yawe', otp_subtitle: 'Twohereje kode y’imibare 6 kuri {phone}', otp_placeholder: '000000', otp_verify: 'Emeza kode', otp_verifying: 'Birimo kwemezwa...', otp_resend: 'Ongera wohereze kode', otp_resend_in: 'Ongera wohereze mu masegonda {seconds}', otp_wrong_number: 'Nimero si yo?', otp_change: 'Hindura nimero', otp_hint: 'Reba ubutumwa bwa SMS', otp_expired: 'Kode yararengeje igihe. Saba indi kode.', otp_invalid: 'Kode ntiyemewe. Yigenzure wongere ugerageze.', otp_success: 'Nimero yemejwe neza!', forgot_title: 'Hindura ijambo ry’ibanga', forgot_subtitle: 'Andika nimero ya telefoni kugira ngo urihindure', forgot_send: 'Ohereza kode yo kurihindura', forgot_sending: 'Birimo koherezwa...', forgot_sent: 'Kode yoherejwe kuri {phone}', new_password: 'Ijambo ry’ibanga rishya', reset_password: 'Hindura ijambo ry’ibanga', reset_success: 'Ijambo ry’ibanga ryahinduwe neza!', invalid_credentials: 'Nimero ya telefoni, imeyili cyangwa ijambo ry’ibanga si byo', account_locked: 'Konti yafunzwe iminota {minutes} kubera kugerageza kenshi.', account_inactive: 'Konti yawe yahagaritswe.', phone_taken: 'Iyi nimero ya telefoni isanzwe ikoreshwa.', email_taken: 'Iyi imeyili isanzwe ikoreshwa.', passwords_no_match: 'Amagambo y’ibanga ntabwo ahura.', weak_password: 'Ijambo ry’ibanga rigomba kugira nibura inyuguti 8.', invalid_phone: 'Andika nimero ya telefoni yo mu Rwanda yemewe.', required_field: 'Aha harasabwa.', server_error: 'Habaye ikibazo. Ongera ugerageze.', // 🔍 REVIEW

    accept_terms_privacy: 'Emera amabwiriza na politiki y’amakuru bwite kugira ngo ukomeze', // verified-rw
    account_created: 'Konti yawe yafunguwe.', // verified-rw
    account_reactivated: 'Konti yongeye gufungurwa', // verified-rw
    account_reactivated_hint: 'Konti yawe yongeye gufungurwa. Murakaza neza!', // verified-rw
    account_suspended: 'Konti yahagaritswe', // verified-rw
    account_suspended_hint: 'Konti yawe yahagaritswe. Vugana n’abagufasha.', // verified-rw
    already_registered: 'Usanzwe wiyandikishije?', // verified-rw
    authenticator_backup_code: 'Kode ya porogaramu y’umutekano cyangwa kode y’ingoboka', // verified-rw
    back_password_login: 'Subira kwinjira ukoresheje ijambo ry’ibanga', // verified-rw
    back_to_login: 'Subira aho binjirira', // verified-rw
    beauty_unites: 'FreedomCosmeticShop — ubwiza buduhuza', // verified-rw
    benefit_authentic: 'Ibicuruzwa by’umwimerere 100%', // verified-rw
    benefit_delivery: 'Kubigeza mu turere 30 twose', // verified-rw
    benefit_momo: 'Kwishyura na MTN MoMo', // verified-rw
    benefit_secure: 'Konti y’umukiriya itekanye', // verified-rw
    change_phone: 'Hindura nimero', // verified-rw
    check_application: 'Reba aho ubusabe bwawe bugeze', // verified-rw
    check_phone: 'Reba telefoni yawe.', // verified-rw
    code_expires_return: 'Kode irarangira vuba. Subira ku ifishi usabe indi.', // verified-rw
    code_resent: 'Kode yongeye koherezwa', // verified-rw
    code_send_failed: 'Kode ntiyashoboye koherezwa', // verified-rw
    code_sent: 'Kode yoherejwe', // verified-rw
    code_sent_to: 'Kode yoherejwe kuri', // verified-rw
    complete_six_digit_otp: 'Andika kode ya OTP y’imibare itandatu yose', // verified-rw
    confirm_new_password: 'Emeza ijambo ry’ibanga rishya', // verified-rw
    delivery_all_districts: 'no kubigeza mu turere 30 twose', // verified-rw
    dev_mode_sms_disabled: 'Uburyo bw’igerageza (SMS ntikora)', // verified-rw
    development_otp: 'OTP y’igerageza', // verified-rw
    didnt_receive_code: 'Nta kode wabonye?', // verified-rw
    digit_of_length: 'Umubare {digit} muri {length}', // verified-rw
    edit_details: 'Hindura amakuru', // verified-rw
    email_optional: 'Imeyili (si ngombwa)', // verified-rw
    enter_code_phone: 'Andika kode y’imibare itandatu yoherejwe kuri {phone}.', // verified-rw
    enter_full_name: 'Andika amazina yawe yose', // verified-rw
    enter_phone: 'Andika nimero ya telefoni yawe', // verified-rw
    enter_sent_code: 'Andika kode y’imibare 6 twohereje kuri telefoni yawe.', // verified-rw
    enter_sent_code_prefix: 'Andika kode y’imibare 6 twohereje kuri', // verified-rw
    enter_six_digit_code: 'Andika kode y’imibare 6', // verified-rw
    failed: 'Ntibyakunze', // verified-rw
    favourites_waiting: 'Ibicuruzwa by’ubwiza ukunda biragutegereje.', // verified-rw
    go_login: 'Jya aho binjirira', // verified-rw
    join_benefits: 'Injira muri FreedomCosmeticShop ugure vuba kandi ukurikirane komande zawe.', // verified-rw
    logged_out: 'Wasohotse', // verified-rw
    login_failed: 'Kwinjira ntibyakunze', // verified-rw
    login_otp: 'Injira ukoresheje OTP', // verified-rw
    login_phone_password: 'Injira ukoresheje telefoni n’ijambo ry’ibanga.', // verified-rw
    login_rwanda_identifier: 'Injira ukoresheje nimero yo mu Rwanda cyangwa imeyili.', // verified-rw
    login_view_account: 'Injira kugira ngo urebe konti yawe.', // verified-rw
    manage_addresses: 'Genzura aderesi zo kukugezaho', // verified-rw
    mfa_code_required: 'Andika kode y’imibare itandatu cyangwa kode y’ingoboka.', // verified-rw
    mfa_hint: 'Andika kode iri muri porogaramu y’umutekano. Ushobora no gukoresha kode y’ingoboka itarakoreshejwe.', // verified-rw
    mfa_title: 'Kugenzura umutekano mu byiciro bibiri', // verified-rw
    new_customer: 'Uri mushya kuri FreedomCosmeticShop?', // verified-rw
    new_password_8_chars: 'Ijambo ry’ibanga rishya rigomba kugira nibura inyuguti 8', // verified-rw
    new_points_balance: 'Amanota mashya: {points}', // verified-rw
    not_logged_in: 'Ntabwo winjiye', // verified-rw
    not_sure: 'Sinzi neza', // verified-rw
    now_logged_in: 'Ubu winjiye muri konti.', // verified-rw
    otp_label: 'OTP', // verified-rw
    otp_login_hint: 'Nta jambo ry’ibanga rikenewe — turakoherereza kode kuri telefoni.', // verified-rw
    otp_security_notice: 'Kode za OTP zirangira. Ntugasangize undi kode cyangwa ijambo ry’ibanga.', // verified-rw
    otp_send_failed: 'OTP ntiyashoboye koherezwa', // verified-rw
    password_8_chars: 'Ijambo ry’ibanga rigomba kugira nibura inyuguti 8', // verified-rw
    password_hashed: 'Ijambo ry’ibanga ryawe ribikwa mu buryo burinzwe', // verified-rw
    password_placeholder: 'Ijambo ry’ibanga ryawe', // verified-rw
    password_reset_failed: 'Guhindura ijambo ry’ibanga ntibyakunze', // verified-rw
    password_reset_flower: 'Ijambo ry’ibanga ryahinduwe! 🌸', // verified-rw
    password_security_full: 'Ijambo ry’ibanga ryawe ribikwa mu buryo burinzwe. Ntabwo turibika uko waryanditse.', // verified-rw
    password_updated: 'Ijambo ry’ibanga ryahinduwe', // verified-rw
    points: 'Amanota', // verified-rw
    points_added: '💎 Wongewe amanota {points}!', // verified-rw
    points_adjusted: 'Amanota {points} yahinduwe', // verified-rw
    points_available: 'Ufite amanota {points}', // verified-rw
    privacy_policy: 'Politiki y’amakuru bwite', // verified-rw
    register_benefits: 'Kwishyura vuba, kubona amanota no gukurikirana komande.', // verified-rw
    registration_failed: 'Kwiyandikisha ntibyakunze', // verified-rw
    reset_and_login: 'Hindura winjire', // verified-rw
    reset_failed: 'Guhindura ntibyakunze', // verified-rw
    reset_instructions: 'Andika telefoni yawe, kode twohereje n’ijambo ry’ibanga rishya.', // verified-rw
    returning_store: 'Turagusubiza mu iduka…', // verified-rw
    rwanda_beauty_freedom: 'Ubwisanzure mu bwiza bw’u Rwanda 🇷🇼', // verified-rw
    rwanda_phone_example: 'Andika nimero yo mu Rwanda yemewe (urugero: 0788123456)', // verified-rw
    rwanda_phone_format: 'Koresha uburyo bwa +250 78X/79X/72X/73X XXX XXX', // verified-rw
    rwanda_phone_label: 'Telefoni yo mu Rwanda (+250)', // verified-rw
    saved_products: 'Ibicuruzwa wabitse', // verified-rw
    secure_login: 'Kwinjira mu buryo burinzwe', // verified-rw
    secure_shopping: 'Guhaha bitekanye', // verified-rw
    secure_signed_in: 'Konti yawe iratekanye kandi ubu winjiye.', // verified-rw
    see_you_soon: 'Tuzongera kubonana! 🌸', // verified-rw
    select_skin_type: 'Hitamo ubwoko bw’uruhu rwawe', // verified-rw
    send_code: 'Ohereza kode', // verified-rw
    sending_code: 'Kode irimo koherezwa...', // verified-rw
    sending_otp: 'OTP irimo koherezwa…', // verified-rw
    signin_benefits: 'Injira wishyure vuba, ubone amanota, ubike aderesi kandi ukurikirane komande mu Rwanda.', // verified-rw
    six_digit_otp: 'OTP y’imibare itandatu', // verified-rw
    skin_type_label: 'Ubwoko bw’uruhu rwawe', // verified-rw
    sms_verification_hint: 'Turakoherereza kode yo kwemeza kuri SMS.', // verified-rw
    soon: 'Vuba', // verified-rw
    track_view_orders: 'Kurikirana kandi urebe komande zawe', // verified-rw
    trusted_kigali: 'Guhaha ibicuruzwa by’ubwiza wizeye, dukorera i Kigali.', // verified-rw
    unable_login: 'Kwinjira ntibyashobotse', // verified-rw
    updating: 'Birimo guhindurwa…', // verified-rw
    upgrade_wholesale: 'Tangira kurangura', // verified-rw
    use_another_phone: 'Koresha indi telefoni', // verified-rw
    valid_email_optional: 'Andika imeyili yemewe cyangwa usige ahatanditse', // verified-rw
    verification_code_input: 'Aho wandika kode yo kwemeza', // verified-rw
    verification_failed: 'Kwemeza ntibyakunze', // verified-rw
    verify_continue: 'Emeza ukomeze', // verified-rw
    verify_phone: 'Emeza telefoni yawe', // verified-rw
    verifying_account: 'Konti irimo kwemezwa…', // verified-rw
    welcome_back_flower: 'Murakaza neza! 🌸', // verified-rw
    welcome_shop: 'Murakaza neza kuri FreedomCosmeticShop! 🌸', // verified-rw
    wholesale_application: 'Ubusabe bwo kurangura', // verified-rw
    wholesale_dashboard: 'Urubuga rwo kurangura', // verified-rw
    wholesale_dashboard_hint: 'Reba inguzanyo, inyemezabwishyu, ongera utumize kandi urebe ibyo wazigamye', // verified-rw
    wholesale_pending: 'Ubusabe bwo kurangura butegereje', // verified-rw
    wholesale_save: 'Reba ibiciro byo kurangura byashyizweho kuri buri gicuruzwa', // verified-rw

    account_role: 'Uruhare rwa konti', // verified-rw
    discover_products: 'Reba ibicuruzwa', // verified-rw
    freedom_beauty: 'Freedom Beauty', // verified-rw
    my_beauty_account: 'Konti yanjye y’ubwiza', // verified-rw
    open_wishlist: 'Fungura ibyo wifuza', // verified-rw
    profile_details: 'Amakuru ya konti', // verified-rw
    profile_update_failed: 'Guhindura amakuru ya konti ntibyakunze', // verified-rw
    profile_updated: 'Amakuru ya konti yahinduwe neza.', // verified-rw
    rwanda: 'Rwanda', // verified-rw
    saved_beauty: 'Ibicuruzwa by’ubwiza wabitswe', // verified-rw
    save_changes: 'Bika impinduka', // verified-rw
    signin_account: 'Injira muri konti yawe', // verified-rw
    start_shopping: 'Tangira guhaha', // verified-rw
    view_my_orders: 'Reba komande zanjye', // verified-rw
    wishlist_ready: 'Ibicuruzwa ukunda, biteguye igihe ubishakiye.', // verified-rw
  },
  reviews: {
    checking_eligibility: 'Turimo kugenzura niba wemerewe gutanga igitekerezo ku byo wagejejweho...', // verified-rw
    not_eligible: 'Iki gicuruzwa cyo muri komande nticyemerewe gutangwaho igitekerezo.', // verified-rw
    form_title: 'Tanga igitekerezo cyawe cy’ukuri', // verified-rw
    equal_reward_notice: 'Buri gitekerezo cy’ukuri cyujuje ibisabwa gihabwa amanota {points}. Igitekerezo cy’inyenyeri imwe gihabwa angana neza n’ay’inyenyeri eshanu.', // verified-rw
    order_value: 'Komande {order}', // verified-rw
    verified_purchase: 'Ubuguzi bwagejejwe kandi bwemejwe', // verified-rw
    rating_label: 'Amanota yawe', // verified-rw
    stars_label: 'Inyenyeri {count}', // verified-rw
    rating_1: 'Sinanyuzwe na gato', rating_2: 'Sinanyuzwe', rating_3: 'Ni hagati', rating_4: 'Naranyuzwe', rating_5: 'Naranyuzwe cyane', // verified-rw
    title_optional: 'Umutwe (si ngombwa)', // verified-rw
    title_placeholder: 'Vuga muri make uko byagenze', // verified-rw
    comment_optional: 'Igitekerezo cyawe (si ngombwa)', // verified-rw
    comment_placeholder: 'Ni iki cyagenze neza? Ni iki cyakosorwa? Ibitekerezo binenga cyangwa bitishimiye igicuruzwa biremewe.', // verified-rw
    skin_optional: 'Ubwoko bw’uruhu rwawe (si ngombwa)', // verified-rw
    hair_optional: 'Ubwoko bw’umusatsi wawe (si ngombwa)', // verified-rw
    shade_match: 'Ibara ryahuye n’uruhu rwawe?', // verified-rw
    photos_optional: 'Amafoto (si ngombwa · ntarengwa {count})', // verified-rw
    photo_alt: 'Ifoto y’igitekerezo {number}', // verified-rw
    remove_photo: 'Kuraho ifoto', // verified-rw
    add_photo: 'Ongeraho ifoto', // verified-rw
    submitting: 'Birimo koherezwa...', // verified-rw
    submit_equal: 'Ohereza igitekerezo cy’ukuri · ubone amanota {points}', // verified-rw
    negative_welcome: 'Ibihembo bishingira ku gitekerezo cy’ukuri cyujuje ibisabwa—ntibishingira ku kuba amanota ari meza cyangwa mabi.', // verified-rw
    thank_you: 'Murakoze gutanga igitekerezo cy’ukuri', // verified-rw
    points_awarded_equal: 'Wahawe amanota {points}, angana n’ahabwa buri gitekerezo cyujuje ibisabwa uko amanota yatanzwe yaba angana kose.', // verified-rw
    back_to_product: 'Subira ku gicuruzwa', // verified-rw
    back_to_orders: 'Subira kuri komande zanjye', // verified-rw
    review_delivered_products: 'Tanga ibitekerezo ku bicuruzwa wagejejweho', // verified-rw
    review_product: 'Tanga igitekerezo kuri {product}', // verified-rw
    error_auth_required: 'Injira kugira ngo utange igitekerezo ku byo wagejejweho.', // verified-rw
    error_delivered_order_required: 'Ibicuruzwa byo muri komande wagejejweho gusa ni byo bitangwaho igitekerezo.', // verified-rw
    error_product_not_in_order: 'Iki gicuruzwa nticyari muri iyo komande.', // verified-rw
    error_review_window_expired: 'Igihe cy’iminsi 90 cyo gutanga igitekerezo cyarangiye.', // verified-rw
    error_already_reviewed: 'Warangije gutanga igitekerezo kuri iki gicuruzwa cyo muri iyi komande.', // verified-rw
    error_invalid_review_photo: 'Koresha ifoto ya JPEG, PNG cyangwa WebP iri munsi ya MB 5.', // verified-rw
    error_review_photo_upload_failed: 'Ifoto ntiyashoboye koherezwa.', // verified-rw
    error_rating_required: 'Hitamo amanota kuva ku nyenyeri imwe kugeza kuri eshanu.', // verified-rw
    error_review_submission_failed: 'Igitekerezo nticyashoboye koherezwa. Ongera ugerageze.', // verified-rw
    error_eligibility_unavailable: 'Kugenzura niba wemerewe gutanga igitekerezo ntibyashobotse. Ongera ugerageze.', // verified-rw
    loading: 'Ibitekerezo byemejwe birimo gufunguka...', // verified-rw
    load_failed: 'Ibitekerezo byemejwe ntibyashoboye gufunguka.', // verified-rw
    empty_title: 'Nta bitekerezo byemejwe biraboneka', // verified-rw
    empty_hint: 'Ibitekerezo byemejwe bizagaragara nyuma y’uko abakiriya bagejejweho iki gicuruzwa bakagitangaho igitekerezo.', // verified-rw
    real_count: 'Ibitekerezo nyabyo byemejwe {count}', // verified-rw
    all_verified: 'Ibitekerezo byose bigaragara ni iby’abakiriya bagejejweho ibicuruzwa', // verified-rw
    filtered_stars: 'Byashunguwe: inyenyeri {count}', // verified-rw
    sort_label: 'Tondeka', // verified-rw
    sort_helpful: 'Ibyafashije cyane', // verified-rw
    sort_recent: 'Ibiheruka', // verified-rw
    sort_high: 'Amanota menshi mbere', // verified-rw
    sort_low: 'Amanota make mbere', // verified-rw
    skin_value: 'Uruhu: {value}', // verified-rw
    hair_value: 'Umusatsi: {value}', // verified-rw
    shade_matched: 'Ibara ryahuye', // verified-rw
    shade_not_matched: 'Ibara ntiryahuye', // verified-rw
    merchant_response: 'Igisubizo cya FreedomCosmeticShop', // verified-rw
    helpful_question: 'Iki gitekerezo cyagufashije?', // verified-rw
    report: 'Tanga raporo', // verified-rw
    report_reason: 'Impamvu', // verified-rw
    report_spam: 'Ubutumwa budakenewe', // verified-rw
    report_abuse: 'Amagambo atukana', // verified-rw
    report_privacy: 'Ikibazo cy’amakuru bwite', // verified-rw
    report_irrelevant: 'Ibidafitanye isano', // verified-rw
    report_other: 'Indi mpamvu', // verified-rw
    report_details: 'Ongeraho ibisobanuro igihe bikenewe', // verified-rw
    submit_report: 'Ohereza raporo', // verified-rw
    report_received: 'Raporo yakiriwe kugira ngo igenzurwe n’umuyobozi.', // verified-rw
    load_more: 'Fungura ibindi bitekerezo byemejwe', // verified-rw
    error_self_vote_not_allowed: 'Ntushobora gutora ku gitekerezo cyawe.', // verified-rw
    error_already_reported: 'Warangije gutanga raporo kuri iki gitekerezo.', // verified-rw
    error_self_report_not_allowed: 'Ntushobora gutanga raporo ku gitekerezo cyawe.', // verified-rw
    error_invalid_report: 'Hitamo impamvu yemewe kandi utange ibisobanuro bikenewe.', // verified-rw
    action_failed: 'Igikorwa ku gitekerezo nticyashoboye kurangira.', // verified-rw
    admin_nav: 'Ibitekerezo by’abakiriya', // verified-rw
    admin_title: 'Ibitekerezo by’abakiriya', // verified-rw
    admin_subtitle: 'Subiza mu buryo bw’umwuga kandi ugenzure gusa ubutumwa budakenewe, ibitutsi, amakuru bwite, amategeko cyangwa ibyisubiramo.', // verified-rw
    admin_guidelines: 'Amabwiriza yo kugenzura', // verified-rw
    admin_keep_negative: 'Ntuzigere uhisha igitekerezo cy’ukuri kubera gusa ko kinenga cyangwa kitishimye.', // verified-rw
    admin_hide_only_abuse: 'Hisha gusa ubutumwa budakenewe, ibitutsi, amakuru bwite, ikibazo cy’amategeko cyangwa ibyasubiwemo.', // verified-rw
    admin_respond_professionally: 'Subiza mu buryo bw’umwuga utajya impaka n’umukiriya cyangwa ngo umushinje.', // verified-rw
    admin_no_rating_bias: 'Koresha amabwiriza amwe ku bitekerezo by’amanota yose.', // verified-rw
    admin_filters: 'Inshungura zo kugenzura ibitekerezo', // verified-rw
    admin_tab_all: 'Ibitekerezo byose', // verified-rw
    admin_tab_reported: 'Byatanzweho raporo', // verified-rw
    admin_tab_needs_response: 'Bikeneye igisubizo', // verified-rw
    admin_tab_hidden: 'Byahishwe', // verified-rw
    admin_load_failed: 'Ibitekerezo ntibyashoboye gufunguka.', // verified-rw
    admin_empty: 'Nta bitekerezo bihuye n’iyi nshungura.', // verified-rw
    admin_hidden_label: 'Cyahishwe kugira ngo kigenzurwe', // verified-rw
    admin_order_unavailable: 'Nimero ya komande ntiboneka', // verified-rw
    admin_open_reports: 'Raporo {count} zitarakemurwa', // verified-rw
    admin_keep_visible: 'Kemura raporo kandi ugumishe igitekerezo kigaragara', // verified-rw
    admin_response_placeholder: 'Andika igisubizo cyubaha umukiriya kandi gishingiye ku kuri...', // verified-rw
    admin_post_response: 'Tangaza igisubizo', // verified-rw
    admin_respond: 'Subiza iki gitekerezo', // verified-rw
    admin_response_saved: 'Igisubizo cy’umucuruzi cyabitswe', // verified-rw
    admin_restore: 'Subiza igitekerezo ku mugaragaro', // verified-rw
    admin_restored: 'Igitekerezo cyasubijwe ku mugaragaro', // verified-rw
    admin_hide_spam: 'Genzura ubutumwa budakenewe cyangwa ibitutsi', // verified-rw
    admin_hide_reason: 'Impamvu yemewe yo kugenzura irakenewe', // verified-rw
    admin_reason_spam: 'Ubutumwa budakenewe', // verified-rw
    admin_reason_abuse: 'Amagambo atukana', // verified-rw
    admin_reason_privacy: 'Kurenga ku makuru bwite', // verified-rw
    admin_reason_legal: 'Icyemezo cy’amategeko', // verified-rw
    admin_reason_duplicate: 'Ibyasubiwemo', // verified-rw
    admin_moderation_details: 'Andika ibisobanuro by’ukuri byo kugenzura', // verified-rw
    admin_confirm_hide: 'Hisha kubera iyi mpamvu', // verified-rw
    admin_hidden: 'Igitekerezo cyahishwe kugira ngo kigenzurwe', // verified-rw
    admin_reports_resolved: 'Raporo zakemuwe; igitekerezo kiracyagaragara', // verified-rw
    admin_action_failed: 'Igikorwa cyo kugenzura nticyashoboye kurangira.', // verified-rw
  },
  orders: {
    title: 'Ibyo natumije', empty: 'Nta byo uratumiza', empty_hint: 'Tangira guhaha, ibyo utumije bizagaragara hano', order_number: 'Komande #{number}', placed_on: 'Byatumijwe ku wa {date}', total: 'Igiteranyo: {amount} RWF', status_pending: 'Bitegereje', status_confirmed: 'Byemejwe', status_processing: 'Birimo gutegurwa', status_shipped: 'Biri mu nzira', status_delivered: 'Byagejejwe', status_cancelled: 'Byahagaritswe', status_returned: 'Byasubijwe', status_refunded: 'Amafaranga yasubijwe', track: 'Kurikirana komande', view_details: 'Reba ibisobanuro', reorder: 'Ongera utumize', cancel_order: 'Hagarika komande', tracking_title: 'Kurikirana komande #{number}', tracking_live: '🔴 AKO KANYA', step_placed: 'Komande yakiriwe', step_confirmed: 'Komande yemejwe', step_processing: 'Irimo gutegurwa', step_shipped: 'Iri mu nzira', step_delivered: 'Yagejejwe', rider_info: 'Umumotari wawe', rider_name: 'Amazina: {name}', rider_phone: 'Telefoni: {phone}', estimated: 'Biteganyijwe: {time}', call_rider: 'Hamagara umumotari', whatsapp_rider: 'Andikira umumotari kuri WhatsApp', delivery_address: 'Aho ibicuruzwa bigezwa', payment_info: 'Amakuru yo kwishyura', leave_review: 'Tanga igitekerezo', review_prompt: 'Serivisi yakunyuze ite?', // 🔍 REVIEW

    account_home: 'Ahabanza ha konti', // verified-rw
    current: 'Aho igeze', // verified-rw
    delivery_status: 'Kuyigeza: {status}', // verified-rw
    enter_number_status: 'Andika nimero ya komande urebe amakuru yayo mashya.', // verified-rw
    history: 'Amateka ya komande', // verified-rw
    load_failed: 'Komande ntizashoboye gufunguka', // verified-rw
    number_format_hint: 'Ongera ugenzure nimero ya komande — iba imeze nka UB-YYYY-NNNNN.', // verified-rw
    number_sent_sms: 'Nimero ya komande yoherejwe kuri SMS igihe watumizaga.', // verified-rw
    on_the_way: 'Komande yawe iri mu nzira!', // verified-rw
    order_label: 'Komande', // verified-rw
    order_update: 'Amakuru mashya ya komande', // verified-rw
    phone_pending: 'Nimero ya telefoni irategerejwe', // verified-rw
    placed_label: 'Yatumijwe ku wa', // verified-rw
    realtime_cancelled: 'Komande yahagaritswe.', // verified-rw
    realtime_confirmed: 'Komande yemejwe! Turimo kuyitegura.', // verified-rw
    realtime_delivered: 'Komande yagejejwe! Murakoze guhaha natwe.', // verified-rw
    realtime_processing: 'Komande irimo gutegurwa.', // verified-rw
    realtime_shipped: 'Komande yoherejwe! Iri mu nzira.', // verified-rw
    rider_assigned: 'Umumotari yashyizwe kuri komande!', // verified-rw
    share_tracking_message: '📦 Komande {order}, imiterere: {status}\n\n{items}\n\nIgiteranyo: {total}\nYikurikiranire kuri freedomcosmeticshop.rw 🌸', // verified-rw
    status_label: 'Imiterere', // verified-rw
    timeline: 'Uko komande ikurikirana', // verified-rw
    track_every_delivery: 'Kurikirana buri komande ya FreedomCosmeticShop.', // verified-rw
    track_failed: 'Gukurikirana komande ntibyakunze', // verified-rw
    tracking_code: 'Kode yo gukurikirana', // verified-rw
    tracking_empty_hint: 'Uzabona uko komande ikurikirana, ibicuruzwa n’amakuru yo kuyigeza.', // verified-rw
    tracking_value: 'Kode yo gukurikirana: {code}', // verified-rw
  },
  delivery: {
    title: 'Amakuru yo kugeza ibicuruzwa', estimate: 'Reba ikiguzi cyo kukugezaho', select_district: 'Hitamo akarere kawe', kigali_same_day: 'Kubigeza uwo munsi', kigali_fee: '1,000 RWF', kigali_time: 'Uyu munsi mbere ya saa kumi n’ebyiri (utumije mbere ya saa munani)', province_fee_north: '3,000 RWF', province_fee_south: '3,000 RWF', province_fee_east: '3,500 RWF', province_fee_west: '4,000 RWF', province_time: 'Iminsi 2-3 y’akazi', west_time: 'Iminsi 3-4 y’akazi', free_above: 'Kubigezwaho ku buntu ku komande irenze 50,000 RWF', free_delivery: 'Kubigezwaho ku buntu! 🎉', spend_more: 'Ongeraho {amount} RWF ubone kubigezwaho ku buntu', cutoff: 'Tumiza mbere ya saa munani ubigezweho uwo munsi', sms_updates: 'Uzajya ubona ubutumwa bwa SMS kuri buri ntambwe', instructions: { title: 'Amabwiriza yo kukugezaho', include_landmark: 'Andika ikimenyetso kiri hafi y’aho uri', be_available: 'Ba uhari cyangwa usige umuntu wakira ibicuruzwa', call_rider: 'Umumotari azaguhamagara mbere yo kuhagera', kigali_areas: 'Muri Kigali: bigerayo uwo munsi iyo utumije mbere ya saa munani', province_areas: 'Mu ntara: iminsi 2-4 y’akazi' }, districts_load_failed: 'Uturere ntitwashoboye gufunguka', estimate_unavailable: 'Ikigereranyo cyo kukugezaho ntikiboneka', // 🔍 REVIEW // verified-rw

    zone_kigali: 'Kigali', // verified-rw
    zone_north: 'Intara y’Amajyaruguru', // verified-rw
    zone_south: 'Intara y’Amajyepfo', // verified-rw
    zone_east: 'Intara y’Iburasirazuba', // verified-rw
    zone_west: 'Intara y’Iburengerazuba', // verified-rw
    zone_other: 'Ahandi', // verified-rw
    business_days: 'Iminsi {days} y’akazi', // verified-rw
  },
  errors: {
    page_not_found: 'Urupapuro ntirubonetse', page_not_found_message: 'Ihangane, uru rupapuro ntirubaho.', go_home: 'Subira ahabanza', browse_products: 'Reba ibicuruzwa', network_error: 'Nta murongo wa interineti uhari. Reba interineti yawe.', server_error: 'Seriveri yagize ikibazo. Ongera ugerageze.', load_failed: 'Ntibyashoboye gufunguka. Ongera ugerageze.', products_load_failed: 'Ibicuruzwa ntibyashoboye gufunguka.', cart_load_failed: 'Igitebo cyawe nticyashoboye gufunguka.', payment_failed: 'Kwishyura ntibyakunze. Ongera ugerageze.', offline: '⚠️ Nta murongo wa interineti', try_again: 'Ongera ugerageze', contact_support: 'Vugana n’abagufasha', // 🔍 REVIEW
  },
  empty: {
    cart: 'Igitebo cyawe kirimo ubusa', cart_hint: 'Reba ibicuruzwa ubishyire mu gitebo', wishlist: 'Nta bicuruzwa biri mu byo wifuza', wishlist_hint: 'Bika ibicuruzwa ukunda uzabirebe nyuma', orders: 'Nta byo uratumiza', orders_hint: 'Ibyo utumije bizagaragara hano', products: 'Nta bicuruzwa byabonetse', products_hint: 'Gerageza andi magambo cyangwa inshungura', reviews: 'Nta bitekerezo biratangwa', reviews_hint: 'Ba uwa mbere gutanga igitekerezo kuri iki gicuruzwa', notifications: 'Nta makuru mashya', search: 'Nta bisubizo kuri "{query}"', search_hint: 'Gerageza amavuta yo kwisiga, amavuta y’umusatsi, isabune cyangwa urebe ibyiciro', // 🔍 REVIEW
  },
  whatsapp: {
    general_help: 'Muraho FreedomCosmeticShop! Nkeneye ubufasha.', order_help: 'Muraho! Nkeneye ubufasha kuri komande #{order}.', product_inquiry: 'Muraho! Nifuza kumenya ibijyanye n’iki gicuruzwa: {product}. Kirahari?', return_request: 'Muraho! Nifuza gusubiza igicuruzwa cyo kuri komande #{order}.', wholesale_inquiry: 'Muraho! Nifuza amakuru ajyanye n’ibiciro byo kurangura.', share_product: 'Reba iki gicuruzwa kuri FreedomCosmeticShop:\n{product}\nIgiciro: {price} RWF\n{url}', share_cart: 'Nabonye ibicuruzwa byiza kuri FreedomCosmeticShop!\n{items}\nIgiteranyo: {total} RWF\n{url}', // 🔍 REVIEW
    message_greeting: 'Muraho FreedomCosmeticShop! 👋', // verified-rw
    product_order_intro: 'Nifuza gutumiza iki gicuruzwa:', // verified-rw
    message_product: '🛍️ {name}', // verified-rw
    message_shade: '🎨 Ibara: {shade}', // verified-rw
    message_size: '📦 Ingano: {size}', // verified-rw
    message_quantity: '🔢 Umubare: {count}', // verified-rw
    message_unit_price: '💰 Igiciro cya kimwe: {amount}', // verified-rw
    message_line_total: '🔢 ×{count} = {amount}', // verified-rw
    message_subtotal: '💰 Igiteranyo mbere y’ibindi: {amount}', // verified-rw
    message_discount: '🏷️ Igabanyirizwa: {amount}', // verified-rw
    message_delivery: '🚚 Kukugezaho: {amount}', // verified-rw
    message_total: '💳 Igiteranyo cyose: {amount}', // verified-rw
    message_district: '📍 Akarere: {district}', // verified-rw
    message_link: '🔗 {url}', // verified-rw
    product_order_close: 'Mwemeze niba kigihari n’uburyo bwo kwishyura buboneka kuri iyi komande.', // verified-rw
    cart_order_intro: 'Nifuza ubufasha bwo gutumiza ibi bicuruzwa biri mu gitebo:', // verified-rw
    cart_item: '{number}. {name}', // verified-rw
    cart_order_close: 'Mwemeze niba bikiboneka n’uburyo bwo kwishyura.', // verified-rw
    free: 'UBUNTU', // verified-rw
    quick_payment: 'Uburyo bugaragara mu kwishyura harimo MTN MoMo, Airtel Money, ikarita inyuzwa kuri Flutterwave no kwishyura ugejejweho muri Kigali gusa. Kuba serivisi iboneka byemezwa mu gihe cyo kwishyura. Kuri Mobile Money, andika PIN kuri telefoni yawe bwite gusa—ntuzayandike ku rubuga.', // verified-rw
    quick_delivery: 'Ibiciro bisanzwe byo kukugezaho ubu: Kigali {kigali}; Intara y’Amajyaruguru n’Amajyepfo {northSouth}; Iburasirazuba {east}; Iburengerazuba {west}. Muri Kigali bishobora kugezwa uwo munsi iyo watumije mbere ya {cutoff}. Komande zujuje ibisabwa za {threshold} cyangwa zirenga zigezwa ku buntu. Hitamo akarere urebe ikiguzi n’igihe biriho ubu.', // verified-rw
    quick_returns: 'Ibicuruzwa byujuje ibisabwa, bidafunguye kandi bitakoreshejwe bishobora gusubizwa mu minsi {days}. Ibikoresho byo kwita ku mubiri byafunguwe akenshi ntibisubizwa kubera isuku, keretse bifite inenge cyangwa atari byo watumije. Tanga nimero ya komande kugira ngo ibisabwa bigenzurwe.', // verified-rw
    quick_authenticity: 'Reba amakuru y’umwimerere yanditswe ku rupapuro rw’igicuruzwa. Tuvuga ko igicuruzwa cyemejwe nk’umwimerere gusa iyo icyemezo cyanditswe kuri icyo gicuruzwa. Ohereza amafoto asobanutse y’igipfunyika, ikimenyetso cyo gufunga na kode ya batch niba ukeneye ubufasha bwo kukigenzura.', // verified-rw
    quick_hours_configured: 'Amasaha y’ubufasha yatangajwe: {hours}. Igihe giteganyijwe cyo gusubizwa: {responseTime}.', // verified-rw
    quick_hours_unconfigured: 'Amasaha y’ubufasha kuri WhatsApp n’igihe cyo gusubizwa ntibiratangazwa. Ohereza ubutumwa utegereze igisubizo cy’umukozi; ntitwizeza ko uhita usubizwa.', // verified-rw
    order_product: 'Tumiza iki gicuruzwa kuri WhatsApp', // verified-rw
    order_product_compact: 'Tumiza kuri WhatsApp', // verified-rw
    order_includes: 'Ubutumwa burimo: {name}, umubare {count}, igiteranyo {price}', // verified-rw
    unavailable: 'Ntikiboneka gutumizwa kuri WhatsApp', // verified-rw
    cart_prefer: 'Ukeneye ubufasha bwo gutumiza ibiri mu gitebo ukoresheje WhatsApp?', // verified-rw
    order_cart: 'Tumiza ibiri mu gitebo kuri WhatsApp', // verified-rw
    items_included: 'Ibicuruzwa {count}, ibiciro biriho, igabanyirizwa, ikiguzi cyo kukugezaho n’amahuza y’ibicuruzwa bizashyirwa mu butumwa.', // verified-rw
    select_district_first: 'Hitamo akarere kandi utegereze ikigereranyo cyo kukugezaho kiriho mbere yo gutumiza kuri WhatsApp.', // verified-rw
    support_title: 'Ubufasha kuri WhatsApp', // verified-rw
    support_subtitle: 'Fungura ikiganiro cy’ubufasha mu Kinyarwanda cyangwa Icyongereza. Abakozi basubiza igihe baboneka.', // verified-rw
    agent_name_unpublished: 'Izina ry’umukozi ntiriratangazwa', // verified-rw
    assisted_support: 'Ubufasha bwa FreedomCosmeticShop', // verified-rw
    availability_not_claimed: 'Ntabwo tuvuga ko umukozi ari kuri interineti cyangwa ko uhita usubizwa.', // verified-rw
    support_hours: 'Amasaha y’ubufasha yatangajwe', // verified-rw
    hours_unpublished: 'Amasaha y’ubufasha n’igihe cyo gusubizwa ntibiratangazwa. Ushobora kohereza ubutumwa, ariko ntitwizeza ko uhita usubizwa.', // verified-rw
    response_time_value: 'Igihe cyo gusubizwa cyatangajwe: {time}', // verified-rw
    quick_replies: 'Ibibazo bikunze kubazwa — kanda ubaze', // verified-rw
    support_payment_title: 'Uburyo bwo kwishyura', // verified-rw
    support_payment_description: 'Baza uburyo bwo kwishyura buboneka ubu.', // verified-rw
    support_payment_inquiry: 'Muraho FreedomCosmeticShop. Ni ubuhe buryo bwo kwishyura buboneka ubu kuri komande yanjye?', // verified-rw
    support_delivery_title: 'Kukugezaho', // verified-rw
    support_delivery_description: 'Baza ikiguzi n’igihe biriho ubu mu karere kawe.', // verified-rw
    support_delivery_inquiry: 'Muraho FreedomCosmeticShop. Nkeneye kumenya ikiguzi n’igihe byo kungezaho mu karere kanjye.', // verified-rw
    support_returns_title: 'Gusubiza ibicuruzwa n’amafaranga', // verified-rw
    support_returns_description: 'Saba umukozi kugenzura niba komande yawe yujuje ibisabwa.', // verified-rw
    support_returns_inquiry: 'Muraho FreedomCosmeticShop. Nkeneye ubufasha bwo kugenzura niba igicuruzwa cyo muri komande yanjye gishobora gusubizwa.', // verified-rw
    support_authenticity_title: 'Umwimerere w’igicuruzwa', // verified-rw
    support_authenticity_description: 'Saba ubufasha bwo kugenzura amakuru yanditswe ku gicuruzwa.', // verified-rw
    support_authenticity_inquiry: 'Muraho FreedomCosmeticShop. Nkeneye ubufasha bwo kugenzura amakuru y’umwimerere w’igicuruzwa.', // verified-rw
    language_note: 'Ubufasha mu Kinyarwanda', // verified-rw
    language_note_detail: 'Tangira mu Kinyarwanda cyangwa uhindure urubuga mu Cyongereza mbere yo gufungura WhatsApp.', // verified-rw
    start_chat: 'Tangira ikiganiro kuri WhatsApp', // verified-rw
    verified_number: 'WhatsApp yoherezwaho: {number}', // verified-rw
    phone_unpublished: 'Indi nimero ya telefoni y’ubufasha yemejwe ntiratangazwa.', // verified-rw
    floating_product: 'Muraho FreedomCosmeticShop. Nkeneye amakuru ku gicuruzwa kiri kuri uru rupapuro.', // verified-rw
    floating_cart: 'Muraho FreedomCosmeticShop. Nkeneye ubufasha ku gitebo cyanjye.', // verified-rw
    floating_order: 'Muraho FreedomCosmeticShop. Nkeneye ubufasha bwo gukurikirana komande.', // verified-rw
    floating_invitation: 'Ukeneye ubufasha? Fungura ikiganiro cya WhatsApp mu Kinyarwanda cyangwa Icyongereza.', // verified-rw
    response_time_unpublished: 'Igihe cyo gusubizwa ntikiratangazwa. Ohereza ubutumwa utegereze ko umukozi aboneka.', // verified-rw
    analytics_title: 'Isesengura ry’ubufasha bwo kugurisha kuri WhatsApp', // verified-rw
    analytics_last_30: 'Iminsi 30 ishize', // verified-rw
    analytics_total: 'Gukanda kuri WhatsApp kwanditswe', // verified-rw
    analytics_empty: 'Nta gukanda kuri WhatsApp kwanditswe muri iki gihe.', // verified-rw
    analytics_by_type: 'Ukurikije ubwoko bw’igikorwa', // verified-rw
    analytics_by_language: 'Ukurikije ururimi', // verified-rw
    analytics_top_products: 'Ibicuruzwa byakanzweho cyane', // verified-rw
    analytics_no_products: 'Nta gukanda ku gicuruzwa runaka kwanditswe.', // verified-rw
    analytics_rw: 'Ikinyarwanda', // verified-rw
    analytics_en: 'Icyongereza', // verified-rw
    analytics_load_failed: 'Isesengura rya WhatsApp ntiryashoboye gufunguka.', // verified-rw
    analytics_event_order_product: 'Gutumiza igicuruzwa', // verified-rw
    analytics_event_order_cart: 'Gutumiza ibiri mu gitebo', // verified-rw
    analytics_event_product_inquiry: 'Kubaza ku gicuruzwa', // verified-rw
    analytics_event_delivery_inquiry: 'Kubaza ku kugeza ibicuruzwa', // verified-rw
    analytics_event_payment_help: 'Ubufasha bwo kwishyura', // verified-rw
    analytics_event_returns_inquiry: 'Kubaza ku gusubiza', // verified-rw
    analytics_event_authenticity_check: 'Kugenzura umwimerere', // verified-rw
    analytics_event_general_support: 'Ubufasha rusange', // verified-rw
    analytics_event_track_order: 'Gukurikirana komande', // verified-rw
    analytics_event_wholesale_inquiry: 'Kubaza ku kurangura', // verified-rw
    analytics_event_share_product: 'Gusangiza igicuruzwa', // verified-rw
    analytics_event_share_cart: 'Gusangiza igitebo', // verified-rw
    guide_title: 'Amabwiriza y’umukozi wa WhatsApp', // verified-rw
    guide_subtitle: 'Koporora ibisubizo by’ukuri byabitswe kugira ngo ufashe abakiriya. Banza wemeze amakuru ya komande mbere yo kohereza.', // verified-rw
    guide_setup_complete: 'Amakuru y’ubufasha yashyizweho', // verified-rw
    guide_setup_required: 'Amakuru y’ubufasha agomba gushyirwaho', // verified-rw
    guide_agent: 'Izina ry’umukozi ryatangajwe', // verified-rw
    guide_hours: 'Amasaha y’ubufasha yatangajwe', // verified-rw
    guide_response_time: 'Igihe cyo gusubizwa cyatangajwe', // verified-rw
    guide_number: 'Nimero ya WhatsApp', // verified-rw
    guide_topics: 'Ibyiciro by’ibisubizo byabitswe', // verified-rw
    guide_topic_payment: 'Ibibazo byo kwishyura', // verified-rw
    guide_topic_delivery: 'Ibibazo byo kugeza ibicuruzwa', // verified-rw
    guide_topic_returns: 'Gusubiza ibicuruzwa n’amafaranga', // verified-rw
    guide_topic_authenticity: 'Umwimerere w’ibicuruzwa', // verified-rw
    guide_topic_hours: 'Amasaha y’ubufasha', // verified-rw
    guide_preview: 'Uko ubutumwa bugaragara', // verified-rw
    guide_copy: 'Koporora igisubizo', // verified-rw
    guide_copied: 'Igisubizo cyakoporowe', // verified-rw
    guide_copy_failed: 'Igisubizo nticyashoboye gukopororwa', // verified-rw
    guide_usage_title: 'Ibyibutswa by’imikoreshereze itekanye', // verified-rw
    guide_usage_verify: 'Banza wemeze igicuruzwa, ububiko, akarere, ikiguzi n’amakuru ya komande mbere yo gusubiza.', // verified-rw
    guide_usage_order: 'Saba nimero ya komande gusa igihe ikenewe mu gufasha umukiriya.', // verified-rw
    guide_usage_no_promises: 'Ntukizeze ububiko, igihe cyo kugeza, gusubiza amafaranga cyangwa igihe cyo gusubiza utabanje kubyemeza.', // verified-rw
    guide_usage_pin: 'Ntuzigere usaba umukiriya PIN ya Mobile Money cyangwa amakuru yose y’ikarita.', // verified-rw
    admin_analytics: 'Isesengura rya WhatsApp', // verified-rw
    admin_guide: 'Amabwiriza ya WhatsApp', // verified-rw
  },
  sms: {
    abandoned_cart: 'Wasize ibicuruzwa {{itemCount}} mu gitebo! Rangiza komande yawe hano: {{cartLink}} {business} 🛒', // verified-rw
    abandoned_cart_description: 'Bwoherezwa nyuma y’amasaha 2 igitebo gisizwe', // verified-rw
    abandoned_cart_label: 'Igitebo cyasizwe', // verified-rw
    at_delivery_failed: 'Africa\'s Talking ntiyashoboye kohereza ubutumwa', // verified-rw
    at_error: 'Ikosa rya Africa\'s Talking: {error}', // verified-rw
    at_not_configured: 'Africa\'s Talking ntiyashyizweho', // verified-rw
    low_stock: 'IMENYESHA: {{productName}} hasigaye ibice {{stockCount}} gusa! Ongera ububiko vuba. Ubuyobozi bwa {business}', // verified-rw
    low_stock_description: 'Bwohererezwa ubuyobozi igihe igicuruzwa gisigaye ari gike', // verified-rw
    low_stock_label: 'Imenyesha ry’ububiko buke', // verified-rw
    not_sent: 'SMS ntiyoherejwe: {reason}', // verified-rw
    order_delivered: 'Komande yawe {{orderNumber}} yagejejwe! Murakoze guhitamo {business}. Tanga igitekerezo: {{reviewLink}} 🌟', // verified-rw
    order_delivered_status: '{business}: Komande {order} yagejejwe. Murakoze guhaha natwe.', // verified-rw
    review_request: '{business}: Tanga igitekerezo cy’ukuri kuri komande {order}: {url}. Buri gitekerezo cyujuje ibisabwa gihabwa amanota {points}, uko amanota watanze yaba angana kose.', // verified-rw
    order_delivered_description: 'Bwoherezwa komande imaze kugezwa, buriho ihuza ryo gutanga igitekerezo', // verified-rw
    order_delivered_label: 'Komande yagejejwe', // verified-rw
    order_placed: 'Murakoze! Komande yawe {{orderNumber}} yakiriwe. Tuzayitunganya vuba. {business} 📦', // verified-rw
    order_confirmation_detailed: 'FreedomCosmeticShop: Komande {order} yemejwe. Igiteranyo {amount}. Igezwa muri {district}, biteganyijwe {expected}.', // verified-rw
    payment_confirmation_detailed: 'FreedomCosmeticShop: Kwishyura komande {order} byemejwe. Igiteranyo {amount}. Igezwa muri {district}, biteganyijwe {expected}.', // verified-rw
    payment_stock_review: 'FreedomCosmeticShop: Twakiriye ubwishyu bwa komande {order}. Ububiko bugomba kugenzurwa; tuzakuvugisha mbere yo kukugezaho.', // verified-rw
    duplicate_payment_review: 'FreedomCosmeticShop: Twakiriye ubundi bwishyu bwa komande {order}. Ntukongere kwishyura; tuzabugenzura kandi tukuvugishe.', // verified-rw
    order_placed_description: 'Bwoherezwa umukiriya amaze gutumiza', // verified-rw
    order_placed_label: 'Komande yakiriwe', // verified-rw
    order_shipped: 'Komande yawe {{orderNumber}} iri mu nzira! Umumotari: {{riderName}} - {{riderPhone}}. Izagera mu minsi {{etaDays}}. {business} 🏍️', // verified-rw
    order_shipped_description: 'Bwoherezwa komande itangiye kugezwa', // verified-rw
    order_shipped_label: 'Komande yoherejwe', // verified-rw
    otp: '{business}: Kode yawe yo kwemeza ni {{code}}. Ikoreshwa mu minota 5. Ntuyisangize undi muntu.', // verified-rw
    otp_description: 'Bwoherezwa mu kwemeza telefoni, kwinjira no guhindura ijambo ry’ibanga', // verified-rw
    otp_label: 'Kwemeza OTP', // verified-rw
    payment_confirmed: 'Kwishyura {{amount}} RWF byemejwe! Komande {{orderNumber}} irimo gutegurwa. {business} ✅', // verified-rw
    payment_confirmed_description: 'Bwoherezwa igihe kwishyura byemejwe (MTN MoMo, Airtel cyangwa ikarita)', // verified-rw
    payment_confirmed_label: 'Kwishyura byemejwe', // verified-rw
    pindo_error: 'Ikosa rya Pindo: {error}', // verified-rw
    pindo_not_configured: 'Pindo ntiyashyizweho', // verified-rw
    promotional: '{{message}}{{code ? \' Koresha kode: \' + code : \'\'}} {business} 🌸', // verified-rw
    promotional_description: 'Ubutumwa bwihariye bwo kwamamaza (guhagarika ubutumwa birakurikizwa)', // verified-rw
    promotional_label: 'Kwamamaza', // verified-rw
    providers_failed: 'Abatanga serivisi bombi bananiwe. AT: {atError} | Pindo: {pindoError}', // verified-rw
    reason_ok: 'Ni byiza', // verified-rw
    reason_opted_out: 'Uwakira yahagaritse ubu butumwa', // verified-rw
    reason_transactional: 'Ubutumwa bwa serivisi bw’ingenzi', // verified-rw
    sent_via_at: 'Bwoherejwe na Africa\'s Talking', // verified-rw
    sent_via_pindo: 'Bwoherejwe na Pindo', // verified-rw
    simulated: 'SMS yageragejwe (ENABLE_SMS_NOTIFICATIONS=false)', // verified-rw
    unknown: 'ntibizwi', // verified-rw
    welcome: 'Murakaza neza kuri {business}, {{customerName}}! Gabanyirizwa 10% kuri komande ya mbere ukoresheje WELCOME10. 🌸', // verified-rw
    welcome_description: 'Bwoherezwa umukiriya mushya amaze kwiyandikisha', // verified-rw
    welcome_label: 'Murakaza neza', // verified-rw
  },
  ui: {
    carousel: 'uruhererekane rw’amashusho', // verified-rw
    chat_with_us: 'Ganira natwe', // verified-rw
    go_next_page: 'Jya ku rupapuro rukurikira', // verified-rw
    go_previous_page: 'Subira ku rupapuro rubanza', // verified-rw
    more_pages: 'Izindi mpapuro', // verified-rw
    next_slide: 'Igikurikira', // verified-rw
    pagination: 'urutonde rw’impapuro', // verified-rw
    previous_slide: 'Igibanza', // verified-rw
    slide: 'igice cy’uruhererekane', // verified-rw
    whatsapp_business: 'Ganira na {business} kuri WhatsApp', // verified-rw

    swipe: 'Nyereza', // verified-rw
  },
  wholesale: {
    honest_hero_title: 'Kurangura ku bucuruzi bwanditswe mu Rwanda', // verified-rw
    honest_hero_subtitle: 'Saba kubona ibiciro byo kurangura byashyizweho kuri buri gicuruzwa. Ibiciro n’ingano ntarengwa bigaragazwa gusa iyo byashyizweho kuri icyo gicuruzwa.', // verified-rw
    honest_current_terms: 'Amabwiriza yo kurangura akoreshwa ubu', // verified-rw
    honest_terms_intro: 'Aya ni yo mahitamo yashyizweho ubu. Ntidusezeranya igabanyirizwa, inguzanyo, komande ntoya cyangwa igihe cyo gusuzuma bitaremezwa.', // verified-rw
    honest_pricing_title: 'Ibiciro bya buri gicuruzwa', // verified-rw
    honest_pricing_desc: 'Nta rutonde rw’igabanyirizwa ruhita rukoreshwa. Ubucuruzi bwemejwe bubona ibiciro byo kurangura gusa ku bicuruzwa byashyiriweho ingano n’ibiciro.', // verified-rw
    honest_minimum_title: 'Komande ntoya', // verified-rw
    honest_minimum_unconfigured: 'Nta gaciro gato ka komande yo kurangura kashyizweho ubu. Igicuruzwa cyashyiriweho ibiciro gishobora kugira ingano ntoya isabwa.', // verified-rw
    honest_credit_title: 'Inguzanyo yo kurangura', // verified-rw
    honest_credit_disabled: 'Inguzanyo ntitangwa ubu. Uko kwishyura kuboneka kuri gahunda yo kwishyura ni ko gukoreshwa.', // verified-rw
    honest_review_title: 'Gusuzuma ubusabe', // verified-rw
    honest_review_no_promise: 'Ubusabe burasuzumwa ariko nta gihe ntarengwa cyatangajwe. Reba aho ubusabe bugeze nyuma yo kubwohereza.', // verified-rw
    honest_documents_title: 'Ibimenyetso by’ubucuruzi', // verified-rw
    honest_documents_initial: 'Inyandiko ntizisabwa kuri iyi fishi ya mbere. Mu gihe cyo gusuzuma, dushobora gusaba ibimenyetso byihariye bijyanye n’ubucuruzi.', // verified-rw
    honest_document_tin: 'Icyemezo cya TIN', // verified-rw
    honest_document_rdb: 'Icyemezo cya RDB cyangwa icyandikisha ubucuruzi', // verified-rw
    honest_document_business: 'Icyemezo ko ubucuruzi bukora', // verified-rw
    honest_document_owner: 'Icyemezo cy’umwirondoro wa nyir’ubucuruzi, niba gikenewe mu gusuzuma', // verified-rw
    honest_documents_upload_notice: 'Iyi fishi ntiyohereza amadosiye y’inyandiko. Ntugashyire amashusho y’indangamuntu cyangwa amahuza y’inyandiko bwite mu nyandiko y’inyongera.', // verified-rw
    honest_process_title: 'Uko ubusabe bukorwa', // verified-rw
    honest_step_1_title: 'Ohereza amakuru y’ubucuruzi', // verified-rw
    honest_step_1_desc: 'Tanga amakuru y’ukuri y’ubucuruzi n’ayo kuvugisha nyirabwo.', // verified-rw
    honest_step_2_title: 'Gusuzuma ubusabe', // verified-rw
    honest_step_2_desc: 'Amakuru watanze arasuzumwa. Dushobora kugusaba ibindi bimenyetso by’ubucuruzi.', // verified-rw
    honest_step_3_title: 'Reba icyemezo', // verified-rw
    honest_step_3_desc: 'Reba aho ubusabe bugeze. Kwemezwa biguha gusa ibiciro by’ibicuruzwa byashyiriweho ibiciro byo kurangura.', // verified-rw
    honest_questions_title: 'Ibibazo ku kurangura', // verified-rw
    honest_contact_intro: 'Vugisha FreedomCosmeticShop kuri imwe muri nimero za WhatsApp zemejwe na nyir’ubucuruzi.', // verified-rw
    honest_whatsapp_contact: 'WhatsApp {phone}', // verified-rw
    honest_no_hours_promise: 'Nta masaha y’akazi ko kurangura cyangwa igihe cyo gusubiza byatangajwe ubu.', // verified-rw
    honest_apply_title: 'Saba ukoresheje amakuru y’ubucuruzi y’ukuri', // verified-rw
    honest_approved_pricing: 'Ubusabe bwawe bwemejwe. Ibiciro byo kurangura biboneka gusa ku bicuruzwa byashyiriweho ingano n’ibiciro; kwemezwa ntibivuga ko buri gicuruzwa kigabanyirizwa.', // verified-rw
    honest_submit_updated_application: 'Ohereza ubusabe buvuguruye', // verified-rw
    honest_submission_received: 'Ubusabe bwawe bwakiriwe. Koresha urupapuro rw’aho bugeze kugira ngo urebe icyemezo.', // verified-rw
    dashboard_order_count: 'Komande zo kurangura', // verified-rw
    dashboard_invoice_count: 'Inyemezabwishyu za komande', // verified-rw
    dashboard_reorder_count: 'Kongera gutumiza byageragejwe', // verified-rw
    reorder_prepared: 'Kongera gutumiza byateguwe', // verified-rw
    reorder_partial: 'Hongewe ibicuruzwa {added}; ibicuruzwa {unavailable} bitaboneka ntibyongewemo.', // verified-rw
    reorder_all_available: 'Hongewe ibicuruzwa {count} hakurikijwe ibihari n’ibiciro biriho ubu.', // verified-rw
    reorder_action: 'Ongera utumize', // verified-rw
    order_invoice: 'Inyemezabwishyu ya komande yo kurangura', // verified-rw
    invoice_status_paid: 'Yishyuwe', // verified-rw
    invoice_status_pending: 'Kwishyura birategerejwe', // verified-rw
    invoice_status_failed: 'Kwishyura ntibyakunze', // verified-rw
    invoice_status_refunded: 'Amafaranga yasubijwe', // verified-rw
    invoice_status_overdue: 'Yarengeje igihe', // verified-rw
    invoice_payment_method: 'Uburyo bwo kwishyura', // verified-rw
    invoice_paid_amount: 'Amafaranga yishyuwe', // verified-rw
    invoice_balance: 'Asigaye', // verified-rw
    invoice_days_overdue: 'Yarengejeho iminsi {count}', // verified-rw
    invoice_not_tax_notice: 'Iyi ni inyemezabwishyu ya komande; ntigaragazwa nk’inyemezabwishyu y’imisoro yo mu Rwanda mu gihe izina ryemewe ry’umucuruzi na TIN bitarashyirwaho.', // verified-rw
    tin_label: 'TIN', // verified-rw
    tax: 'Umusoro', // verified-rw
    retention_title: 'Kugumana abakiriya barangura', // verified-rw
    retention_paid_only_note: 'Amafaranga n’imibare yo kugumana abakiriya bishingira gusa kuri komande zo kurangura zishyuwe kandi zitahagaritswe.', // verified-rw
    retention_paid_customers: 'Abakiriya bafite komande zishyuwe', // verified-rw
    retention_returning: 'Abakiriya bagarutse', // verified-rw
    retention_reorders: 'Kongera gutumiza byarangiye / byageragejwe', // verified-rw
    retention_reorder_conversion: 'Igipimo cyo kongera gutumiza', // verified-rw
    retention_no_churn_policy: 'Nta gihe cyo kwita umukiriya uwahagaritse kugura cyashyizweho; nta mukiriya uhita yitwa ko yahagaritse kugura.', // verified-rw
    accept_terms: 'Emera amabwiriza', // verified-rw
    accept_terms_hint: 'Ugomba kwemera amabwiriza yo kurangura no kwemeza ko amakuru yawe ari ukuri.', // verified-rw
    account_manager: 'Ushinzwe konti yawe', // verified-rw
    additional_notes: 'Andi makuru (si ngombwa)', // verified-rw
    agree_terms: 'Nemeye amabwiriza yo kurangura, harimo komande ntoya n’amabwiriza yo kwishyura.', // verified-rw
    application_id: 'Nimero y’ubusabe', // verified-rw
    application_submitted: 'Ubusabe bwoherejwe! 🎉', // verified-rw
    apply_free: 'Saba nonaha — ni ubuntu', // verified-rw
    apply_online: 'Saba kuri interineti', // verified-rw
    apply_online_desc: 'Uzuza ifishi mu minota 5', // verified-rw
    approved_credit: 'Inguzanyo yo kwishyura mu minsi 30 irahari', // verified-rw
    approved_delivery: 'Kubigeza ibicuruzwa byinshi mbere mu Rwanda hose', // verified-rw
    approved_discount: 'Igabanyirizwa rigera kuri 30% ku bicuruzwa byose', // verified-rw
    approved_invoices: 'Inyemezabwishyu z’umwuga ziriho TIN', // verified-rw
    approved_title: 'Konti yo kurangura yemejwe! 🎉', // verified-rw
    approved_welcome: 'Murakaza neza muri gahunda yo kurangura ya FreedomCosmeticShop!', // verified-rw
    back_info: 'Subira ku makuru yo kurangura', // verified-rw
    back_invoices: 'Subira ku nyemezabwishyu', // verified-rw
    back_store: 'Subira mu iduka', // verified-rw
    bulk_desc: 'Umukozi wihariye agufasha kuri komande nini n’ubusabe bwihariye.', // verified-rw
    bulk_title: 'Ubufasha kuri komande nini', // verified-rw
    business_address: 'Aderesi y’ubucuruzi *', // verified-rw
    business_address_required: 'Aderesi y’ubucuruzi irakenewe', // verified-rw
    business_beauty_salon: '💇 Salon y’ubwiza', // verified-rw
    business_beauty_school: '🎓 Ishuri ry’ubwiza', // verified-rw
    business_details: 'Amakuru y’ubucuruzi', // verified-rw
    business_district: 'Akarere k’ubucuruzi *', // verified-rw
    business_district_required: 'Akarere k’ubucuruzi karakenewe', // verified-rw
    business_hair_salon: '✂️ Salon y’imisatsi', // verified-rw
    business_hotel: '🏨 Hoteli / Lodge', // verified-rw
    business_market_vendor: '🛒 Umucuruzi wo mu isoko', // verified-rw
    business_name: 'Izina ry’ubucuruzi *', // verified-rw
    business_name_required: 'Izina ry’ubucuruzi rirakenewe', // verified-rw
    business_other: '📋 Ibindi', // verified-rw
    business_phone: 'Telefoni y’ubucuruzi *', // verified-rw
    business_phone_required: 'Telefoni y’ubucuruzi irakenewe', // verified-rw
    business_reseller: '📦 Umucuruzi wongera kugurisha', // verified-rw
    business_shop: '🏪 Iduka / Kiyosike', // verified-rw
    business_spa: '🧖 Spa n’imibereho myiza', // verified-rw
    business_type: 'Ubwoko bw’ubucuruzi *', // verified-rw
    check_status: 'Reba aho ubusabe bugeze', // verified-rw
    confirm_accurate: 'Ndemeza ko amakuru yose natanze ari ukuri kandi yuzuye.', // verified-rw
    contact_on: 'Tuzakuvugisha kuri', // verified-rw
    continue_retail: 'Komeza guhaha nk’umukiriya usanzwe', // verified-rw
    credit: 'Inguzanyo', // verified-rw
    credit_available: 'Inguzanyo iboneka', // verified-rw
    credit_desc: 'Gura nonaha wishyure mu minsi 30. Inguzanyo iterwa n’ingano y’ubucuruzi bwawe.', // verified-rw
    credit_title: 'Kwishyura ku nguzanyo', // verified-rw
    credit_usage: 'Inguzanyo yakoreshejwe', // verified-rw
    credit_used: 'Yakoreshejwe: {used} / {limit}', // verified-rw
    dashboard: 'Urubuga rwo kurangura', // verified-rw
    dashboard_failed: 'Urubuga rwo kurangura ntirwashoboye gufunguka.', // verified-rw
    decision: 'Icyemezo', // verified-rw
    discount: 'Igabanyirizwa ryo kurangura', // verified-rw
    discount_desc: 'Zigama kuri buri gicuruzwa ugura byinshi. Uko ugura byinshi ni ko uzigama.', // verified-rw
    discount_title: 'Igabanyirizwa rigera kuri 30%', // verified-rw
    document_upload: 'Inyandiko ntizoherezwa kuri iyi fishi', // verified-rw
    documents_hint: 'Ohereza amakuru y’ubucuruzi gusa. Dushobora gusaba TIN, icyemezo cya RDB, icyemezo cy’ubucuruzi cyangwa icy’umwirondoro wa nyirabwo mu gihe cyo gusuzuma.', // verified-rw
    documents_submit: 'Inyandiko no kohereza', // verified-rw
    due: 'IGOMBA KWISHYURWA', // verified-rw
    due_date: 'Itariki ntarengwa', // verified-rw
    due_on_receipt: 'Yishyurwa wakiriye', // verified-rw
    expected_48: 'Biteganyijwe: mu masaha 48', // verified-rw
    faq_approval_a: 'Tugenzura ubusabe mu masaha 24-48 y’akazi. Uzabona SMS igihe ubusabe bwawe bugenzuwe.', // verified-rw
    faq_approval_q: 'Kwemezwa bifata igihe kingana iki?', // verified-rw
    faq_credit_a: 'Yego. Abemejwe bashobora kwishyura ku nguzanyo y’iminsi 30. Inguzanyo iterwa n’ingano n’amateka y’ubucuruzi.', // verified-rw
    faq_credit_q: 'Kwishyura ku nguzanyo birahari?', // verified-rw
    faq_docs_a: 'Icyemezo cy’ubucuruzi na TIN birafasha ariko si ngombwa. Ushobora gusaba ukoresheje amakuru y’ubucuruzi n’indangamuntu.', // verified-rw
    faq_docs_q: 'Ni izihe nyandiko nkenera?', // verified-rw
    faq_min_a: 'Komande ntoya yo kurangura ni 50,000 RWF. Iziri munsi yaho zibarwa nk’iz’umukiriya usanzwe.', // verified-rw
    faq_min_q: 'Komande ntoya yo kurangura ni angahe?', // verified-rw
    faq_provinces_a: 'Yego. Tugeza mu turere 30 twose. Kigali ni 1,000 RWF naho mu ntara ni 3,000-4,000 RWF.', // verified-rw
    faq_provinces_q: 'Nshobora gutumiza ndi mu ntara?', // verified-rw
    fix_errors: 'Kosora amakosa', // verified-rw
    from: 'Bivuye kuri', // verified-rw
    get_approved: 'Emeza konti', // verified-rw
    get_approved_desc: 'Bona ibiciro byo kurangura n’inguzanyo', // verified-rw
    go_dashboard: 'Jya ku rubuga rwo kurangura', // verified-rw
    heard_0: 'Instagram', // verified-rw
    heard_1: 'Facebook', // verified-rw
    heard_2: 'WhatsApp', // verified-rw
    heard_3: 'Inshuti / uwo dukorana', // verified-rw
    heard_4: 'Nasuye iduka', // verified-rw
    heard_5: 'Radiyo', // verified-rw
    heard_6: 'Igikorwa', // verified-rw
    heard_7: 'Ibindi', // verified-rw
    heard_about: 'Watumenye ute?', // verified-rw
    hero_subtitle: 'Igabanyirizwa rigera kuri 30% · Kuri salon, amaduka n’abacuruzi bo mu turere 30', // verified-rw
    how_works: 'Uko bikora', // verified-rw
    in_review: 'Birimo kugenzurwa', // verified-rw
    invoice: 'Inyemezabwishyu yo kurangura', // verified-rw
    invoice_count: 'Inyemezabwishyu {count}', // verified-rw
    invoices: 'Inyemezabwishyu zo kurangura', // verified-rw
    invoices_desc: 'Inyemezabwishyu ziriho TIN n’amakuru y’ubucuruzi bwawe, zikwiriye ibaruramari n’imisoro.', // verified-rw
    invoices_generated: 'Inyemezabwishyu ikorwa igihe utumije komande yo kurangura.', // verified-rw
    invoices_title: 'Inyemezabwishyu z’umwuga', // verified-rw
    item: 'Igicuruzwa', // verified-rw
    items_added: 'Ibicuruzwa byashyizwe mu gitebo', // verified-rw
    items_from_order: 'Ibicuruzwa {count} byo kuri komande {order}', // verified-rw
    registered_business_cta: 'Saba konti yo kurangura ku bucuruzi bwawe bwanditswe mu Rwanda.', // verified-rw
    login_apply_hint: 'Injira cyangwa wiyandikishe kugira ngo usabe konti yo kurangura.', // verified-rw
    login_required: 'Ugomba kwinjira', // verified-rw
    login_status_hint: 'Injira kugira ngo urebe aho ubusabe bwawe bugeze.', // verified-rw
    loyalty_desc: 'Bona amanota kuri buri komande yo kurangura. Yakoreshe ku igabanyirizwa n’ibicuruzwa by’ubuntu.', // verified-rw
    loyalty_title: 'Ibihembo by’indahemuka', // verified-rw
    manager: 'Ushinzwe kurangura', // verified-rw
    manager_hours: 'Kuwa Mbere–Gatanu, 8AM–6PM CAT', // verified-rw
    minimum_pricing_note: 'Komande ntoya yo kurangura: 50,000 RWF · Ibiciro mu mafaranga y’u Rwanda', // verified-rw
    monthly_order: 'Komande yo mu kwezi iteganyijwe', // verified-rw
    my_invoices: 'Inyemezabwishyu zanjye', // verified-rw
    national_id: 'Nimero y’indangamuntu *', // verified-rw
    national_id_required: 'Indangamuntu irakenewe', // verified-rw
    new_order: 'Komande nshya', // verified-rw
    next_step: 'Intambwe ikurikira', // verified-rw
    no_application: 'Nta busabe bwabonetse', // verified-rw
    no_invoices: 'Nta nyemezabwishyu ziraboneka', // verified-rw
    no_invoices_auto: 'Nta nyemezabwishyu ziraboneka. Zihita zikorwa igihe utumije komande yo kurangura.', // verified-rw
    no_orders: 'Nta komande zo kurangura ziraboneka.', // verified-rw
    not_applied: 'Nturasaba konti yo kurangura.', // verified-rw
    not_approved: 'Ubusabe ntibwemejwe', // verified-rw
    not_approved_hint: 'Ubusabe bwawe bwo kurangura ntibwemejwe muri iki gihe.', // verified-rw
    notes_placeholder: 'Ducuruza muri salon 5 i Kimironko kandi dukeneye ibicuruzwa byinshi buri gihe...', // verified-rw
    order_save: 'Tumiza uzigame!', // verified-rw
    order_save_desc: 'Tumiza byinshi uzigame kugera kuri 30%', // verified-rw
    over_240000: 'Hejuru ya 240,000 RWF', // verified-rw
    owner_details: 'Amakuru ya nyir’ubucuruzi', // verified-rw
    owner_email_optional: 'Imeyili ya nyir’ubucuruzi (si ngombwa)', // verified-rw
    owner_full_name: 'Amazina ya nyir’ubucuruzi *', // verified-rw
    owner_name_required: 'Amazina ya nyir’ubucuruzi arakenewe', // verified-rw
    owner_phone: 'Telefoni ya nyir’ubucuruzi *', // verified-rw
    owner_phone_required: 'Telefoni ya nyir’ubucuruzi irakenewe', // verified-rw
    paid: 'YISHYUWE', // verified-rw
    pay_momo_reference: 'Ishyura kuri MTN MoMo: {phone} · Nimero: {reference}', // verified-rw
    payment_terms: 'Amabwiriza yo kwishyura', // verified-rw
    payment_terms_days: 'Igihe cyo kwishyura: iminsi {days}', // verified-rw
    percent_used: 'Hakoreshejwe {percent}%', // verified-rw
    place_first_order: 'Tumiza komande ya mbere', // verified-rw
    premier_supplier: 'Umucuruzi w’ibicuruzwa by’ubwiza wo kuranguraho mu Rwanda', // verified-rw
    pricing_example: 'Urugero rw’ibiciro byo kurangura', // verified-rw
    pricing_sample_hint: 'Igicuruzwa cy’urugero — igabanyirizwa nyaryo riterwa n’igicuruzwa', // verified-rw
    print_pdf: 'Capisha / PDF', // verified-rw
    priority_desc: 'Kubigeza vuba mu turere 30. Komande zo kurangura zitunganywa mbere.', // verified-rw
    priority_title: 'Kubigeza komande nini mbere', // verified-rw
    program_title: 'Gahunda yo kurangura ya FreedomCosmeticShop', // verified-rw
    qty_12_23: 'Ibice 12 - 23', // verified-rw
    qty_1_5: 'Ibice 1 - 5', // verified-rw
    qty_24_47: 'Ibice 24 - 47', // verified-rw
    qty_48_plus: 'Ibice 48+', // verified-rw
    qty_6_11: 'Ibice 6 - 11', // verified-rw
    questions: 'Ibibazo?', // verified-rw
    questions_whatsapp: 'Ibibazo? WhatsApp', // verified-rw
    quick_reorder: 'Ongera utumize vuba', // verified-rw
    ready_save: 'Witeguye kuzigama kugera kuri 30%?', // verified-rw
    reapply_30: 'Ongera usabe nyuma y’iminsi 30', // verified-rw
    reason: 'Impamvu', // verified-rw
    recent_invoices: 'Inyemezabwishyu ziheruka', // verified-rw
    recent_orders: 'Komande zo kurangura ziheruka', // verified-rw
    registered_rwanda: 'Kurangura biboneka ku bucuruzi bwanditswe mu Rwanda', // verified-rw
    reorder_failed: 'Kongera gutumiza ntibyakunze', // verified-rw
    retail_call_prefix: 'Ushobora gukomeza guhaha nk’umukiriya usanzwe. Ku bibazo, hamagara', // verified-rw
    revenue_0: 'Munsi ya 100,000 RWF', // verified-rw
    revenue_1: '100,000 - 500,000 RWF', // verified-rw
    revenue_2: '500,000 - 1,000,000 RWF', // verified-rw
    revenue_3: '1,000,000 - 5,000,000 RWF', // verified-rw
    revenue_4: 'Hejuru ya 5,000,000 RWF', // verified-rw
    review_24_48: 'Tuzagenzura ubusabe mu masaha 24-48 y’akazi.', // verified-rw
    save_10000: 'Kugera kuri 10,000 RWF', // verified-rw
    save_34000: 'Kugera kuri 34,000 RWF', // verified-rw
    save_96000: 'Kugera kuri 96,000 RWF', // verified-rw
    saved_month: 'Ibyazigamwe uku kwezi', // verified-rw
    sms_confirmation: 'Uzabona SMS yo kwemeza vuba. Tuzongera kukohereza SMS igihe ubusabe bugenzuwe.', // verified-rw
    sms_review_prefix: 'Tuzohereza SMS kuri', // verified-rw
    sms_review_suffix: 'igihe ubusabe bwawe bugenzuwe.', // verified-rw
    start_wholesale: 'Tangira guhaha urangura', // verified-rw
    step_of: 'Intambwe {step} muri 3', // verified-rw
    submission_failed: 'Kohereza ubusabe ntibyakunze', // verified-rw
    submit_application: 'Ohereza ubusabe', // verified-rw
    submitted: 'Byoherejwe', // verified-rw
    submitted_label: 'Byoherejwe', // verified-rw
    submitting: 'Birimo koherezwa...', // verified-rw
    thank_business: 'Murakoze gukorana natwe!', // verified-rw
    tin_optional: 'Nimero ya TIN (si ngombwa)', // verified-rw
    to: 'Kuri', // verified-rw
    total_saved: 'Ibyazigamwe byose', // verified-rw
    total_savings: 'Amafaranga yose yazigamwe', // verified-rw
    under_review: 'Ubusabe burimo kugenzurwa', // verified-rw
    we_review: 'Turabugenzura', // verified-rw
    we_review_desc: 'Tugenzura ubusabe mu masaha 24-48', // verified-rw
    who_apply: 'Ni nde ushobora gusaba?', // verified-rw
    why_join: 'Kuki wakwinjira mu kurangura?', // verified-rw
    years_business: 'Imyaka mu bucuruzi', // verified-rw
    years_count: 'Imyaka {count}', // verified-rw
  },
  pages: {
    acceptable_use: 'Imikoreshereze yemewe', // verified-rw
    address_requirements: 'Amakuru akenewe kuri aderesi', // verified-rw
    address_requirements_text: 'Andika nimero yo mu Rwanda iboneka, intara, akarere, umurenge n’ikimenyetso gisobanutse cy’aho uri. Amakuru atari yo cyangwa atuzuye ashobora gutinza ibicuruzwa no gusaba ikindi kiguzi cyo kubigeza.', // verified-rw
    back_home: 'Subira ahabanza', // verified-rw
    beauty_freedom_brand: 'FreedomCosmeticShop · Ubwisanzure mu bwiza bw’u Rwanda 🇷🇼', // verified-rw
    call_us: 'Duhamagare', // verified-rw
    choice_access: 'Saba kureba cyangwa gukosora amakuru ya konti yawe.', // verified-rw
    choice_contact: 'Twandikire niba ufite ikibazo cyangwa ikirego ku makuru bwite.', // verified-rw
    choice_delete: 'Saba ko konti yawe isibwa igihe amategeko atadusaba kubika amakuru.', // verified-rw
    choice_opt_out: 'Hagarika ubutumwa bwo kwamamaza.', // verified-rw
    collect_delivery: 'Aderesi yo kukugezaho n’amateka ya komande.', // verified-rw
    collect_device: 'Amakuru y’igikoresho, mushakisha, umutekano n’imikoreshereze ya serivisi.', // verified-rw
    collect_identity: 'Amazina, nimero yo mu Rwanda, imeyili itari ngombwa n’amakuru yo kwinjira muri konti.', // verified-rw
    collect_payment: 'Imiterere yo kwishyura n’amakuru y’abatanga serivisi; ntitubika nimero zose z’ikarita cyangwa PIN za Mobile Money.', // verified-rw
    contact_business: 'Vugana na {business}', // verified-rw
    contact_intro: 'Ufite ikibazo ku bicuruzwa, kwishyura, kubigeza, kubisubiza cyangwa kurangura? Abagufasha bo mu Rwanda biteguye kugufasha.', // verified-rw
    contact_orders_notice: 'Dukorera kuri interineti kandi tukageza ibicuruzwa mu Rwanda hose. Banza wemeze n’abagufasha niba ushaka kuza gufata ibicuruzwa.', // verified-rw
    cookies: 'Cookies', // verified-rw
    cookies_text: 'Cookies z’ingenzi zituma konti, igitebo, umutekano no kwishyura bikora. Isesengura ritari ngombwa rikwiye gukora gusa ubyemeye.', // verified-rw
    customer_care: 'Serivisi y’abakiriya', // verified-rw
    damaged_incorrect: 'Ibicuruzwa byangiritse cyangwa bitari byo', // verified-rw
    damaged_incorrect_text: 'Ohereza nimero ya komande, amafoto n’ibisobanuro kuri WhatsApp cyangwa imeyili mu masaha 48. Tumaze kugenzura, tuzabisimbuza, dutange inguzanyo yo mu iduka cyangwa dusubize amafaranga uko bikwiye.', // verified-rw
    delays: 'Gutinda', // verified-rw
    delays_text: 'Ikirere, imihanda, komande nyinshi, iminsi mikuru n’ibindi tutagenzura bishobora guhindura igihe. Abagufasha bazakumenyesha gutinda gukomeye.', // verified-rw
    delivery: 'Kubigeza', // verified-rw
    delivery_confirmation: 'Kwemeza ko ibicuruzwa byagejejwe', // verified-rw
    delivery_confirmation_text: 'Niba bishoboka, genzura ipaki mbere yo kuyakira. Menyesha ibyangiritse bigaragara cyangwa ibicuruzwa bitari byo mu masaha 48. Ntuzigere uha umumotari PIN ya Mobile Money.', // verified-rw
    delivery_fees: 'Ibiciro byo kukugezaho', // verified-rw
    delivery_terms_text: 'Igihe cyo kubigeza ni ikigereranyo kandi gishobora guhinduka kubera ikirere, imihanda, iminsi mikuru cyangwa aderesi ituzuye. Umukiriya aba ashinzwe ibicuruzwa nyuma yo kwemeza ko byagejejwe.', // verified-rw
    email: 'Imeyili', // verified-rw
    error_404: 'Ikosa 404', // verified-rw
    error_safe_hint: 'Ntitwashoboye kurangiza ubwo busabe. Igitebo cyawe n’amakuru ya konti biratekanye.', // verified-rw
    estimated_times: 'Igihe giteganyijwe', // verified-rw
    faq_authentic_a: 'Yego. Ibicuruzwa biva ku bacuruzi babyemerewe n’abatanga ibicuruzwa bagenzuwe. Buri gicuruzwa kigaragaza ikirango n’ibisobanuro. Vugana n’abagufasha niba ushaka kumenya aho igicuruzwa cyihariye cyavuye.', // verified-rw
    faq_authentic_q: 'Ibicuruzwa byanyu ni umwimerere?', // verified-rw
    faq_coupon_a: 'Ibisabwa n’imipaka bigenzurwa mu gihe cyo kwishyura. Seriveri yongera kubara kode yemewe mbere yo kwemeza komande.', // verified-rw
    faq_coupon_q: 'Kode BEAUTY20 iremewe?', // verified-rw
    faq_delivery_a: 'Tugeza ibicuruzwa mu turere 30 twose tw’u Rwanda. Hitamo intara n’akarere mu gihe cyo kwishyura urebe ikiguzi n’igihe nyacyo.', // verified-rw
    faq_delivery_q: 'Mugeza ibicuruzwa he?', // verified-rw
    faq_delivery_time_a: 'Muri Kigali akenshi ni uwo munsi cyangwa iminsi 1–2 y’akazi. Mu zindi ntara akenshi ni iminsi 2–4 y’akazi bitewe n’akarere n’imihanda.', // verified-rw
    faq_delivery_time_q: 'Kubigeza bifata igihe kingana iki?', // verified-rw
    faq_intro: 'Ibyo ukeneye byose kugira ngo ugure kuri FreedomCosmeticShop wizeye.', // verified-rw
    faq_payment_a: 'MTN MoMo ni yo isabwa cyane. Airtel Money, Visa/Mastercard no kwishyura ugejejweho muri Kigali na byo bishobora kuboneka. Ntuzigere usangiza undi PIN ya Mobile Money.', // verified-rw
    faq_payment_q: 'Nakwishyura nte?', // verified-rw
    faq_returns_a: 'Ibicuruzwa bidafunguye kandi bitakoreshejwe bishobora gusubizwa mu minsi 7. Ibikoresho byo kwisiga cyangwa kwita ku mubiri byafunguwe ntibisubizwa kubera isuku, keretse bifite inenge cyangwa atari byo watumije.', // verified-rw
    faq_returns_q: 'Nshobora gusubiza ibikoresho byo kwisiga?', // verified-rw
    faq_tracking_a: 'Koresha nimero ya komande iri mu butumwa bwo kwemeza cyangwa ufungure Ibyo natumije muri konti. Abagufasha bashobora no kugufasha kuri WhatsApp.', // verified-rw
    faq_tracking_q: 'Nkurikirana nte komande?', // verified-rw
    faq_wholesale_a: 'Yego. Salon, spa, amaduka, hoteli n’abacuruzi bashobora gusaba konti yo kurangura. Komande ntoya n’igabanyirizwa bigaragara mu gice cyo kurangura.', // verified-rw
    faq_wholesale_q: 'Mufite ibiciro byo kurangura?', // verified-rw
    fee_east: 'Intara y’Iburasirazuba: 3,500 RWF.', // verified-rw
    fee_kigali: 'Gasabo, Kicukiro na Nyarugenge: 1,000 RWF.', // verified-rw
    fee_north_south: 'Intara y’Amajyaruguru n’Amajyepfo: 3,000 RWF.', // verified-rw
    fee_west: 'Intara y’Iburengerazuba: 4,000 RWF.', // verified-rw
    free_standard_delivery: 'Komande zujuje ibisabwa zirengeje {amount} RWF zigezwa ku buntu.', // verified-rw
    go_home: 'Jya ahabanza', // verified-rw
    help_centre: 'Aho ubufasha buboneka', // verified-rw
    info_collect: 'Amakuru dukusanya', // verified-rw
    info_use: 'Uko dukoresha amakuru', // verified-rw
    legal: 'Amategeko', // verified-rw
    liability_law: 'Inshingano n’amategeko agenga aya mabwiriza', // verified-rw
    liability_law_text: 'Nta kiri muri aya mabwiriza kigabanya uburenganzira amategeko atemera gukuraho. Aya mabwiriza agengwa n’amategeko y’u Rwanda, kandi amakimbirane agomba kubanza kugezwa ku bagufasha kugira ngo ashakirwe igisubizo mu bwumvikane.', // verified-rw
    nationwide_delivery: 'Kubigeza mu Rwanda hose', // verified-rw
    not_found_hint: 'Urupapuro rw’ubwiza ushaka rushobora kuba rwarimuwe, ibicuruzwa byarashize cyangwa ntirwigeze rubaho.', // verified-rw
    order_cancellation_terms: 'Dushobora guhagarika komande ifite ikosa ry’igiciro, ibicuruzwa bitakiboneka, uburiganya bukekwa cyangwa aderesi itemewe.', // verified-rw
    order_confirmation_terms: 'Komande yemezwa nyuma yo kwemeza kwishyura cyangwa kwemera ko wishyura ugejejweho igihe ubyemerewe.', // verified-rw
    orders_pricing: 'Komande n’ibiciro', // verified-rw
    payments: 'Kwishyura', // verified-rw
    payments_text: 'Twemera uburyo bwo kwishyura bugaragara mu gihe cyo kwishyura. Kwemeza Mobile Money n’ikarita bikorwa n’abatanga serivisi babyemerewe. Ntuzigere uha abakozi ba {business} PIN yawe.', // verified-rw
    preparing_beautiful: 'Turimo gutegura ikintu cyiza…', // verified-rw
    prices_rwf: 'Ibiciro byose bigaragazwa mu mafaranga y’u Rwanda (RWF).', // verified-rw
    privacy_intro: 'Iyi politiki isobanura uko {business} ikusanya, ikoresha, irinda kandi isangiza amakuru bwite igihe ugura natwe.', // verified-rw
    privacy_title: 'Politiki y’amakuru bwite', // verified-rw
    products: 'Ibicuruzwa', // verified-rw
    products_terms_text: 'Amabara n’ibipfunyika bishobora gutandukana gato n’amashusho yo kuri ecran. Buri gihe soma ibigize igicuruzwa, amabwiriza n’imiburo. Ibikoresho byo kwisiga si umuti; saba inama y’umuganga ku bibazo by’ubuzima.', // verified-rw
    read_faq: 'Soma ibibazo bikunze kubazwa', // verified-rw
    reference: 'Nimero y’ikibazo', // verified-rw
    refund_timing: 'Igihe cyo gusubizwa amafaranga', // verified-rw
    refund_timing_text: 'Amafaranga yemerewe gusubizwa anyuzwa mu buryo bwakoreshejwe kwishyura iyo bishoboka. Abatanga serivisi bashobora gufata igihe. Ikiguzi cyo kubigeza gisubizwa gusa iyo ikosa ari iryacu cyangwa komande yose yangiwe kubera inenge yemejwe.', // verified-rw
    retention_security: 'Kubika amakuru n’umutekano', // verified-rw
    retention_security_text: 'Tubika amakuru igihe gikenewe gusa kuri serivisi, ibaruramari, gukumira uburiganya n’amategeko. Dukoresha kugenzura abinjira, itumanaho rihishwe, cookies zitekanye n’ubuyobozi bugenzurwa.', // verified-rw
    return_contact_first: 'Vugana n’abagufasha mbere yo kohereza igicuruzwa.', // verified-rw
    return_excluded: 'Ibicuruzwa tutemera gusubizwa', // verified-rw
    return_excluded_clearance: 'Ibicuruzwa byagabanyijwe bya nyuma keretse bifite inenge.', // verified-rw
    return_excluded_damaged: 'Ibicuruzwa byangiritse nyuma yo kubigeza cyangwa byakoreshejwe nabi.', // verified-rw
    return_excluded_opened: 'Ibikoresho byo kwisiga, kwita ku ruhu, imibavu cyangwa kwita ku mubiri byafunguwe, kubera isuku.', // verified-rw
    return_excluded_proof: 'Ibicuruzwa bidafite gihamya y’ubuguzi.', // verified-rw
    return_package_securely: 'Pfunga neza ibicuruzwa byemerewe gusubizwa.', // verified-rw
    return_provide_order: 'Tanga nimero ya komande n’impamvu.', // verified-rw
    return_request: 'Uko usaba gusubiza igicuruzwa', // verified-rw
    return_wait_instructions: 'Tegereza amabwiriza n’uruhushya rwo gusubiza.', // verified-rw
    return_window: 'Igihe cyo gusubiza', // verified-rw
    return_window_text: 'Twandikire mu minsi {days} nyuma yo kubigezwaho. Ibicuruzwa bigomba kuba bidafunguye, bitakoreshejwe, bitangiritse kandi bipfunyitse nk’uko byari biri, keretse byageze bifite inenge cyangwa atari byo.', // verified-rw
    returns_intro: 'Dushaka ko buri komande igera neza kandi itekanye. Twandikire vuba niba hari ikibazo ku byo waguze.', // verified-rw
    returns_title: 'Gusubiza ibicuruzwa n’amafaranga', // verified-rw
    sharing: 'Gusangiza amakuru', // verified-rw
    sharing_text: 'Dusangiza amakuru akenewe gusa n’abatanga serivisi zo kwishyura, kugeza ibicuruzwa, itumanaho, kwakira urubuga n’ubuyobozi igihe amategeko abisaba. Ntabwo tugurisha amakuru bwite.', // verified-rw
    shipping_intro: '{business} igeza ibicuruzwa mu turere 30 twose twa {country}. Ikiguzi kibarwa hashingiwe ku karere mu gihe cyo kwishyura.', // verified-rw
    shipping_title: 'Politiki yo kugeza ibicuruzwa', // verified-rw
    support_hours: 'Amasaha y’ubufasha: {weekdays}; {saturday}; {sunday}. {timezone}.', // verified-rw
    terms_intro: 'Aya mabwiriza agenga kugura no gukoresha {business}. Iyo utumije, wemera gutanga amakuru y’ukuri no gukurikiza aya mabwiriza.', // verified-rw
    terms_title: 'Amabwiriza n’amategeko', // verified-rw
    time_kigali: 'Kigali: uwo munsi aho bishoboka ku batumije mbere ya {cutoff}, naho ubundi iminsi 1–2 y’akazi.', // verified-rw
    time_north_south_east: 'Intara y’Amajyaruguru, Amajyepfo n’Iburasirazuba: hafi iminsi 2–3 y’akazi.', // verified-rw
    time_west: 'Intara y’Iburengerazuba: hafi iminsi 3–4 y’akazi.', // verified-rw
    use_improve: 'Guteza imbere ububiko, ibicuruzwa na serivisi y’abakiriya.', // verified-rw
    use_no_false_reviews: 'Ntugatange ibitekerezo bitari ukuri cyangwa ngo ukoreshe nabi igabanyirizwa.', // verified-rw
    use_no_unauthorized: 'Ntugerageze kwinjira utabyemerewe, gukora uburiganya, gukusanya amakuru mu buryo butemewe cyangwa kubangamira serivisi.', // verified-rw
    use_notifications: 'Kohereza amakuru ya serivisi n’ubutumwa bwo kwamamaza igihe ubyemeye.', // verified-rw
    use_process: 'Gutunganya kwishyura, komande, kubigeza, kubisubiza n’ubufasha.', // verified-rw
    use_protect: 'Kurinda konti no gukumira uburiganya.', // verified-rw
    use_suspension: 'Konti zikoreshwa nabi zishobora guhagarikwa.', // verified-rw
    your_choices: 'Amahitamo yawe', // verified-rw
    your_privacy: 'Amakuru yawe bwite', // verified-rw
  },
  policies: {
    returns_summary: 'Subiza mu minsi 30 niba igicuruzwa gifite inenge cyangwa warahawe icyo utatumije.', shipping_summary: 'Kigali: 1,000 RWF uwo munsi. Mu ntara: 3,000-4,000 RWF mu minsi 2-4.', privacy_summary: 'Turinda amakuru yawe kandi ntituyagurisha abandi.', free_delivery_summary: 'Kubigezwaho ni ubuntu kuri komande irenze 50,000 RWF.', authentic_summary: 'Ibicuruzwa by’umwimerere 100% bituruka ku bacuruzi babyemerewe.', // 🔍 REVIEW
  },
  faq: {
    title: 'Ibibazo bikunze kubazwa', q1: 'Nishyura nte nkoresheje MTN MoMo?', a1: 'Mu gihe cyo kwishyura, hitamo MTN Mobile Money, andika nimero ya MTN itangira 078 cyangwa 079, hanyuma wemeze ubusabe kuri telefoni yawe.', q2: 'Ibyo natumije bizagera ryari?', a2: 'Muri Kigali: uwo munsi iyo watumije mbere ya saa munani. Mu ntara: iminsi 2-4 y’akazi.', q3: 'Ibicuruzwa ni umwimerere?', a3: 'Yego. Twizeza ibicuruzwa by’umwimerere 100% bituruka ku bacuruzi babyemerewe.', q4: 'Nshobora gusubiza igicuruzwa?', a4: 'Yego, mu minsi 30 iyo gifite inenge, cyangiritse cyangwa atari cyo watumije.', q5: 'Nkurikirana nte ibyo natumije?', a5: 'Jya kuri Konti yanjye → Ibyo natumije → Kurikirana komande. Uzajya ubona na SMS.', q6: 'Nakora iki kwishyura na MoMo bitakunze?', a6: 'Ongera ugerageze cyangwa utwandikire kuri WhatsApp. Amafaranga yawe aratekanye.', q7: 'Amakuru yanjye ararinzwe?', a7: 'Yego. Ntabwo dusangira cyangwa tugurisha amakuru yawe. Soma Politiki y’Amakuru Bwite.', q8: 'Mugeza ibicuruzwa mu Rwanda hose?', a8: 'Yego. Tugeza ibicuruzwa mu turere 30 two mu ntara 5 zose.', // 🔍 REVIEW
  },
  loyalty: {
    title: 'Amanota y’indahemuka', balance: 'Amanota yawe: {points}', value: 'Afite agaciro ka {value} RWF', earn: 'Bona amanota {points} kuri buri 1,000 RWF uguze', redeem: 'Koresha amanota', history: 'Amateka y’amanota', earned: 'Yabonetse', used: 'Yakoreshejwe', expires: 'Azarangira ku wa {date}', level_bronze: 'Umunyamuryango wa Bronze', level_silver: 'Umunyamuryango wa Silver', level_gold: 'Umunyamuryango wa Gold', level_vip: 'Umunyamuryango VIP', // 🔍 REVIEW
  },
  bundles: {
    type_routine: 'Gahunda', type_concern: 'Ukurikije ikibazo', type_hair: 'Itsinda ry’umusatsi', type_makeup: 'Itsinda ryo kwisiga', type_gift: 'Impano', type_starter: 'Itsinda ry’abatangira', // verified-rw
    normal_total: 'Igiteranyo gisanzwe', you_save: 'Uzigama', additional_cost: 'Kiruta igiteranyo cyo kugura ukwabyo', bundle_price: 'Igiciro cy’itsinda', // verified-rw
    out_of_stock: 'Hari kimwe cyangwa byinshi mu bicuruzwa birimo bitaboneka.', view_bundle: 'Reba itsinda', all_bundles: 'Amatsinda yose', not_found: 'Itsinda ntiryabonetse.', // verified-rw
    products_included: 'Ibicuruzwa birimo ({count})', optional: 'Si ngombwa', in_stock: 'Birahari', usage_title: 'Uko iyi gahunda ikoreshwa', pricing_breakdown: 'Ibisobanuro by’igiciro', // verified-rw
    add_to_cart: 'Shyira itsinda mu gitebo — {price}', added_to_cart: 'Itsinda ryashyizwe mu gitebo', // verified-rw
    title: 'Gahunda n’amatsinda y’ibicuruzwa', subtitle: 'Ibicuruzwa nyabyo byashyizwe muri gahunda zifatika kandi ibiciro bigaragazwa neza.', // verified-rw
    quiz_title: 'Ntumenya gahunda ikubereye?', quiz_subtitle: 'Subiza ibibazo bitandatu urebe ibyo wagirwaho inama mu bicuruzwa biriho ubu.', quiz_cta: 'Subiza ibibazo', // verified-rw
    filter_label: 'Shungura amatsinda ukurikije ubwoko', filter_all: 'Amatsinda yose', load_failed: 'Amatsinda ntiyashoboye gufunguka.', // verified-rw
    empty: 'Nta matsinda araboneka', empty_hint: 'Amatsinda nyayo azagaragara nyuma y’uko umuyobozi ashyizemo ibicuruzwa n’ibiciro.', // verified-rw
    admin_title: 'Amatsinda na gahunda', admin_count: 'Amatsinda {count}', admin_create: 'Kora itsinda', admin_edit: 'Hindura itsinda', admin_empty: 'Nta matsinda arakorwa.', admin_load_failed: 'Amatsinda ntiyashoboye gufunguka.', // verified-rw
    admin_name: 'Izina', admin_name_rw: 'Izina mu Kinyarwanda', admin_slug: 'Izina rikoreshwa mu murongo', admin_type: 'Ubwoko bw’itsinda', admin_target_category: 'Icyiciro kigenewe', admin_target_concern: 'Ikibazo kigenewe', admin_target_skin: 'Ubwoko bw’uruhu bugenewe', admin_target_hair: 'Ubwoko bw’umusatsi bugenewe', admin_description: 'Ibisobanuro', admin_description_rw: 'Ibisobanuro mu Kinyarwanda', admin_cover: 'Ishusho y’itsinda', admin_products: 'Ibicuruzwa birimo', admin_step_en: 'Izina ry’intambwe', admin_step_rw: 'Izina ry’intambwe mu Kinyarwanda', admin_usage_rw: 'Uko rikoreshwa mu Kinyarwanda', admin_active: 'Rirakora', admin_featured: 'Ryatoranyijwe', admin_sales: 'Ubuguzi {count} bwishyuwe cyangwa bwemejwe', // verified-rw
    admin_required: 'Shyiramo izina, igiciro cyemewe n’igicuruzwa nibura kimwe.', admin_upload_failed: 'Gushyiraho ishusho ntibyakunze.', admin_save_failed: 'Itsinda ntiryashoboye kubikwa.', admin_created: 'Itsinda ryakozwe', admin_updated: 'Itsinda ryahinduwe', admin_delete_confirm: 'Urashaka gusiba {bundle}?', admin_deleted: 'Itsinda ryasibwe', admin_delete_failed: 'Itsinda ntiryashoboye gusibwa.', // verified-rw
  },
  quiz: {
    title: 'Ibibazo byagufasha guhitamo gahunda y’ubwiza', // verified-rw
    step: 'Intambwe {step} muri {total}', // verified-rw
    question_category: 'Ni iki ushaka kwitaho?', // verified-rw
    subtitle_category: 'Turashakisha mu bicuruzwa biri mu bubiko ibishobora kukubera.', // verified-rw
    category_skin: 'Uruhu rwanjye', category_hair: 'Umusatsi wanjye', category_makeup: 'Ibikoresho byo kwisiga', // verified-rw
    question_concern_skin: 'Ikibazo cy’ingenzi cy’uruhu rwawe ni ikihe?', // verified-rw
    question_concern_hair: 'Ikibazo cy’ingenzi cy’umusatsi wawe ni ikihe?', // verified-rw
    question_concern_makeup: 'Ni ibihe bikoresho byo kwisiga ushaka?', // verified-rw
    concern_skin_acne: 'Ibiheri n’utundi tuntu ku ruhu', concern_skin_dark_spots: 'Utubara twijimye', concern_skin_dryness: 'Uruhu rwumye', concern_skin_oiliness: 'Uruhu rugira amavuta', concern_skin_aging: 'Imirongo mito no gusaza kw’uruhu', concern_skin_uneven_tone: 'Ibara ry’uruhu ritaringaniye', concern_skin_pores: 'Utwenge tw’uruhu tugaragara', concern_skin_glow: 'Uruhu rurabagirana', concern_skin_sensitivity: 'Uruhu rworoshye', // verified-rw
    concern_hair_hair_loss: 'Umusatsi ugwa', concern_hair_dryness: 'Umusatsi wumye cyangwa ucika', concern_hair_dandruff: 'Umwanda wo mu mutwe cyangwa kwishimagura', concern_hair_growth: 'Gukura kw’umusatsi', concern_hair_breakage: 'Umusatsi ucika', concern_hair_frizz: 'Umusatsi usatagurika', concern_hair_relaxer: 'Kuworoshya cyangwa kuwugorora', concern_hair_natural: 'Kwita ku musatsi karemano', concern_hair_color: 'Kwita ku musatsi wasizwe irangi', // verified-rw
    concern_makeup_coverage: 'Guhisha neza utubara', concern_makeup_natural_look: 'Kugaragara nk’uwisize bisanzwe', concern_makeup_long_lasting: 'Ibisiga bimara igihe', concern_makeup_eyes: 'Ibikoresho by’amaso', concern_makeup_lips: 'Ibikoresho by’iminwa', concern_makeup_glow: 'Kugaragara urabagirana', concern_makeup_everyday: 'Ibikoreshwa buri munsi', // verified-rw
    question_skin_type: 'Uruhu rwawe ni ubwoko ki?', question_hair_type: 'Umusatsi wawe ni ubwoko ki?', // verified-rw
    question_result: 'Ni iki wifuza kugeraho cyane?', // verified-rw
    result_skin_clear_skin: 'Uruhu rusa n’urufite isuku', result_skin_bright_skin: 'Uruhu rusa n’ururabagirana', result_skin_moisturized: 'Uruhu rutose kandi rworoshye', result_skin_even_tone: 'Ibara risa n’iringaniye', result_skin_youthful: 'Uruhu rusa n’urukomeye kandi rushya', result_skin_smooth: 'Uruhu rusa n’urworoshye', // verified-rw
    result_hair_long_strong: 'Umusatsi usa n’umuremure kandi ukomeye', result_hair_moisturized_soft: 'Umusatsi utose kandi woroshye', result_hair_smooth_shiny: 'Umusatsi woroshye kandi ubengerana', result_hair_defined_curls: 'Imisatsi igunda igaragara neza', result_hair_clean_scalp: 'Umutwe ufite isuku', // verified-rw
    result_makeup_everyday_look: 'Kwisiga bisanzwe buri munsi', result_makeup_full_glam: 'Kwisiga byuzuye', result_makeup_office_look: 'Kwisiga bikwiriye akazi', result_makeup_glowing_skin: 'Kugaragara urabagirana', // verified-rw
    question_budget: 'Ushaka gukoresha amafaranga angahe?', subtitle_budget: 'Ibiciro bishingira ku biri ku rutonde ubu mu mafaranga y’u Rwanda.', // verified-rw
    budget_under5k: 'Munsi ya 5,000 RWF', budget_5k_15k: '5,000–15,000 RWF', budget_15k_50k: '15,000–50,000 RWF', budget_50k_plus: 'Hejuru ya 50,000 RWF', // verified-rw
    question_sensitivity: 'Hari ibicuruzwa umubiri wawe utihanganira?', subtitle_sensitivity: 'Ibyifuzo ntibisimbura inama ya muganga cyangwa iyerekeye allergie.', // verified-rw
    sensitivity_none: 'Nta byo nzi umubiri utihanganira', sensitivity_some: 'Hari bimwe utihanganira', sensitivity_high: 'Umubiri woroshye cyane', // verified-rw
    loading: 'Turimo gushaka ibicuruzwa bihuye...', loading_subtitle: 'Turagenzura ibicuruzwa, ibiciro n’ububiko biriho ubu.', // verified-rw
    results_title: 'Ibyo twakugiriye inama', results_subtitle: 'Bishingiye ku bisubizo byawe n’ibicuruzwa biriho ubu.', // verified-rw
    recommended_bundles: 'Gahunda zihuye n’ibisubizo', recommended_products: 'Ibicuruzwa bihuye n’ibisubizo', restart: 'Subira utangire', view_all: 'Reba ibicuruzwa byose', // verified-rw
    no_results: 'Nta bihuye neza byabonetse', no_results_hint: 'Gerageza ibindi bisubizo cyangwa urebe ibicuruzwa byose.', retry: 'Ongera ugerageze ibibazo', // verified-rw
    sensitivity_notice: 'Kuba nta bitera allergie byanditswe ntibyemeza ko igicuruzwa kitayitera. Soma ibyanditse ku gipfunyika kandi usabe inama y’inzobere igihe bikenewe.', // verified-rw
  },
  skin_types: { OILY: 'Uruhu rugira amavuta menshi', DRY: 'Uruhu rwumye', COMBINATION: 'Uruhu ruvanze', NORMAL: 'Uruhu rusanzwe', SENSITIVE: 'Uruhu rworoshye', ALL: 'Ubwoko bwose bw’uruhu' }, // 🔍 REVIEW
  hair_types: { NATURAL: 'Umusatsi karemano', RELAXED: 'Umusatsi woroshyijwe', WAVY: 'Umusatsi ufite imiraba', CURLY: 'Umusatsi uzengurutse', COILY: 'Umusatsi wisobekeranye cyane', ALL_HAIR: 'Ubwoko bwose bw’umusatsi' }, // verified-rw
} satisfies TranslationShape<EnglishTranslations>

// 🔍 REVIEW: Owner must obtain a fluent Kinyarwanda speaker’s approval before
// exposing these translations to production customers.
