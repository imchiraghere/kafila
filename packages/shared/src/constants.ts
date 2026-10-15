import { Mudda } from './types';

export const TAU = Math.PI * 2;
export const WORLD_SIZE = 6000;
export const DT = 1 / 30;
export const TICK_MS = 1000 / 30;

export const CP = { x: 3000, y: 2000 };
export const JM = { x: 3300, y: 2950, r: 150 };
export const ZONE = { x: 3300, y: 2950, R: 340 };

export const SPEED = {
  P: 150,
  C: 150,
  sprint: 1.45,
};

export const MUDDAS: Mudda[] = [
  {
    k: 'paper',
    n: 'Paper Leak',
    e: '📚',
    c: '#1565c0',
    sl: ['NO PAPER|LEAK!', 'EXAM|BACHAO', 'RE-EXAM|KARAO'],
    ch: ['Paper leak band karo!', 'Hamara saal wapas do!', 'Exam bachao, desh bachao!']
  },
  {
    k: 'jobs',
    n: 'Berozgari',
    e: '💼',
    c: '#6a1b9a',
    sl: ['NAUKRI|DO', 'DEGREE HAI|JOB NAHI', 'VACANCY|KAB?'],
    ch: ['Naukri do, jumla nahi!', 'PhD kiya, ab pakode tal raha hoon!', 'Vacancy nikalo!']
  },
  {
    k: 'e20',
    n: 'E20 Petrol',
    e: '⛽',
    c: '#2e7d32',
    sl: ['MILEAGE|WAPAS DO', 'E20|NAHI CHAHIYE', 'ENGINE|BACHAO'],
    ch: ['Mileage wapas do!', 'Meri bike ko ganne ka juice mat pilao!', 'E20 hatao, engine bachao!']
  },
  {
    k: 'vote',
    n: 'Vote Chori',
    e: '🗳️',
    c: '#ad1457',
    sl: ['MERA VOTE|KAHAN?', 'VOTER LIST|DIKHAO', 'NAAM|KATA KYUN?'],
    ch: ['Mera naam list se gayab!', 'Vote hamara, list tumhari?', 'Dadaji ko list se mat hatao!']
  },
  {
    k: 'aqi',
    n: 'Saans (AQI)',
    e: '😷',
    c: '#607d8b',
    sl: ['SAANS|LENE DO', 'AQI|999?!', 'HAWA|SAAF KARO'],
    ch: ['Saans lene do!', 'Hawa saaf karo!', 'Mask pehen ke naara laga raha hoon!']
  },
  {
    k: 'msp',
    n: 'MSP',
    e: '🌾',
    c: '#f9a825',
    sl: ['MSP|GUARANTEE', 'KISAN|EKTA', 'FASAL KA|DAAM DO'],
    ch: ['MSP ki guarantee do!', 'Kisan ekta zindabad!', 'Fasal ka daam do!']
  },
  {
    k: 'pension',
    n: 'Purani Pension',
    e: '👴',
    c: '#795548',
    sl: ['PURANI|PENSION', 'OPS|BAHAAL KARO', 'BUDHAPE KA|SAHARA'],
    ch: ['Purani pension bahaal karo!', '35 saal naukri ki, pension do!', 'Budhape ka sahara chahiye!']
  },
  {
    k: 'roads',
    n: 'Gaddhe',
    e: '🕳️',
    c: '#5d4037',
    sl: ['GADDHE|BHARO', 'ROAD YA|POOL?', 'SADAK|DO'],
    ch: ['Gaddhe bharo!', 'Har baarish mein Venice ban jaata hai!', 'Road tax diya, gaddha mila!']
  },
  {
    k: 'price',
    n: 'Mehngai',
    e: '🍅',
    c: '#d32f2f',
    sl: ['TAMATAR|₹200?!', 'CYLINDER|SASTA KARO', 'MEHNGAI|DAAYAN'],
    ch: ['Tamatar sasta karo!', 'Cylinder ₹1100? Sach mein?', 'Mehngai daayan khaaye jaat hai!']
  }
];

