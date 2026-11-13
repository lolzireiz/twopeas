// Cards for Swipe & Match. Keys must never change once shipped (swipes point at them).
import { DATE_IDEAS } from './content.js';
import { CUISINES, guessAllergens } from './food.js';
import { hash } from './util.js';

const maps = (q) => `https://maps.apple.com/?q=${encodeURIComponent(q)}`;
const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

// emoji|title|cuisine|has|often|meat|spice|flags|ingredients
// flags: v = easy veggie version, V = easy vegan version, c = carb heavy, f = fried
const DISHES = `
🍜|Pad thai|thai|egg,fish|peanut,shellfish,soy|chicken,shellfish|1|v,c|rice noodles,tamarind,bean sprouts,lime
🍛|Thai green curry|thai|coconut,fish|shellfish,soy|chicken|2|v|coconut milk,basil,eggplant,chili
🥘|Massaman curry|thai|coconut,peanut,fish||beef,chicken|1|v|potato,coconut milk,peanuts
🍲|Pho|vietnamese|fish||beef|0|c|rice noodles,beef broth,basil,cilantro,bean sprouts
🥖|Bánh mì|vietnamese|gluten,fish|egg,soy|pork|1|v,c|baguette,pickled carrot,cilantro,pâté,mayo
🍣|Sushi night|japanese|fish,soy|gluten,sesame,shellfish,egg|fish|0|v|rice,nori,salmon,tuna,avocado,wasabi
🍜|Ramen|japanese|gluten,soy|egg,sesame,fish|pork|1|v,c|noodles,broth,egg,scallion,mushroom
🍤|Tempura|japanese|gluten,egg|shellfish,soy|shellfish|0|v,f|batter,shrimp,vegetables
🍱|Teriyaki chicken bowl|japanese|soy,gluten|sesame|chicken|0|v,c|rice,teriyaki sauce,broccoli
🥟|Dumplings / gyoza|chinese|gluten,soy|sesame,shellfish|pork|0|v,c|wrapper,cabbage,ginger,scallion
🥡|General Tso's chicken|chinese|gluten,soy|egg,sesame,peanut|chicken|1|f,c|fried chicken,sweet chili sauce
🥡|Lo mein|chinese|gluten,soy|egg,sesame,shellfish|chicken|0|v,c|noodles,vegetables,soy sauce
🍚|Fried rice|chinese|soy|egg,gluten,shellfish,sesame|chicken|0|v|rice,egg,peas,carrot
🥢|Kung pao chicken|chinese|peanut,soy|gluten,sesame|chicken|2||peanuts,chili,peppers
🍖|Korean BBQ|korean|soy,sesame|gluten,fish,shellfish|beef,pork|1||bulgogi,short rib,kimchi,lettuce wraps
🍚|Bibimbap|korean|sesame,soy|egg,gluten|beef|1|v|rice,egg,spinach,gochujang,mushroom
🍗|Korean fried chicken|korean|gluten|soy,sesame,peanut|chicken|1|f|gochujang glaze,fried chicken
🍛|Butter chicken|indian|dairy|treenut,gluten|chicken|1||tomato,cream,butter,naan
🍛|Chana masala|indian||dairy,gluten|  |2|V|chickpeas,tomato,onion,spices
🍛|Chicken tikka masala|indian|dairy|treenut|chicken|1||yogurt,cream,tomato
🫓|Samosas & naan|indian|gluten|dairy,egg|  |1|f,c,V|potato,peas,pastry
🍲|Lamb vindaloo|indian||dairy|lamb|3||vinegar,chili,potato
🌮|Street tacos|mexican|corn|dairy,nightshade|beef,pork,chicken|1|v|tortillas,cilantro,onion,salsa,lime
🌯|Burritos|mexican|gluten|dairy,corn,nightshade|beef,chicken|1|v,c|flour tortilla,rice,beans,cheese,salsa
🧀|Quesadillas|mexican|gluten,dairy|corn|chicken|0|v|cheese,tortilla
🫔|Enchiladas|mexican|corn,dairy|nightshade|chicken|1|v|tortillas,sauce,cheese
🥑|Chips & guac|mexican|corn|nightshade|  |0|V,f|avocado,lime,cilantro,onion
🍝|Spaghetti & meatballs|italian|gluten|egg,dairy|beef,pork|0|v,c|pasta,tomato sauce,parmesan
🍝|Fettuccine alfredo|italian|gluten,dairy|egg|  |0|c|pasta,cream,parmesan,butter
🍝|Pesto pasta|italian|gluten,dairy,treenut|egg|  |0|c|basil,pine nuts,parmesan,garlic
🥘|Lasagna|italian|gluten,dairy,egg||beef|0|v,c|pasta,ricotta,mozzarella,tomato
🍕|Pizza night|pizza|gluten,dairy||pork|0|v,c|crust,mozzarella,tomato,pepperoni
🍄|Mushroom risotto|italian|dairy|alcohol|  |0|c|arborio rice,parmesan,mushroom,wine
🥗|Caesar salad|american|fish,egg,dairy|gluten|chicken|0|v|romaine,croutons,anchovy,parmesan
🍔|Burgers & fries|burgers|gluten|dairy,sesame,egg|beef|0|v,f,c|bun,cheese,fries,pickles
🌭|Hot dogs|american|gluten|mustard|beef,pork|0||bun,mustard,relish
🍗|Fried chicken & biscuits|american|gluten,dairy|egg|chicken|1|f,c|buttermilk,biscuits
🍖|BBQ ribs & mac|bbq|dairy,gluten|mustard|pork|1|c|ribs,bbq sauce,mac and cheese,cornbread
🥩|Steak dinner|steakhouse||dairy|beef|0||steak,potato,butter,asparagus
🧆|Falafel plate|mediterranean|sesame|gluten,dairy|  |0|V,f|chickpeas,tahini,pita,cucumber
🥙|Gyros|greek|gluten,dairy||lamb,beef|0|c|pita,tzatziki,tomato,onion
🫒|Mezze spread|mediterranean|sesame|gluten,dairy,treenut|  |0|V|hummus,olives,pita,feta
🥘|Paella|seafood|shellfish|fish|chicken,pork|0||saffron rice,shrimp,mussels,chorizo
🦞|Lobster roll|seafood|shellfish|gluten,dairy,egg|shellfish|0|c|bun,butter,mayo
🐟|Fish & chips|seafood|fish,gluten|egg|fish|0|f,c|batter,fries,tartar sauce
🦐|Shrimp boil|seafood|shellfish|corn|shellfish,pork|2||shrimp,corn,potato,sausage
🍲|Clam chowder|seafood|shellfish,dairy|gluten|shellfish,pork|0||clams,cream,potato,bacon
🐟|Poke bowl|poke|fish,soy|sesame,shellfish|fish|1|v|rice,tuna,salmon,avocado,seaweed
🍳|Big brunch|breakfast|egg|dairy,gluten|pork|0|v,c|eggs,bacon,toast,hash browns
🥞|Pancakes & waffles|breakfast|gluten,egg,dairy||  |0|c|syrup,butter,berries
🥯|Bagels & lox|breakfast|gluten,fish|dairy,sesame|fish|0|c|cream cheese,capers,red onion
🥐|Croissants & coffee|bakery|gluten,dairy,egg|treenut|  |0|c|butter,pastry
🍩|Donut run|dessert|gluten,dairy,egg|peanut,treenut,soy|  |0|f,c|glaze,sprinkles
🍦|Ice cream date|dessert|dairy|egg,peanut,treenut,gluten|  |0||cones,toppings
🍫|Chocolate fondue|dessert|dairy,soy|treenut|  |0||chocolate,strawberries,marshmallows
🧇|Crepes|french|gluten,egg,dairy|treenut|  |0|c|nutella,strawberries,banana
🍜|Mac & cheese bar|american|gluten,dairy||pork|0|c|pasta,cheddar,breadcrumbs,bacon
🥗|Grain bowls|vegan||soy,sesame,treenut|chicken|0|V|quinoa,roasted vegetables,avocado
🍲|Chili|american||nightshade,dairy|beef|2|v|beans,tomato,onion,cheese
🍗|Jerk chicken|caribbean||nightshade|chicken|3||allspice,scotch bonnet,rice and peas
🍠|Cozy soup & grilled cheese|american|dairy,gluten|nightshade|  |0|c|tomato soup,cheddar,bread
🧋|Boba run|drinks|dairy|soy,coconut|  |0||tapioca pearls,milk tea
☕|Coffee date|drinks||dairy,soy,treenut|  |0||latte,pastry
🫕|Cheese fondue|french|dairy,gluten|alcohol|  |0|c|gruyère,bread,wine
🥟|Pierogies|other|gluten,dairy|egg|  |0|c|potato,cheese,onion,sour cream
🍢|Satay skewers|thai|peanut|soy,fish|chicken|1||peanut sauce,cucumber
🥗|Thai papaya salad|thai|fish|peanut,shellfish|  |3|V|papaya,lime,chili,peanuts
🌯|Shawarma wrap|middleeast|gluten|sesame,dairy|chicken|1|c|garlic sauce,pickles,pita
🍕|Flatbread & wine|italian|gluten,dairy,alcohol||  |0|c|flatbread,cheese,wine
🍓|Picnic snacks|other||dairy,gluten,treenut|  |0|V|fruit,cheese,crackers
`;

