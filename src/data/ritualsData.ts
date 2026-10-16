export interface RitualStep {
  stepNumber: number;
  title: string;
  hindiTitle: string;
  description: string;
  actionGuidance?: string;
}

export interface RitualItem {
  id: string;
  name: string;
  hindiName: string;
  day: 'Mahalaya' | 'Sasthi' | 'Saptami' | 'Ashtami' | 'Sandhi Puja' | 'Navami' | 'Dashami';
  dayHindi: string;
  timings: string;
  tagline: string;
  significance: string;
  significanceHindi: string;
  culturalBackground: string;
  keySamagri: string[];
  sacredMantra: {
    sanskrit: string;
    transliteration: string;
    meaning: string;
  };
  steps: RitualStep[];
  devoteeParticipationTips: string[];
  badgeText?: string;
  colorTheme: {
    gradient: string;
    border: string;
    accent: string;
    glow: string;
  };
}

export const ritualsList: RitualItem[] = [
  {
    id: 'mahalaya-tarpan',
    name: 'Mahalaya & Pitru Tarpan',
    hindiName: 'महालया एवं पितृ तर्पण',
    day: 'Mahalaya',
    dayHindi: 'महालया (देवी पक्ष का आरंभ)',
    timings: 'प्रातः 4:00 AM – 7:30 AM (ब्रह्म मुहूर्त)',
    tagline: 'देवी पक्ष का शुभारंभ व माँ जगदम्बा का धरा पर पावन आह्वान',
    significance:
      'Mahalaya marks the auspicious twilight between Pitru Paksha and Devi Paksha. It is the sacred dawn when devotees honor their departed ancestors through holy Tarpan at sacred river banks, welcoming the arrival of Goddess Durga from Mount Kailash to Earth. Across millions of homes, the soul-stirring radio recitation of Mahishasuramardini (Chandi Path) awakens the festive spirit.',
    significanceHindi:
      'महालया पितृ पक्ष के समापन और देवी पक्ष के शुभ आरंभ का पावन दिन है। इस पवित्र भोर में पूर्वजों को जल और तिल अर्पित कर तर्पण किया जाता है तथा माँ दुर्गा का स्वर्ग से मर्त्यलोक में आगमन होता है। "महिषासुरमर्दिनी" के दिव्य चंडी पाठ की ध्वनि से सम्पूर्ण वातावरण भक्ति और ऊर्जा से भर उठता है।',
    culturalBackground:
      'Legend holds that before descending to Earth, Maa Durga is awakened by the gods invoking Her supreme strength. Birendra Krishna Bhadra\'s iconic resonant voice reciting the Chandi Path on All India Radio since 1931 has become the timeless sonic herald of Durga Puja.',
    keySamagri: [
      'पवित्र गंगाजल अथवा तीर्थ जल',
      'काले तिल एवं कुश (दर्भा)',
      'श्वेत चंदन व लाल पुष्प',
      'यज्ञोपवीत व सुपारी',
      'तर्पण पात्र (ताम्र पात्र)',
    ],
    sacredMantra: {
      sanskrit: 'या देवी सर्वभूतेषु मातृरूपेण संस्थिता। नमस्तस्यै नमस्तस्यै नमस्तस्यै नमो नमः॥',
      transliteration: 'Yā Devī Sarvabhūteṣu Mātṛ-rūpeṇa Saṁsthitā | Namastasyai Namastasyai Namastasyai Namo Namaḥ ||',
      meaning: 'Salutations to the Divine Mother who abides in all living beings as the supreme nurturing mother. Reverence to Her, again and again.',
    },
    badgeText: 'Dawn of Devi Paksha',
    colorTheme: {
      gradient: 'from-[#831843] via-[#701a75] to-[#4a044e]',
      border: 'border-fuchsia-400/40',
      accent: '#f472b6',
      glow: 'rgba(244, 114, 182, 0.3)',
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Dawn Purification & River Snan',
        hindiTitle: 'प्रातः स्नान एवं आत्मशुद्धि',
        description: 'Wake before dawn during Brahma Muhurta, take a holy dip in running sacred waters or river with prayers to Mother Ganga.',
        actionGuidance: 'Devotees wear clean unstitched cotton garments (dhoti/kurta or saree) for purity.',
      },
      {
        stepNumber: 2,
        title: 'Pitru Tarpan Offering',
        hindiTitle: 'कुश व तिल से पितृ तर्पण',
        description: 'Holding sacred Kusha grass rings, offer palmfuls of water blended with black sesame seeds, white flowers, and sandalwood paste to ancestors.',
        actionGuidance: 'Recite ancestral peace mantras three times facing the southern direction.',
      },
      {
        stepNumber: 3,
        title: 'Chandi Path & Stotram Chanting',
        hindiTitle: 'महिषासुरमर्दिनी व चंडी पाठ',
        description: 'Listen to and chant the Mahishasuramardini Stotram and Devi Suktam, vibrating with the supreme victory of light over darkness.',
        actionGuidance: 'Light a ghee lamp before Maa Durga\'s image at home and ring the sacred bell.',
      },
      {
        stepNumber: 4,
        title: 'Welcoming Devi to Pandal',
        hindiTitle: 'माँ दुर्गा का धरा पर आह्वान',
        description: 'Priests and devotees perform the Agamani stuti, inviting the Mother to reside in the pandal sanctum for the upcoming grand festivities.',
      },
    ],
    devoteeParticipationTips: [
      'Rise before 5:00 AM on Mahalaya morning to experience the collective spiritual vibrations.',
      'Perform Tarpan at the Gomti river ghats or donate food (Annadaan) to the underprivileged in memory of ancestors.',
      'Begin setting up domestic devotional altars for the 9 days of Navratri.',
    ],
  },
  {
    id: 'bodhon-kalparambha',
    name: 'Bilva Nimantran, Bodhon & Adhivas',
    hindiName: 'बिल्व निमंत्रण, बोधोन एवं अधिवास (षष्ठी)',
    day: 'Sasthi',
    dayHindi: 'महाषष्ठी (बोधन व नेत्रदान)',
    timings: 'सायंकाल 5:00 PM – 8:00 PM',
    tagline: 'श्रीराम द्वारा माँ का अकाल बोधन एवं दिव्य नेत्रों का अनावरण',
    significance:
      'Maha Sasthi commemorates Lord Rama\'s \'Akalbodhon\' (untimely awakening) of Goddess Durga. Because gods sleep during Dakshinayana (autumn), Lord Rama awakened the Devi prematurely with 108 blue lotuses before battle with Ravana. In this ritual, the Devi is formally awakened under the sacred Bel (Bilva) tree, followed by Kalparambha (solemn pledge) and Chokkhu Daan (painting the divine eyes).',
    significanceHindi:
      'महाषष्ठी के दिन माँ दुर्गा का विधिवत बोधन (जागृति) होता है। पौराणिक मान्यतानुसार मर्यादा पुरुषोत्तम भगवान श्रीराम ने लंका विजय हेतु शरद ऋतु में माँ का अकाल बोधन किया था। इस दिन पवित्र बेल के वृक्ष तले आमंत्रण, कल्पारंभ संकल्प और माँ की प्रतिमा में प्राण फूंकते हुए चक्षु-दान (दिव्य नेत्र अनावरण) की रस्म होती है।',
    culturalBackground:
      'On Sasthi evening, the artisan or senior priest meticulously draws the third eye of Maa Durga (Chokkhu Daan) in pin-drop silence and reverence, infusing celestial vision into the clay sculpture.',
    keySamagri: [
      'बिल्व पत्र (बेलपत्र) एवं बिल्व फल',
      'अधिवास की 27 मांगलिक सामग्रियां (माटी, गोरोचन, सिंदूर आदि)',
      'गंगाजल एवं पंचामृत',
      'काजल (दिव्य नेत्र अंकन हेतु)',
      'लाल चुनरी व रेशमी वस्त्र',
    ],
    sacredMantra: {
      sanskrit: 'ॐ बिल्ववृक्ष महाभाग सदा त्वं शङ्करप्रियः। गृहाण मयि या पूजां दुर्गायाश्च सुखावहम्॥',
      transliteration: 'Om Bilva-vṛkṣa Mahābhāga Sadā Tvaṁ Śaṅkara-priyaḥ | Gṛhāṇa Mayi Yā Pūjāṁ Durgāyāśca Sukhāvaham ||',
      meaning: 'O noble Bilva tree, ever dear to Lord Shiva, kindly accept our worship and convey our prayers to Goddess Durga for universal peace and prosperity.',
    },
    badgeText: 'Awakening of Devi',
    colorTheme: {
      gradient: 'from-[#991b1b] via-[#7f1d1d] to-[#450a0a]',
      border: 'border-red-400/40',
      accent: '#f87171',
      glow: 'rgba(248, 113, 113, 0.3)',
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Kalparambha Resolution',
        hindiTitle: 'कल्पारंभ संकल्प',
        description: 'The head priest takes a formal vow (Sankalpa) on behalf of the entire community to perform the Durga Puja rituals strictly following Vedic and Tantric scriptures.',
      },
      {
        stepNumber: 2,
        title: 'Bilva Nimantran under Sacred Tree',
        hindiTitle: 'बिल्व वृक्ष तले आमंत्रण',
        description: 'A twig of the Bilva tree with twin fruits is sanctified with mantras, symbolizing the divine abode where the Goddess temporarily awakens.',
      },
      {
        stepNumber: 3,
        title: 'Adhivas (27 Auspicious Touch Blessings)',
        hindiTitle: 'अधिवास संस्कार (27 मांगलिक वस्तुएं)',
        description: '27 auspicious elements including earth from 7 places, holy conch water, sandalwood, jewels, and cereals are gently touched to the Goddess idol to sanctify Her physical form.',
      },
      {
        stepNumber: 4,
        title: 'Chokkhu Daan (Opening of the Third Eye)',
        hindiTitle: 'चक्षु-दान (दिव्य दृष्टि समर्पण)',
        description: 'With solemn conch blowing and chants, the supreme artist or head priest paints the pupils and third eye of Maa Durga, awakening Her gaze upon the universe.',
      },
    ],
    devoteeParticipationTips: [
      'Attend the evening Bodhon aarti to witness the grand unveiling of the deity face.',
      'Offer fresh bilva patra (three-leaf clusters) at the pandal altar.',
      'Fast until the evening Bodhon completes if observing Navratri Vrata.',
    ],
  },
  {
    id: 'nabapatrika-saptami',
    name: 'Nabapatrika Pravesh & Maha Snan',
    hindiName: 'नवपत्रिका प्रवेश एवं महासप्तमी महास्नान',
    day: 'Saptami',
    dayHindi: 'महासप्तमी (केला बहू प्रवेश व प्राण-प्रतिष्ठा)',
    timings: 'प्रातः 6:00 AM – 9:30 AM',
    tagline: 'प्रकृति स्वरूपा नौ औषधियों में देवी का वास व महास्नान',
    significance:
      'Maha Saptami initiates the formal core puja with the ceremonial entry of \'Nabapatrika\' (colloquially known as Kola Bou / Plantain Bride). Nine sacred plants (Banana, Turmeric, Bel, Pomegranate, Ashoka, Mana, Arum, Jayanti, and Paddy) are tied with the yellow-flowered Aparajita creeper, representing the Nine Forms of Devi (Navadurga) and sanctifying Nature as the Mother Goddess.',
    significanceHindi:
      'महासप्तमी पर नवपत्रिका (केला बहू) का पावन प्रवेश होता है। नौ दिव्य पौधों (केला, हल्दी, बेल, अनार, अशोक, मानक, कचु, जयंती व धान) को एक साथ बांधकर पवित्र नदी में स्नान कराया जाता है और पीले-लाल किनारे की साड़ी पहनाकर गणेश जी के समीप स्थापित किया जाता है। इसके पश्चात दर्पण प्रतिबिंब के माध्यम से माँ का अष्ट-तीर्थ महास्नान होता है।',
    culturalBackground:
      'Nabapatrika embodies the ancient agrarian and eco-theological roots of Durga Puja, recognizing that the Earth, crops, medicines, and vegetation are all living physical manifestations of the Divine Mother.',
    keySamagri: [
      'नवपत्रिका (9 पावन पौधे)',
      'पीली-लाल बॉर्डर वाली सुती साड़ी',
      'अष्ट-धातु का दर्पण (कांसा/चांदी का शीशा)',
      '8 कुओं, 8 समुद्रों व नदियों का पावन जल',
      'पंचगव्य, पंचामृत एवं कमल पुष्प',
    ],
    sacredMantra: {
      sanskrit: 'नवपत्रिकावासिन्यै दुर्गायै देव्यै नमः। सर्वमंगल मांगल्ये शिवे सर्वार्थ साधिके॥',
      transliteration: 'Navapatrikāvāsinyai Durgāyai Devyai Namaḥ | Sarva-maṅgala Māṅgalye Śive Sarvārtha Sādhike ||',
      meaning: 'Salutations to Goddess Durga residing in the nine botanical manifestations. To the all-auspicious Mother who fulfills every noble aspiration.',
    },
    badgeText: 'Eco-Spiritual Consecration',
    colorTheme: {
      gradient: 'from-[#065f46] via-[#047857] to-[#064e3b]',
      border: 'border-emerald-400/40',
      accent: '#34d399',
      glow: 'rgba(52, 211, 153, 0.3)',
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Morning Snan at River/Water Reservoir',
        hindiTitle: 'नवपत्रिका का पावन नदी स्नान',
        description: 'Before sunrise, the nine bundled plants are carried in solemn procession to the river or consecrated water tank for a sacred bath.',
      },
      {
        stepNumber: 2,
        title: 'Draping with Saree & Vermilion',
        hindiTitle: 'पारंपरिक वस्त्र धारण व सिंदूर लेपन',
        description: 'The Nabapatrika is draped in a vibrant yellow saree with red borders, adorned with vermilion (sindoor), and carried back on the priest’s right shoulder.',
      },
      {
        stepNumber: 3,
        title: 'Placement beside Lord Ganesha',
        hindiTitle: 'गणेश जी के समीप स्थापना',
        description: 'She is consecrated on the wooden platform right next to Lord Ganesha, often fondly revered as the celestial mother/consort in folk devotion.',
      },
      {
        stepNumber: 4,
        title: 'Prana Pratishtha & Mirror Maha Snan',
        hindiTitle: 'प्राण प्रतिष्ठा व दर्पण महास्नान',
        description: 'The reflection of Maa Durga is cast upon a polished brass mirror placed in a large silver vessel. Priests bathe this sacred reflection with herbal oils, coconut water, turmeric, cane juice, and water from 7 oceans.',
      },
    ],
    devoteeParticipationTips: [
      'Join the morning Nabapatrika procession with dhol and kashor ghanta.',
      'Receive the consecrated snan jal (holy bath water) as divine charanamrita.',
      'Wear festive traditional attire to receive Saptami morning blessings.',
    ],
  },
  {
    id: 'maha-ashtami-pushpanjali',
    name: 'Maha Ashtami, Pushpanjali & Kumari Puja',
    hindiName: 'महाष्टमी, पुष्पांजलि एवं कुमारी पूजा',
    day: 'Ashtami',
    dayHindi: 'महाष्टमी (पुष्पांजलि व कुमारी पूजा)',
    timings: 'प्रातः 9:00 AM – 1:00 PM',
    tagline: 'माँ का साक्षात विग्रह, 3 चरणों में पुष्पांजलि व नन्ही देवियों की पूजा',
    significance:
      'Maha Ashtami is the spiritual crescendo of the festival. Millions of devotees observe a strict fast to offer Pushpanjali (floral surrender) in three sacred cycles with freshly plucked red hibiscus and lotus petals. At midday, Kumari Puja is celebrated, where young girls are worshipped as living incarnations of Maa Durga, recognizing divine feminine power in every woman and child.',
    significanceHindi:
      'महाष्टमी दुर्गा पूजा का सर्वाधिक पावन एवं ऊर्जावान दिन है। भक्तजन निर्जला अथवा फलाहार व्रत रखकर तीन चरणों में पुष्पांजलि अर्पित करते हैं। दोपहर में "कुमारी पूजा" की जाती है जिसमें छोटी कन्याओं को साक्षात माँ जगदम्बा का रूप मानकर उनके चरण पखार कर चुनरी, आभूषण व भोग अर्पित किए जाते हैं।',
    culturalBackground:
      'Swami Vivekananda revitalized the Kumari Puja tradition in 1898 at Belur Math, emphasizing the universal reverence for womanhood and pristine purity as the purest vehicle of the Divine Mother.',
    keySamagri: [
      'लाल अड़हुल (जावा/जपा कुसुम) एवं कमल',
      'बिल्व पत्र एवं दुर्वा घास',
      'रोली, चंदन व अक्षत',
      'कुमारी कन्या हेतु नवीन लाल वस्त्र, चुनरी व पायल',
      'महाप्रसाद व हलवा-पूरी-चना भोग',
    ],
    sacredMantra: {
      sanskrit: 'महिषघ्नि महामाये चामुण्डे मुण्डमालिनि। आयुरारोग्यमैश्वर्यं देहि देवि नमोऽस्तु ते॥',
      transliteration: 'Mahiṣaghni Mahāmāye Cāmuṇḍe Muṇḍamālini | Āyur-ārogyam-aiśvaryaṁ Dehi Devi Namo\'stu Te ||',
      meaning: 'O Slayer of Mahishasura, Great Illusion, O Chamunda garlanded with wisdom! Bestow upon us longevity, radiant health, righteous prosperity and peace.',
    },
    badgeText: 'Highest Sacred Attendance',
    colorTheme: {
      gradient: 'from-[#b45309] via-[#92400e] to-[#78350f]',
      border: 'border-amber-400/40',
      accent: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.35)',
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Devotee Fasting & Floral Preparation',
        hindiTitle: 'व्रत संकल्प एवं पुष्प चयन',
        description: 'Devotees gather at the pandal holding fresh hibiscus flowers, bael leaves, and sandalwood in their cupped palms (Anjali mudra).',
      },
      {
        stepNumber: 2,
        title: 'Three-Cycle Chanting of Pushpanjali',
        hindiTitle: 'त्रि-चरणीय पुष्पांजलि श्लोक पाठ',
        description: 'Guided by the priest’s voice, all devotees chant the sacred Ashtami stotram three times, throwing flowers at the feet of Maa Durga after each round.',
      },
      {
        stepNumber: 3,
        title: 'Worship of the Divine Kumari',
        hindiTitle: 'कुमारी कन्या का पावन पाद्य-पूजन',
        description: 'A young prepubescent girl is seated on a decorated throne; Her feet are washed with rose water, decorated with alta (red dye), and adorned with garlands.',
      },
      {
        stepNumber: 4,
        title: 'Maha Aarti & Distribution of Bhog',
        hindiTitle: 'महाआरती एवं भोग वितरण',
        description: 'A majestic 108-wick camphor and ghee aarti is performed as shankha and brass ghanta resonate throughout the pandal.',
      },
    ],
    devoteeParticipationTips: [
      'Arrive early before 9:30 AM to secure a spot for the synchronized Pushpanjali.',
      'Touch the holy lotus petals before offering them with pure devotion.',
      'Seek blessings from the young Kumari kanya after the ceremony.',
    ],
  },
  {
    id: 'sandhi-puja-108-diyas',
    name: 'Sandhi Puja & 108 Diyas',
    hindiName: 'संधि पूजा एवं 108 दीप प्रज्वलन',
    day: 'Sandhi Puja',
    dayHindi: 'संधि पूजा (अष्टमी-नवमी का संधि काल)',
    timings: 'अष्टमी के अंतिम 24 मिनट व नवमी के प्रथम 24 मिनट (कुल 48 मिनट)',
    tagline: 'चामुंडा रूप का प्राकट्य, 108 नीलकमल व 108 घी के दीपों की महापूजा',
    significance:
      'Sandhi Puja is the cosmic pinnacle and most intensely powerful 48 minutes of Durga Puja. It occurs at the exact astronomical juncture when Maha Ashtami transitions into Maha Navami. According to the Devi Mahatmya, this was the exact cosmic moment when the fearsome Goddess Chamunda sprang from the furrowed brow of Maa Durga to annihilate the demon lords Chanda and Munda.',
    significanceHindi:
      'संधि पूजा सम्पूर्ण दुर्गा पूजा का सर्वाधिक शक्तिशाली व अलौकिक 48 मिनट का कालखंड है। जब अष्टमी तिथि के अंतिम 24 मिनट और नवमी तिथि के प्रारंभिक 24 मिनट मिलते हैं, तब यह पूजा होती है। इस समय माँ दुर्गा के ललाट से साक्षात महाकाली/चामुंडा का प्राकट्य हुआ था जिन्होंने चंड और मुंड का संहार किया। यहाँ 108 नीलकमल और 108 मिट्टी के दीप प्रज्वलित किए जाते हैं।',
    culturalBackground:
      'During Sandhi Puja, pin-drop silence is maintained followed by an explosive crescendo of dhak rhythms and 108 conch shells when the final 108th lamp is lit.',
    keySamagri: [
      '108 मिट्टी के अखंड दीये व शुद्ध देसी घी',
      '108 नीले अथवा लाल कमल पुष्प (नीलकमल)',
      '108 बेलपत्र की माला',
      'कद्दू/खीरा/गन्ना (अहिंसक फल बलि हेतु)',
      'कपूर, गुग्गुल एवं हवन सामग्री',
    ],
    sacredMantra: {
      sanskrit: 'ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे। ॐ जयंती मंगला काली भद्रकाली कपालिनी॥',
      transliteration: 'Om Aiṁ Hrīṁ Klīṁ Cāmuṇḍāyai Vicce | Om Jayantī Maṅgalā Kālī Bhadrakālī Kapālinī ||',
      meaning: 'Salutations to the Supreme Goddess Chamunda who destroys all sorrow and delusion. All glories to Kali, Bhadrakali, and Mangala who illuminate the cosmos.',
    },
    badgeText: 'Most Sacred 48 Minutes',
    colorTheme: {
      gradient: 'from-[#7c2d12] via-[#ea580c] to-[#9a3412]',
      border: 'border-orange-400/50',
      accent: '#fb923c',
      glow: 'rgba(251, 146, 60, 0.4)',
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Precision Astronomical Countdown',
        hindiTitle: 'संधि मुहूर्त का सटीक आगमन',
        description: 'Priests calculate the exact minute when Ashtami ends and Navami begins using astronomical panchang.',
      },
      {
        stepNumber: 2,
        title: 'Lighting 108 Terracotta Ghee Lamps',
        hindiTitle: '108 मिट्टी के दीपों का प्रज्वलन',
        description: 'Volunteers and devotees carefully arrange and light 108 earthen lamps in rows before the sanctum sanctorum.',
      },
      {
        stepNumber: 3,
        title: 'Offering 108 Lotus Blossoms',
        hindiTitle: '108 नीलकमल का चरण अर्पण',
        description: 'One by one, 108 fresh lotuses are offered along with 108 distinct sacred incantations.',
      },
      {
        stepNumber: 4,
        title: 'Phal Bali & Fierce Maha Aarti',
        hindiTitle: 'फल बलि एवं प्रचंड महाआरती',
        description: 'A symbolic non-violent sacrifice of ash gourd (chalkumro) or sugarcane is made, followed by an electrifying aarti with deafening dhak beats.',
      },
    ],
    devoteeParticipationTips: [
      'Devotees should stand with folded hands and deep silence as the 108 lamps ignite.',
      'Sponsor a ghee diya for personal family prosperity and health.',
      'Experience the thrilling synchronization of the Dhak drums during the final seconds.',
    ],
  },
  {
    id: 'maha-navami-dhunuchi',
    name: 'Maha Navami Homa & Dhunuchi Dance',
    hindiName: 'महानवमी महायज्ञ, भोग एवं धुनुची नृत्य',
    day: 'Navami',
    dayHindi: 'महानवमी (नवमी हवन व धुनुची नाच)',
    timings: 'अपराह्न 12:00 PM (हवन) एवं सायं 7:00 PM (धुनुची नृत्य)',
    tagline: 'अधर्म पर धर्म की पूर्ण विजय, पवित्र यज्ञ की आहुति व उल्लासमय नृत्य',
    significance:
      'Maha Navami marks the day when Goddess Durga slew Mahishasura in epic cosmic battle. The day begins with a grand Maha Homa (fire sacrifice) purifying the environment, followed by royal Maha Bhog (56 delicacies). In the evening, devotees perform the ecstatic \'Dhunuchi Naach\', holding smoking clay censers with burning coconut husk and frankincense to rhythmic percussion.',
    significanceHindi:
      'महानवमी पर असुरों पर माँ भगवती की अंतिम विजय का उत्सव मनाया जाता है। दोपहर में पवित्र नवमी हवन की पूर्णाहुति होती है तथा माँ को 56 प्रकार का महाभोग अर्पित किया जाता है। संध्या काल में युवा और वृद्ध सभी मिट्टी की धुनुची में धूप व कपूर जलाकर ढाक की तीव्र थाप पर भक्तिमय धुनुची नृत्य करते हैं।',
    culturalBackground:
      'Dhunuchi Naach is not merely a dance; it is an offering of pure fiery surrender and victory energy. Dancers often balance the burning clay censer in their hands, teeth, and on their foreheads.',
    keySamagri: [
      'मिट्टी की धुनुची (धूपदानी)',
      'सूखा नारियल का छिलका (क्वायर) व कपूर',
      'गुग्गुल, लोबान एवं शुद्ध धूप',
      'हवन कुंड, समिधा (आम की लकड़ी) व शुद्ध घी',
      'महाभोग (भोग की खिचड़ी, लाबड़ा, पायेश, रसगुल्ला)',
    ],
    sacredMantra: {
      sanskrit: 'ॐ शरणागत दीनार्त परित्राण परायणे। सर्वस्यार्तिहरे देवि नारायणि नमोऽस्तु ते॥',
      transliteration: 'Om Śaraṇāgata Dīnārta Paritrāṇa Parāyaṇe | Sarvasyārti-hare Devi Nārāyaṇi Namo\'stu Te ||',
      meaning: 'O Goddess Narayani, who is ever intent on saving the afflicted and surrendered souls, remover of all earthly sufferings, we bow down to You!',
    },
    badgeText: 'Celebration of Triumph',
    colorTheme: {
      gradient: 'from-[#6b21a8] via-[#581c87] to-[#3b0764]',
      border: 'border-purple-400/40',
      accent: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.35)',
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Navami Maha Homa & Purnahuti',
        hindiTitle: 'नवमी महायज्ञ एवं पूर्णाहुति',
        description: 'A large sacred fire altar is set up; priests offer ghee, samidha, and dry fruits while reciting the 700 verses of the Durga Saptashati.',
      },
      {
        stepNumber: 2,
        title: 'Royal Maha Bhog Offering',
        hindiTitle: 'राजसी महाभोग अर्पण',
        description: 'Traditional aromatic Khichuri, 5 kinds of fried vegetables, mixed curry (Labra), tomato-date chutney, and Bengali Payesh are offered to Devi.',
      },
      {
        stepNumber: 3,
        title: 'Lighting the Sacred Dhunuchi',
        hindiTitle: 'धुनुची में अग्नि व धूप प्रज्वलन',
        description: 'Fragrant frankincense (dhuno) and camphor are placed on glowing coconut husk inside porous clay censers, creating sweet-scented white smoke.',
      },
      {
        stepNumber: 4,
        title: 'Ecstatic Dhunuchi Dance to Dhak Rhythm',
        hindiTitle: 'ढाक की गूंज पर धुनुची नृत्य',
        description: 'Devotees of all ages dance in unison with fluid, rhythmic steps before Maa Durga, expressing supreme devotion and fearlessness.',
      },
    ],
    devoteeParticipationTips: [
      'Take part in the community Bhog distribution at lunch.',
      'Watch or participate in the Dhunuchi Naach competition in the evening.',
      'Collect holy homa bhasma (sacred fire ash) to apply as a protective tilak.',
    ],
  },
  {
    id: 'vijayadashami-sindoor-khela',
    name: 'Vijayadashami, Sindoor Khela & Visarjan',
    hindiName: 'विजयादशमी, सिन्दूर खेला एवं विसर्जन',
    day: 'Dashami',
    dayHindi: 'विजयादशमी (सिन्दूर खेला व माँ का विसर्जन)',
    timings: 'अपराह्न 1:00 PM (सिन्दूर खेला) – सायं 6:00 PM (विसर्जन)',
    tagline: 'अश्रुपूर्ण भावभीनी विदाई, सिन्दूर खेला, विसर्जन व शुभो बिजया',
    significance:
      'Vijayadashami commemorates the ultimate victory of righteousness and the bittersweet departure of Maa Durga as She returns to Mount Kailash with Her divine children. Married women perform \'Devi Boron\' offering betel leaf and sweets, followed by \'Sindoor Khela\', anointing Maa\'s forehead and each other with red vermilion for marital bliss. Finally, the idols are immersed in water, dissolving into cosmic consciousness.',
    significanceHindi:
      'विजयादशमी माँ दुर्गा की विदाई का भावुक व पावन दिवस है। मायके से ससुराल (कैलाश पर्वत) लौटती माँ का सुहागिन महिलाएं पान व संदेश से वरण करती हैं और एक-दूसरे को लाल सिंदूर लगाकर अखंड सौभाग्य की कामना करती हैं। दर्पण विसर्जन के बाद पवित्र नदी में प्रतिमा का विसर्जन होता है और "शुभो बिजया" के साथ बड़ों का आशीर्वाद लिया जाता है।',
    culturalBackground:
      'The word \'Visarjan\' means expansion into infinity. When the clay idol dissolves into water, it symbolizes that God is not confined to one structure, but permeates every droplet of the cosmos until next year\'s arrival ("Asche bochhor abar hobe").',
    keySamagri: [
      'शुद्ध लाल सिंदूर (वर्मीलियन)',
      'ताजे पान के पत्ते एवं सुपारी',
      'पारंपरिक संदेश / मिष्टी (बंगाली मिठाइयां)',
      'जल से भरा ताम्र पात्र (दर्पण विसर्जन हेतु)',
      'शान्ति जल छिड़काव हेतु आम्रपल्लव',
    ],
    sacredMantra: {
      sanskrit: 'गच्छ गच्छ परं स्थानं स्वस्थानं देवि चण्डिके। यत्पूजितं मया भक्त्या परिपूर्णं तदस्तु मे॥',
      transliteration: 'Gaccha Gaccha Paraṁ Sthānaṁ Svasthānaṁ Devi Caṇḍike | Yat-pūjitaṁ Mayā Bhaktyā Paripūrṇaṁ Tad-astu Me ||',
      meaning: 'Depart, O Divine Mother Chandika, to Your supreme abode on Mount Kailash. May whatever little worship we offered with love and devotion be made complete by Your infinite grace.',
    },
    badgeText: 'Divine Farewell & Renewal',
    colorTheme: {
      gradient: 'from-[#881337] via-[#9f1239] to-[#4c0519]',
      border: 'border-rose-400/40',
      accent: '#fb7185',
      glow: 'rgba(251, 113, 133, 0.35)',
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Darpan Visarjan (Mirror Release)',
        hindiTitle: 'दर्पण विसर्जन संस्कार',
        description: 'The sacred brass mirror is submerged in a bowl of sanctified water, spiritually releasing the divine presence from the clay idol into the water element.',
      },
      {
        stepNumber: 2,
        title: 'Devi Boron & Sweet Offering',
        hindiTitle: 'माँ का वरण एवं संदेश समर्पण',
        description: 'Women circle betel leaves in front of Maa Durga, wipe Her face with a betel leaf, feed Her delicious sweets, and place sindoor on Her forehead.',
      },
      {
        stepNumber: 3,
        title: 'Sindoor Khela (Vermilion Revelry)',
        hindiTitle: 'उल्लासमय सिन्दूर खेला',
        description: 'Women joyfully smear scarlet vermilion on each other’s faces and conch bangles (shakha-pola), celebrating divine shakti and sisterhood.',
      },
      {
        stepNumber: 4,
        title: 'Grand Immersion Procession & Shanti Jal',
        hindiTitle: 'शोभायात्रा, विसर्जन एवं शांति जल',
        description: 'With shouts of "Bolo Durga Mai Ki Jai", idols are carried to the river ghat for immersion. Priests bring back sanctified Shanti Jal to sprinkle on devotees.',
      },
    ],
    devoteeParticipationTips: [
      'Women can wear the traditional red-bordered white garad or silk saree for Sindoor Khela.',
      'Touch the feet of elders to seek blessings for "Shubho Bijoya" / "विजयादशमी".',
      'Receive the consecrated Shanti Jal sprinkled on the head for good health and protection.',
    ],
  },
];