export const NEWS = [
  'Section 163 imposed around Jantar Mantar; pigeons asked to show permission letter',
  'Mobile internet suspended in central Delhi; WhatsApp uncles report withdrawal symptoms',
  'DMRC shuts 6 stations "for your convenience"; auto fares triple instantly',
  'Paper leak probe report also leaked, officials confirm',
  'Voter roll revision: man finds his name deleted, late grandfather\'s added twice',
  'Gen Z protesters bring power banks; police bring concrete blocks',
  'Concrete block industry reports best quarter since 2020',
  'Detained protesters sing in DTC bus; driver requests encore',
  'Burari Ground now has more detained protesters than residents',
  'Delivery app launches "10-minute delivery to Jantar Mantar"; riders stuck at barricade since Tuesday',
  'Coaching centre launches "Andolan Crash Course": fees ₹1.5 lakh, detention guaranteed',
  'Committee formed to study why the previous committee was formed',
  'Chai at Jantar Mantar now ₹20; protesters demand MSP for chai',
  'Street dogs of Sansad Marg declare neutrality, accept biscuits from both sides',
  'Tear gas shells found past expiry date; protesters file consumer complaint',
  'Two police barricades spotted together; scientists suspect they are breeding',
  'Prime-time anchor shouts so loud that Noida hears it without a TV',
  'Ministry clarifies there is no unemployment, only "pre-employment"',
  'Exam postponed again; students asked to revise their motivation',
  'Uncle explains entire protest on family WhatsApp using one forwarded image',
  'Auto driver agrees to go by meter; scientists call it a miracle',
  'Protest permission app crashes after 3 users; minister blames Wi-Fi',
  'Constable on 19-hour duty asks protesters to "please finish quickly"',
  'Bunty from Burari detained for the 7th time, now has a DTC loyalty card',
  'Water cannon refilled from the Yamuna; protesters demand a cleaner water cannon',
  'Rajpath renamed Kartavya Path; potholes renamed Kartavya Gaddhe',
  'Experts: Delhi now has 3 seasons, summer, smog and Section 163',
  'Chhole kulche vendor near Patel Chowk reports record "law and order" sales',
  'Delhi Police meme gets more likes than the official statement',
  'Foreign funding probe finds protester\'s mausi in Dubai sent ₹47 via UPI',
  'E20 petrol: bikes now get mileage of a bicycle, ministry calls it "fitness drive"',
  'Pension office window 4 closed since 1998 for "lunch"',
  'Tomato crosses ₹200; housewives declare it a dry fruit',
  'Gaddhe on Ring Road now visible from ISRO satellite'
];

export const FIR_AT = [100, 250, 500, 850, 1300];
export const FIR_TITLES = [
  '',
  'Suspicious element',
  'Urban Naxal',
  'Toolkit gang',
  'Tukde tukde',
  '100% ANTI-NATIONAL'
];

export const SHOPS = [
  'SHARMA SWEETS', 'GUPTA XEROX', 'BANSAL CHAI', 'RAJU DHABA', 'KUMAR MOBILE',
  'JAIN MEDICAL', 'PARATHE WALA', 'TENT HOUSE', 'IAS COACHING', 'LAXMI JEWELLERS',
  'TIWARI TAILORS', 'JUICE CORNER', 'BITTU TIKKI', 'AGARWAL STORE', 'SINGH AUTO',
  'KACHORI WALA', 'CYBER CAFE', 'PG FOR BOYS', 'MOMOS POINT', 'PHOTOSTAT',
  'LASSI BHANDAR', 'GYM & FITNESS', 'SHIV DHABA', 'KIRANA STORE', 'BARRICADE ON RENT'
];

export const POSTERS = [
  'UPSC 100% SELECTION*', 'DR. GUPTA CLINIC', 'NO PARKING', 'SECTION 163 LAGU',
  'PAKODA STARTUP HUB', 'LADKA UPSC ASPIRANT HAI', 'RENT: 1BHK ₹45K', 'JOIN MY TELEGRAM',
  'DIWALI SALE 90% OFF', 'FOREIGN FUNDING? UPI ONLY', 'SOROS BHAI KA NUMBER?', 'TOOLKIT AVAILABLE ₹99'
];

export const SIGNC = ['#c62828', '#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f', '#ad1457', '#f9a825'];

export const SKINS = ['#c98a55', '#b8784a', '#d9a06b', '#a86b40', '#e0b084'];
export const NAMES_P = [
  'Bunty from Burari', 'Pinki from DU', 'Chacha Ji', 'Comrade Raju', 'Asha Didi',
  'Kisan Baldev', 'Hostel Wing B', 'DU Topper', 'Teacher Sangh', 'Gig Workers',
  'Sharma Aunty', 'Rinku', 'Dolly', 'Tinku', 'Babli', 'Guddu', 'Pension Uncle', 'Biker Bhaiya'
];
export const NAMES_C = [
  'SHO Yadav', 'Const. Pandey', 'Inspector Tomar', 'ACP Malik', 'HC Dhillon',
  'SI Rathi', 'Const. Meena', 'DCP Sahab', 'SI Kaur', 'Const. Bhati'
];