// emoji|name|cuisine|what it is
const PLACES = `
🍣|Sushi bar|japanese|Rolls, nigiri, maybe omakase
🍜|Ramen shop|japanese|Big steamy bowls
🔥|Hibachi grill|japanese|Chef cooks in front of you
🥡|Chinese takeout spot|chinese|Lo mein and fortune cookies
🥟|Dim sum brunch|chinese|Carts of little dishes
🍖|Korean BBQ|korean|Grill it yourself at the table
🍜|Thai restaurant|thai|Curries and noodles
🍲|Pho spot|vietnamese|Noodle soup and bánh mì
🍛|Indian restaurant|indian|Curries, tandoori and naan
🌮|Taqueria|mexican|Tacos, burritos, horchata
🍹|Mexican sit-down + margs|mexican|Chips, salsa and something frozen
🍝|Cozy Italian|italian|Pasta and candlelight
🍕|Pizza place|pizza|Slices or a whole pie
🧆|Mediterranean grill|mediterranean|Falafel, shawarma, hummus
🥙|Greek diner|greek|Gyros and spanakopita
🥩|Steakhouse|steakhouse|Fancy night out
🍔|Burger joint|burgers|Burgers, fries and shakes
🍖|BBQ smokehouse|bbq|Brisket, ribs, cornbread
🦞|Seafood shack|seafood|Lobster rolls and fried clams
🦪|Raw bar|seafood|Oysters and shrimp cocktail
🐟|Poke place|poke|Build-a-bowl
🥞|Brunch spot|breakfast|Pancakes, eggs, mimosas
🍳|Classic diner|american|Breakfast all day
🥐|French bakery|bakery|Croissants and macarons
☕|Cute café|drinks|Lattes and a pastry
🧋|Boba shop|drinks|Milk tea and pearls
🍦|Ice cream stand|dessert|Scoops and sundaes
🍩|Donut shop|dessert|Fresh and warm
🍰|Dessert café|dessert|Cake, crepes, gelato
🌱|Vegan café|vegan|Plant-based everything
🌴|Caribbean spot|caribbean|Jerk chicken and plantains
🫓|Middle Eastern restaurant|middleeast|Kebabs and mezze
🥖|French bistro|french|Steak frites, onion soup
🚚|Food truck night|other|Try a few trucks
🍷|Wine bar with small plates|other|Cheese boards and tapas
🍻|Brewery with a food truck|other|Flights and snacks
🎳|Arcade bar|american|Games, pizza and wings
🎤|Karaoke + snacks|other|Private room and wings
`;

// emoji|title|tags (home/out/cheap/fancy/active/cozy/seasonal)
const ACTIVITIES = `
🧩|1000-piece puzzle night|home cozy cheap
🎨|Paint and sip at home|home cozy cheap
🍪|Bake something from scratch|home cozy cheap
🎮|Co-op video game marathon|home cozy cheap
🕯️|Spa night with face masks|home cozy cheap
🏕️|Living room camp-out|home cozy cheap
🎤|Karaoke in the kitchen|home cheap
📸|Make a photo album together|home cozy cheap
🌱|Plant a little herb garden|home cheap
🃏|Learn a new card game|home cheap
🍿|Movie night with a theme snack|home cozy cheap
📚|Read side by side + share a favorite line|home cozy cheap
🧘|Yoga or stretching together|home active cheap
💃|Learn a dance from YouTube|home active cheap
📝|Write each other letters|home cozy cheap
🍝|Cook a fancy 3-course dinner|home fancy
🎲|Board game tournament|home cheap
🔭|Stargazing from the yard|out cheap cozy
🥾|Hike with a view|out active cheap
🚲|Bike ride + ice cream|out active cheap
🛶|Kayaking or paddle boarding|out active
🎳|Bowling|out cheap
⛳|Mini golf|out cheap
🧗|Indoor climbing gym|out active
⛸️|Ice skating|out active seasonal
🎡|Fair or carnival|out seasonal
🍎|Apple or berry picking|out seasonal cheap
🎃|Pumpkin patch + corn maze|out seasonal cheap
🌻|Sunflower field photos|out seasonal cheap
🏖️|Beach day|out cheap
🎭|See a play or musical|out fancy
🎵|Live music or a concert|out
😂|Comedy show|out
🖼️|Museum afternoon|out cheap
🐠|Aquarium|out
🦒|Zoo day|out
🎢|Theme park|out
🛍️|Thrift store challenge|out cheap
🏹|Axe throwing or archery|out active
🔐|Escape room|out
🧖|Real spa day|out fancy
🎬|Drive-in movie|out cozy seasonal
🚗|Scenic drive with a playlist|out cheap cozy
🧺|Picnic in the park|out cheap cozy
🌅|Watch the sunrise|out cheap cozy
🏺|Pottery class|out
🍳|Cooking class|out fancy
🎻|Fancy dress-up dinner|out fancy
🎆|Fireworks or a light show|out seasonal
`;

// title|year|genre|emoji
const MOVIES = `
The Notebook|2004|romance|💌
Crazy, Stupid, Love|2011|romance|💘
La La Land|2016|romance|🎹
About Time|2013|romance|⏳
Pride & Prejudice|2005|romance|🌾
10 Things I Hate About You|1999|romance|🎸
Notting Hill|1999|romance|📚
The Proposal|2009|romance|💍
Anyone But You|2023|romance|🏝️
How to Lose a Guy in 10 Days|2003|romance|💎
Past Lives|2023|romance|🌉
Pretty Woman|1990|romance|👠
Step Brothers|2008|comedy|🥁
Superbad|2007|comedy|🍺
Bridesmaids|2011|comedy|💐
The Hangover|2009|comedy|🐯
Mean Girls|2004|comedy|💅
Game Night|2018|comedy|🎲
21 Jump Street|2012|comedy|🚓
Barbie|2023|comedy|💖
Elf|2003|comedy|🎄
Home Alone|1990|comedy|🏠
Free Guy|2021|comedy|🎮
Booksmart|2019|comedy|📖
Spider-Man: Into the Spider-Verse|2018|animated|🕷️
Up|2009|animated|🎈
Coco|2017|animated|💀
Spirited Away|2001|animated|🐉
Inside Out|2015|animated|🧠
Tangled|2010|animated|🏮
Shrek|2001|animated|🧅
Ratatouille|2007|animated|🐀
The Incredibles|2004|animated|🦸
Your Name|2016|animated|☄️
Moana|2016|animated|🌊
How to Train Your Dragon|2010|animated|🐲
Top Gun: Maverick|2022|action|✈️
John Wick|2014|action|🐶
Mad Max: Fury Road|2015|action|🔥
Mission: Impossible – Fallout|2018|action|🚁
The Dark Knight|2008|action|🦇
Avengers: Endgame|2019|action|🛡️
Gladiator|2000|action|⚔️
Everything Everywhere All at Once|2022|scifi|🥯
Interstellar|2014|scifi|🪐
Inception|2010|scifi|🌀
Dune|2021|scifi|🏜️
The Matrix|1999|scifi|💊
Back to the Future|1985|scifi|⚡
Avatar|2009|scifi|🌿
Harry Potter and the Sorcerer's Stone|2001|scifi|🪄
The Lord of the Rings: The Fellowship of the Ring|2001|scifi|💍
Jurassic Park|1993|scifi|🦖
Get Out|2017|horror|🫖
A Quiet Place|2018|horror|🤫
The Conjuring|2013|horror|👻
Hereditary|2018|horror|🏠
Scream|1996|horror|🔪
It|2017|horror|🎈
Barbarian|2022|horror|🚪
Nope|2022|horror|🛸
Knives Out|2019|thriller|🔍
Gone Girl|2014|thriller|🧩
Parasite|2019|thriller|🪨
Shutter Island|2010|thriller|🏝️
Prisoners|2013|thriller|🕯️
Se7en|1995|thriller|📦
The Shawshank Redemption|1994|drama|🔨
Forrest Gump|1994|drama|🍫
Titanic|1997|drama|🚢
The Social Network|2010|drama|💻
Good Will Hunting|1997|drama|🧮
Little Women|2019|drama|✍️
Oppenheimer|2023|drama|💥
Whiplash|2014|drama|🥁
Mamma Mia!|2008|musical|🎤
The Greatest Showman|2017|musical|🎪
Grease|1978|musical|🚗
Wicked|2024|musical|🧹
Pitch Perfect|2012|musical|🎶
Hamilton|2020|musical|🎩
`;

// title|genre|emoji
const SHOWS = `
The Office|comedy|📎
Parks and Recreation|comedy|🧇
Brooklyn Nine-Nine|comedy|🚔
New Girl|comedy|🏠
Abbott Elementary|comedy|🍎
Schitt's Creek|comedy|🌹
Ted Lasso|comedy|⚽
Friends|comedy|☕
Modern Family|comedy|👨‍👩‍👧
The Good Place|comedy|🍤
Only Murders in the Building|comedy|🏢
Stranger Things|scifi|🔦
The Last of Us|drama|🍄
Severance|scifi|💼
Wednesday|comedy|🖤
Squid Game|thriller|🦑
Breaking Bad|drama|🧪
Succession|drama|💼
The Bear|drama|🍽️
Yellowjackets|thriller|🍂
You|thriller|📚
Bridgerton|romance|💃
Outer Banks|drama|🏝️
Euphoria|drama|✨
Grey's Anatomy|drama|🩺
Gilmore Girls|drama|☕
Love Is Blind|reality|💍
The Great British Baking Show|reality|🧁
Survivor|reality|🔥
Love Island|reality|🏝️
Queer Eye|reality|💇
Planet Earth|docs|🌍
Making a Murderer|docs|⚖️
Avatar: The Last Airbender|animated|🌀
Arcane|animated|💥
Bluey|animated|🐶
One Piece|animated|🏴‍☠️
The Walking Dead|horror|🧟
The Haunting of Hill House|horror|🏚️
House of the Dragon|scifi|🐉
Shōgun|drama|⛩️
Fallout|scifi|☢️
`;

// emoji|title|note|tags (near = New England-ish drive, far = fly, cheap, splurge, beach, city, nature, cozy, winter)
const TRIPS = `
🦞|Portland, Maine|Lobster rolls and the Old Port|near city cheap
🌲|Acadia & Bar Harbor|Sunrise on Cadillac Mountain|near nature
🏖️|Cape Cod beach weekend|Bike trails, beaches, fried clams|near beach
🌈|Provincetown|Colorful, artsy tip of the Cape|near beach city
🏰|Newport, Rhode Island|Mansions and the Cliff Walk|near city
⚓|Mystic, Connecticut|Seaport, aquarium and pizza|near cozy cheap
⛷️|Stowe, Vermont|Ski or cozy up by a fire|near winter cozy
🍁|White Mountains in the fall|Kancamagus Highway leaves|near nature cheap
🧙|Salem in October|Spooky season central|near city cheap
🐋|Whale watching trip|Out on the water|near nature
🏝️|Nantucket|Cobblestones and beaches|near beach splurge
🌊|Martha's Vineyard|Gingerbread cottages|near beach
🛶|Lake Winnipesaukee cabin|Lake days and s'mores|near nature cozy
🧀|Burlington, Vermont|Lake Champlain and cheese|near city cozy
🥐|Montreal|Bagels, poutine, French vibes|near city
❄️|Quebec City in winter|Feels like a European Christmas|near winter city
🗽|New York City weekend|Broadway and pizza|near city
🍂|Cozy cabin with a hot tub|Anywhere with woods|near cozy
🌸|Washington DC cherry blossoms|Museums are free|far city cheap
🎸|Nashville|Live music everywhere|far city
🎷|New Orleans|Beignets and jazz|far city
🌳|Savannah & Charleston|Southern charm|far city cozy
🌴|Miami|Beach and Cuban food|far beach city
🎢|Disney World|Be kids again|far splurge
🏜️|Grand Canyon & Sedona|Red rocks and sunsets|far nature
🦬|Yellowstone|Geysers and bison|far nature
🌉|San Francisco & Napa|Bridges and wine|far city splurge
🌲|Seattle|Coffee and mountains|far city nature
🍹|Puerto Rico|No passport needed|far beach
🌺|Hawaii|Volcanoes and beaches|far beach splurge
🏔️|Banff|Turquoise lakes|far nature
🌌|Iceland|Northern lights and hot springs|far nature splurge
🗼|Paris|Croissants and the Eiffel Tower|far city splurge
🍕|Italy|Rome, Florence, Amalfi Coast|far city splurge
🏛️|Greece|Santorini sunsets|far beach splurge
💂|London|Tea and theater|far city
🍷|Portugal|Lisbon trams and pastéis|far city cheap
🏯|Japan|Tokyo lights and Kyoto temples|far city splurge
🐒|Costa Rica|Jungles and waterfalls|far nature
🌮|Tulum, Mexico|Cenotes and beaches|far beach
🏝️|Aruba|Always sunny|far beach splurge
🛳️|A cruise|Wake up somewhere new|far splurge
🏴|Scotland|Castles and the Highlands|far nature
🌋|Bali|Temples and rice terraces|far nature splurge
`;

const lines = (s) => s.trim().split('\n').map((l) => l.split('|').map((x) => x.trim()));
const list = (s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);
const key = (prefix, title) => `${prefix}:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

function foodFromDish([e, title, cuisine, has, often, meat, spice, flags, ing]) {
  const f = list(flags);
  return {
    key: key('f', title), title, e, sub: `${CUISINES[cuisine]?.name || ''}${ing ? ` · ${ing.split(',').slice(0, 3).join(', ')}` : ''}`,
    tags: [cuisine],
    food: { title, cuisine, has: list(has), often: list(often), meat: list(meat), spice: Number(spice) || 0, veg: f.includes('v') || f.includes('V'), vegan: f.includes('V'), carby: f.includes('c'), fried: f.includes('f'), ing: list(ing) },
    links: [{ label: '🔎 Find a recipe', url: `https://www.google.com/search?q=${encodeURIComponent(`${title} recipe`)}` }, { label: '📍 Nearby', url: maps(`${title} near me`) }],
  };
}

// What's in most of the menu at these places.
const HEAVY = {
  thai: ['peanut', 'fish'], japanese: ['fish', 'soy'], seafood: ['shellfish', 'fish'], bakery: ['gluten'], indian: ['dairy'], mexican: ['corn'],
  italian: ['gluten', 'dairy'], pizza: ['gluten', 'dairy'], korean: ['sesame', 'soy'], chinese: ['soy'], vietnamese: ['fish'], mediterranean: ['sesame'],
  greek: ['dairy'], poke: ['fish', 'soy'], dessert: ['dairy'], breakfast: ['egg'], vegan: ['soy'], french: ['dairy'], middleeast: ['sesame'], burgers: ['gluten'],
};
function place([e, title, cuisine, what]) {
  const c = CUISINES[cuisine] || CUISINES.other;
  return {
    key: key('p', title), title, e, sub: what, tags: [cuisine],
    food: { title, cuisine, has: [], often: HEAVY[cuisine] || [], meat: [], veg: true, spice: { thai: 2, indian: 2, korean: 1, caribbean: 2, mexican: 1, vietnamese: 1 }[cuisine] || 0 },
    tip: c.tip,
    links: [{ label: '📍 Find one nearby', url: maps(title) }],
  };
}

export const DECKS = {
  dates: { name: 'Date ideas', e: '🎡', blurb: 'Things to do together', filters: [['home', 'At home'], ['out', 'Going out'], ['cheap', 'Cheap'], ['fancy', 'Fancy']] },
  food: { name: 'What to eat', e: '🍜', blurb: 'Takeout and cook-at-home', food: true, filters: [] },
  places: { name: 'Places to eat', e: '📍', blurb: 'Kinds of restaurants to try', food: true, filters: [] },
  movies: { name: 'Movies', e: '🎬', blurb: 'Your next movie night', filters: [['romance', 'Romance'], ['comedy', 'Comedy'], ['animated', 'Animated'], ['action', 'Action'], ['scifi', 'Sci-fi & fantasy'], ['horror', 'Horror'], ['thriller', 'Thriller'], ['drama', 'Drama'], ['musical', 'Musical']] },
  shows: { name: 'Shows to binge', e: '📺', blurb: 'Something to watch together', filters: [['comedy', 'Comedy'], ['drama', 'Drama'], ['thriller', 'Thriller'], ['scifi', 'Sci-fi'], ['reality', 'Reality'], ['animated', 'Animated'], ['romance', 'Romance'], ['horror', 'Horror'], ['docs', 'Docs']] },
  activities: { name: 'Things to do', e: '🎳', blurb: 'Fun stuff, in or out', filters: [['home', 'At home'], ['out', 'Out'], ['active', 'Active'], ['cozy', 'Cozy'], ['cheap', 'Cheap'], ['seasonal', 'Seasonal']] },
  trips: { name: 'Trips', e: '✈️', blurb: 'Weekend getaways to dream trips', filters: [['near', 'Drive'], ['far', 'Fly'], ['beach', 'Beach'], ['city', 'City'], ['nature', 'Nature'], ['cozy', 'Cozy'], ['cheap', 'Budget'], ['splurge', 'Splurge']] },
  ours: { name: 'Our own cards', e: '💞', blurb: 'Anything you two add', filters: [] },
};

let BUILT = null;
export function builtIn() {
  if (BUILT) return BUILT;
  const d = {};
  d.dates = DATE_IDEAS.map((i) => {
    const has = guessAllergens(i.text);
    return {
      key: `d:${hash(i.text).toString(36)}`, title: i.text, e: '💞', sub: i.cats.map((c) => ({ home: 'At home', out: 'Going out', cheap: 'Cheap', fancy: 'Fancy' }[c] || c)).join(' · '), tags: i.cats,
      food: has.length ? { title: i.text, has: [], often: has, meat: [], veg: true } : null,
    };
  });
  d.food = lines(DISHES).map(foodFromDish);
  d.places = lines(PLACES).map(place);
  d.activities = lines(ACTIVITIES).map(([e, title, tags]) => {
    const has = guessAllergens(title);
    return { key: key('a', title), title, e, sub: tags.split(' ').map((t) => DECKS.activities.filters.find((f) => f[0] === t)?.[1]).filter(Boolean).join(' · '), tags: tags.split(' '), food: has.length ? { title, has: [], often: has, meat: [], veg: true } : null };
  });
  d.movies = lines(MOVIES).map(([title, year, genre, e]) => ({
    key: key('m', title), title, e, sub: `${year} · ${DECKS.movies.filters.find((f) => f[0] === genre)?.[1] || genre}`, tags: [genre],
    links: [{ label: '▶️ Trailer', url: yt(`${title} ${year} trailer`) }, { label: '📺 Where to watch', url: `https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}` }],
  }));
  d.shows = lines(SHOWS).map(([title, genre, e]) => ({
    key: key('s', title), title, e, sub: DECKS.shows.filters.find((f) => f[0] === genre)?.[1] || genre, tags: [genre],
    links: [{ label: '▶️ Trailer', url: yt(`${title} trailer`) }, { label: '📺 Where to watch', url: `https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}` }],
  }));
  d.trips = lines(TRIPS).map(([e, title, note, tags]) => ({
    key: key('t', title), title, e, sub: note, tags: tags.split(' '),
    links: [{ label: '🗺️ Look around', url: maps(title) }],
  }));
  d.ours = [];
  BUILT = d;
  return d;
}
