class EmojiPicker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Load recents and limit to 16 (2 lines of 8)
        let savedRecents = JSON.parse(localStorage.getItem('goorac_recents')) || [];
        this.recentEmojis = savedRecents.slice(0, 16);
        
        // AI / ML Usage Tracking for Suggestions (Goorac Quantum Engine)
        this.emojiFrequency = JSON.parse(localStorage.getItem('goorac_emoji_freq')) || {};
        this.emojiPairs = JSON.parse(localStorage.getItem('goorac_quantum_pairs')) || {}; // Feature 1: Sequential Prediction
        this.learnedKeywords = JSON.parse(localStorage.getItem('goorac_learned_words')) || {}; // Feature 5: Dynamic Learning
        this.categoryAffinity = JSON.parse(localStorage.getItem('goorac_cat_affinity')) || {}; // Feature 10: Category Affinity
        this.lastSearchedTerm = "";
        
        this.emojiData = this.getComprehensiveEmojiData();
        this.activeFilter = '';
        this.scrollTimeout = null;
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
        this.loadEmojis('all');
    }

    getComprehensiveEmojiData() {
        // Added 50+ new emojis and expanded keywords extensively across all categories
        return [
            { id: 'smileys', name: 'Smileys & Emotion', icon: '😀', emojis: [
                {c:'😀', k:'smile happy joy excited positive'}, {c:'😃', k:'smile happy big eyes'}, {c:'😄', k:'smile happy warm glad'}, {c:'😁', k:'grin teeth happy big'}, {c:'😆', k:'laugh squint haha'}, {c:'😅', k:'sweat smile nervous relief'}, 
                {c:'🤣', k:'rofl rolling floor laughing dead'}, {c:'😂', k:'joy tears laugh cry haha lmao'}, {c:'🙂', k:'smile plain simple'}, {c:'🙃', k:'upside down silly sarcasm'}, {c:'😉', k:'wink flirt joke'}, {c:'😊', k:'blush warm happy cute'}, 
                {c:'😇', k:'halo angel good innocent'}, {c:'🥰', k:'love affection warm hearts'}, {c:'😍', k:'heart eyes love crush'}, {c:'🤩', k:'star eyes excited amazing wow'}, {c:'😘', k:'kiss heart flirt'}, {c:'😗', k:'kiss simple'}, 
                {c:'☺️', k:'smile shy warm'}, {c:'😚', k:'kiss blush'}, {c:'😙', k:'kiss smile'}, {c:'😋', k:'yum delicious food hungry'}, {c:'😛', k:'tongue silly'}, {c:'😜', k:'wink tongue crazy joke'}, 
                {c:'🤪', k:'zany goofy crazy silly wack'}, {c:'😝', k:'squint tongue haha'}, {c:'🤑', k:'money rich cash dollar wealth'}, {c:'🤗', k:'hugs open hands warm welcome'}, {c:'🤭', k:'hand mouth oops giggle secret'}, {c:'🤫', k:'shh quiet secret hush'}, 
                {c:'🤔', k:'think hmm wonder ponder'}, {c:'🤐', k:'zipper quiet secret silent'}, {c:'🤨', k:'eyebrow suspect the rock wtf'}, {c:'😐', k:'neutral plain bruh'}, {c:'😑', k:'expressionless annoyed tired'}, {c:'😶', k:'no mouth silent blank speechless'}, 
                {c:'😏', k:'smirk flirt smug'}, {c:'😒', k:'unamused meh annoyed'}, {c:'🙄', k:'roll eyes whatever sigh'}, {c:'😬', k:'grimace awkward yikes'}, {c:'🤥', k:'lying pinocchio fake'}, {c:'😌', k:'relieved peace calm zen'}, 
                {c:'😔', k:'pensive sad sorry down'}, {c:'😪', k:'sleepy tired'}, {c:'🤤', k:'drool hungry thirsty'}, {c:'😴', k:'sleep zzz tired bed'}, {c:'😷', k:'mask sick covid health'}, {c:'🤒', k:'thermometer fever ill'}, 
                {c:'🤕', k:'bandage hurt injury pain'}, {c:'🤢', k:'nauseated sick gross ew'}, {c:'🤮', k:'vomit throw up puke gross barf'}, {c:'🤧', k:'sneeze bless you sick cold'}, {c:'🥵', k:'hot sweat spicy heat summer'}, {c:'🥶', k:'cold freezing winter ice'}, 
                {c:'🥴', k:'woozy drunk dizzy'}, {c:'😵', k:'dizzy dead faint'}, {c:'🤯', k:'explode mind blown wow omg'}, {c:'🤠', k:'cowboy yeehaw texas'}, {c:'🥳', k:'party celebrate birthday fun'}, {c:'😎', k:'cool sunglasses boss swag'}, 
                {c:'🤓', k:'nerd geek smart glasses'}, {c:'🧐', k:'monocle fancy hmm search'}, {c:'😕', k:'confused huh what'}, {c:'😟', k:'worried anxious'}, {c:'🙁', k:'frown sad bad'}, {c:'😮', k:'open mouth wow omg surprise'}, 
                {c:'😯', k:'hushed surprise'}, {c:'😲', k:'astonished shock gasp'}, {c:'😳', k:'flushed embarrassed shy'}, {c:'🥺', k:'pleading puppy eyes cute beg bottom'}, {c:'😦', k:'frowning sad'}, {c:'😧', k:'anguished shock'}, 
                {c:'😨', k:'fearful scared scary'}, {c:'😰', k:'cold sweat nervous anxious'}, {c:'😥', k:'disappointed relief phew'}, {c:'😢', k:'cry tear sad tear'}, {c:'😭', k:'sob crying loudly weeping bawling'}, {c:'😱', k:'scream horror scary halloween'}, 
                {c:'😖', k:'confounded pain'}, {c:'😣', k:'persevering struggle hold'}, {c:'😞', k:'disappointed sad sigh'}, {c:'😓', k:'sweat hard work tired'}, {c:'😩', k:'weary tired sigh pain'}, {c:'😫', k:'tired exhausted sleep'}, 
                {c:'🥱', k:'yawn sleepy tired boring'}, {c:'😤', k:'triumph mad angry huff'}, {c:'😡', k:'pout angry mad rage red'}, {c:'😠', k:'angry mad upset'}, {c:'🤬', k:'cursing swear mad words rage'}, {c:'😈', k:'devil evil bad grin'}, 
                {c:'👿', k:'devil angry evil'}, {c:'💀', k:'skull dead bruh im dead'}, {c:'☠️', k:'skull bones danger poison'}, {c:'💩', k:'poop crap shit turd funny'}, {c:'🤡', k:'clown fool joke idiot'}, {c:'👹', k:'ogre monster demon red'}, 
                {c:'👺', k:'goblin mask red'}, {c:'👻', k:'ghost spooky boo snapchat'}, {c:'👽', k:'alien ufo space et'}, {c:'👾', k:'monster game space invader retro'}, {c:'🤖', k:'robot ai bot tech machine'}, {c:'😺', k:'cat smile kitty'}, 
                {c:'😸', k:'cat grin kitty'}, {c:'😹', k:'cat joy tears laugh kitty'}, {c:'😻', k:'cat love heart eyes kitty'}, {c:'😼', k:'cat wry smirk kitty'}, {c:'😽', k:'cat kiss kitty'}, {c:'🙀', k:'cat scream scared kitty'}, 
                {c:'😿', k:'cat crying sad kitty'}, {c:'😾', k:'cat pout mad kitty'}, {c:'💋', k:'kiss mark lips lipstick makeup'}, {c:'👋', k:'wave hello bye hi greet'}, {c:'🤚', k:'back hand stop'}, 
                {c:'🖐️', k:'fingers splayed stop hand'}, {c:'✋', k:'hand high five stop'}, {c:'🖖', k:'vulcan star trek spock'}, {c:'👌', k:'ok perfect good gotcha'}, {c:'🤌', k:'pinched fingers italian wtf chef'}, 
                {c:'🤏', k:'pinching tiny small little'}, {c:'✌️', k:'victory peace two'}, {c:'🤞', k:'crossed luck hope promise'}, {c:'🤟', k:'love you hand sign'}, {c:'🤘', k:'rock on metal heavy sign'}, 
                {c:'🤙', k:'call me shaka chill phone'}, {c:'👈', k:'point left direction'}, {c:'👉', k:'point right direction'}, {c:'👆', k:'point up above'}, {c:'🖕', k:'middle finger fuck you mad'}, 
                {c:'👇', k:'point down below'}, {c:'☝️', k:'index up wait one minute'}, {c:'👍', k:'thumbs up yes good cool agree'}, {c:'👎', k:'thumbs down no bad disagree'}, {c:'✊', k:'fist power blm resist'}, 
                {c:'👊', k:'punch brofist hit bump'}, {c:'🤛', k:'left fist bump'}, {c:'🤜', k:'right fist bump'}, {c:'👏', k:'clap applause good job praise'}, {c:'🙌', k:'hands up praise yay'}, 
                {c:'👐', k:'open hands hug'}, {c:'🤲', k:'palms up pray beg'}, {c:'🤝', k:'handshake deal agree meet'}, {c:'🙏', k:'pray please thanks namaste high five'}, {c:'✍️', k:'write pen pencil sign'}, 
                {c:'💅', k:'nail polish sassy bad bitch'}, {c:'🤳', k:'selfie phone camera snap'}, {c:'💪', k:'muscle strong flex workout gym gymbro'}, {c:'🦵', k:'leg kick limb'}, {c:'🦶', k:'foot toe step'}, 
                {c:'👂', k:'ear listen hear'}, {c:'🦻', k:'hearing aid deaf'}, {c:'👃', k:'nose smell sniff'}, {c:'🧠', k:'brain smart mind intelligence genius'}, {c:'🫀', k:'anatomical heart real organ'}, 
                {c:'🫁', k:'lungs breathe air organ'}, {c:'🦷', k:'tooth dentist bite'}, {c:'🦴', k:'bone dog skeleton structure'}, {c:'👀', k:'eyes look stare see watch drama tea'}, {c:'👁️', k:'eye illuminati vision'}, {c:'👅', k:'tongue lick taste'}, {c:'👄', k:'mouth lips kiss speak'}
            ]},
            { id: 'people', name: 'People', icon: '👤', emojis: [
                {c:'👶', k:'baby infant child young newborn'}, {c:'🧒', k:'child kid toddler'}, {c:'👦', k:'boy young male'}, {c:'👧', k:'girl young female'}, {c:'🧑', k:'person adult neutral human'}, 
                {c:'👱', k:'blond hair blonde guy girl'}, {c:'👨', k:'man guy adult male'}, {c:'🧔', k:'beard hipster lumberjack facial hair'}, {c:'👨‍🦰', k:'red hair ginger man'}, {c:'👨‍🦱', k:'curly hair man boy'}, 
                {c:'👨‍🦳', k:'white hair old man senior'}, {c:'👨‍🦲', k:'bald no hair man'}, {c:'👩', k:'woman lady adult female'}, {c:'👩‍🦰', k:'red hair ginger woman'}, {c:'👩‍🦱', k:'curly hair woman'}, 
                {c:'👩‍🦳', k:'white hair old woman senior'}, {c:'👩‍🦲', k:'bald woman'}, {c:'🧓', k:'older person elder senior'}, {c:'👴', k:'old man grandpa grandfather'}, {c:'👵', k:'old woman grandma grandmother'}, 
                {c:'🙍', k:'frowning person upset disappointed'}, {c:'🙎', k:'pouting person mad sulk'}, {c:'🙅', k:'no gesture cross x stop block'}, {c:'🙆', k:'ok gesture circle yes fine'}, 
                {c:'💁', k:'tipping hand sassy whatever care'}, {c:'🙋', k:'raising hand question ask me'}, {c:'🙇', k:'bowing sorry respect apologize'}, {c:'🤦', k:'facepalm stupid sigh bruh idiot'}, {c:'🤷', k:'shrug idk whatever unsure'}, 
                {c:'👨‍⚕️', k:'health worker doctor nurse medic'}, {c:'👨‍🎓', k:'student graduate college school diploma'}, {c:'👨‍🏫', k:'teacher professor class school'}, {c:'👨‍⚖️', k:'judge lawyer court legal law'}, {c:'👨‍🌾', k:'farmer tractor field crop'}, 
                {c:'👨‍🍳', k:'cook chef food kitchen restaurant'}, {c:'👨‍🔧', k:'mechanic fix wrench repair tool'}, {c:'👨‍🏭', k:'factory worker industry'}, {c:'👨‍💼', k:'office worker boss ceo business suit'}, {c:'👨‍🔬', k:'scientist lab chemistry beaker'}, 
                {c:'👨‍💻', k:'technologist coder dev hacker computer pc'}, {c:'👨‍🎤', k:'singer star music artist'}, {c:'👨‍🎨', k:'artist painter brush draw'}, {c:'👨‍✈️', k:'pilot fly plane aviation'}, {c:'👨‍🚀', k:'astronaut space rocket moon'}, 
                {c:'👨‍🚒', k:'firefighter fire hose danger'}, {c:'👮', k:'police cop arrest law'}, {c:'🕵️', k:'detective spy secret investigate'}, {c:'💂', k:'guard protect london'}, {c:'👷', k:'construction builder hardhat tool'}, 
                {c:'🤴', k:'prince king royal crown'}, {c:'👸', k:'princess queen royal tiara'}, {c:'👳', k:'turban wrap head'}, {c:'👲', k:'cap hat asian'}, {c:'🧕', k:'headscarf hijab muslim islam'}, 
                {c:'🤵', k:'tuxedo groom fancy wedding suit'}, {c:'👰', k:'veil bride wedding dress'}, {c:'🤰', k:'pregnant expecting baby bump'}, {c:'🤱', k:'breast feeding mother baby care'}, {c:'👼', k:'angel cute holy wing'}, 
                {c:'🎅', k:'santa christmas xmas holiday december'}, {c:'🧛', k:'vampire dracula blood bat bite'}, {c:'🧟', k:'zombie dead walking brain halloween'}, {c:'🧞', k:'genie magic wish lamp'}, {c:'🧜', k:'merperson mermaid ocean sea'}, 
                {c:'🧚', k:'fairy magic wings fly forest'}, {c:'🚶', k:'walking stroll pedestrian step'}, {c:'🧍', k:'standing wait still'}, {c:'🧎', k:'kneeling pray beg'}, {c:'🏃', k:'running fast dash run escape jog'}, 
                {c:'💃', k:'dancing party salsa dress woman'}, {c:'🕺', k:'man dancing disco groove move'}, {c:'👯', k:'people dancing twins showgirls bunny'}, {c:'🧖', k:'steamy room sauna spa relax heat'}, {c:'🧘', k:'yoga meditate zen peace calm'},
                {c:'🗣️', k:'speaking talking shout profile yell'}, {c:'👤', k:'silhouette shadow user account profile'}, {c:'👥', k:'silhouettes users group team friends'}, {c:'🫂', k:'hug embrace support love care comfort'}
            ]},
            { id: 'nature', name: 'Nature', icon: '🐻', emojis: [
                {c:'🐶', k:'dog puppy pet bark cute animal'}, {c:'🐱', k:'cat kitten pet meow feline'}, {c:'🐭', k:'mouse rat squeak'}, {c:'🐹', k:'hamster pet cute fluff'}, {c:'🐰', k:'rabbit bunny hop easter'}, {c:'🦊', k:'fox sneaky wild orange'}, 
                {c:'🐻', k:'bear grizzly wild animal'}, {c:'🐼', k:'panda cute bear bamboo'}, {c:'🐨', k:'koala australia tree bear'}, {c:'🐯', k:'tiger wild cat rawr'}, {c:'🦁', k:'lion king roar jungle africa'}, {c:'🐮', k:'cow moo milk farm animal'}, 
                {c:'🐷', k:'pig oink farm bacon'}, {c:'🐽', k:'pig nose snout smell'}, {c:'🐸', k:'frog toad ribbit amphibian meme'}, {c:'🐵', k:'monkey ape jungle funny'}, {c:'🙈', k:'see no evil shy blind monkeys'}, {c:'🙉', k:'hear no evil deaf monkeys'}, 
                {c:'🙊', k:'speak no evil secret silent mute'}, {c:'🐒', k:'monkey tail climb wild'}, {c:'🐔', k:'chicken hen farm egg'}, {c:'🐧', k:'penguin cold winter bird ice snow'}, {c:'🐦', k:'bird tweet fly wing sky'}, {c:'🐤', k:'chick baby bird yellow'}, 
                {c:'🐣', k:'hatching chick egg born break'}, {c:'🐥', k:'front chick bird cute'}, {c:'🦆', k:'duck quack pond water bird'}, {c:'🦅', k:'eagle bird of prey america fly soar'}, {c:'🦉', k:'owl wise night bird hoot dark'}, {c:'🦇', k:'bat vampire fly night dark'}, 
                {c:'🐺', k:'wolf howl moon wild pack dog'}, {c:'🐗', k:'boar wild pig tusk'}, {c:'🐴', k:'horse ride farm mane neigh'}, {c:'🦄', k:'unicorn magic fantasy horn rainbow mythical'}, {c:'🐝', k:'bee honey bug sting yellow fly'}, {c:'🐛', k:'bug caterpillar insect leaf crawl'}, 
                {c:'🦋', k:'butterfly beautiful bug insect fly wing'}, {c:'🐌', k:'snail slow slime shell'}, {c:'🐚', k:'shell beach sea ocean sand sound'}, {c:'🐞', k:'beetle ladybug insect red spot bug'}, {c:'🐜', k:'ant insect bug small colony worker'}, {c:'🦗', k:'cricket chirp bug noise jump'}, 
                {c:'🕷️', k:'spider web creepy bug insect halloween'}, {c:'🕸️', k:'web spider sticky trap net'}, {c:'🦂', k:'scorpion sting poison desert bug'}, {c:'🦟', k:'mosquito bite bug itch blood fly'}, {c:'🦠', k:'microbe virus covid germ sick health biology'}, {c:'🐢', k:'turtle slow shell reptile sea ocean'}, 
                {c:'🐍', k:'snake slither toxic venom reptile hiss'}, {c:'🦎', k:'lizard reptile gecko scale tail'}, {c:'🦖', k:'t-rex dinosaur t rex roar jurassic extinct'}, {c:'🦕', k:'sauropod dinosaur dino long neck extinct'}, {c:'🐙', k:'octopus ocean sea tentacles kraken squid'}, {c:'🦑', k:'squid kraken ocean sea tentacle ink'}, 
                {c:'🦐', k:'shrimp prawn seafood ocean tiny'}, {c:'🦞', k:'lobster crab red claws sea seafood'}, {c:'🦀', k:'crab snip claws beach sand ocean sea'}, {c:'🐡', k:'blowfish puffer spike ocean sea poison'}, {c:'🐠', k:'tropical fish nemo ocean sea swim reef'}, {c:'🐟', k:'fish swim ocean sea water gill'}, 
                {c:'🐬', k:'dolphin flipper ocean sea smart swim jump'}, {c:'🐳', k:'whale sea ocean huge water mammal'}, {c:'🐋', k:'spouting whale ocean sea blowhole big'}, {c:'🦈', k:'shark jaws danger ocean sea teeth predator'}, {c:'🐊', k:'crocodile gator reptile teeth swamp swamp'}, {c:'🐅', k:'tiger full cat wild stripes jungle beast'}, 
                {c:'🐆', k:'leopard cheetah fast wild cat spots sprint'}, {c:'🦓', k:'zebra stripes black white wild africa'}, {c:'🦍', k:'gorilla harambe monkey ape strong silverback'}, {c:'🦧', k:'orangutan monkey ape jungle orange wild'}, {c:'🐘', k:'elephant trunk big wild africa safari tusks'}, {c:'🦛', k:'hippo water huge hungry mouth wild river'}, 
                {c:'🦏', k:'rhino horn wild charge thick skin safari'}, {c:'🐪', k:'camel desert hot sand hump dry water'}, {c:'🐫', k:'two-hump camel desert ride arabia'}, {c:'🦒', k:'giraffe tall long neck spots wild safari'}, {c:'🦘', k:'kangaroo jump pouch australia hop joey'}, {c:'🐃', k:'water buffalo horns wild strong'}, 
                {c:'🐂', k:'ox bull horns farm strong zodiac'}, {c:'🐄', k:'bull cow farm milk grass fields'}, {c:'🐎', k:'horse full gallop ride fast mane pony'}, {c:'🐖', k:'pig full farm bacon oink mud pink'}, {c:'🐏', k:'ram horns sheep wool farm climb'}, {c:'🐑', k:'sheep wool farm baa flock white'}, 
                {c:'🦙', k:'llama alpaca spit peru mountain wool'}, {c:'🐐', k:'goat greatest of all time horns farm climb bleat'}, {c:'🦌', k:'deer buck antlers wild forest bambi'}, {c:'🐕', k:'dog full pet bark fetch leash walk'}, {c:'🐩', k:'poodle dog fancy pet show fluff'}, {c:'🦮', k:'guide dog blind help assist lead sight'}, 
                {c:'🐕‍🦺', k:'service dog help vest work assist'}, {c:'🐈', k:'cat full pet meow purr feline walk'}, {c:'🐓', k:'rooster cock farm morning wake crow'}, {c:'🦃', k:'turkey thanksgiving bird gobble fall'}, {c:'🦚', k:'peacock beautiful bird feathers spread color'}, {c:'🦜', k:'parrot talk bird pirate fly color tropic'}, 
                {c:'🦢', k:'swan elegant white bird pond lake grace'}, {c:'🦩', k:'flamingo pink bird stand one leg tropical'}, {c:'🕊️', k:'dove peace fly white bird holy spirit'}, {c:'🐇', k:'rabbit full bunny hop white pet easter'}, {c:'🦝', k:'raccoon trash panda bandit wild mask'}, {c:'🦨', k:'skunk smell stink spray stripe tail black white'}, 
                {c:'🦡', k:'badger honey wild dig stripe fierce'}, {c:'🦦', k:'otter cute water swim river play shell'}, {c:'🦥', k:'sloth slow lazy sleep hang branch jungle'}, {c:'🐁', k:'mouse full tail rodent small run squeak'}, {c:'🐀', k:'rat snitch rodent tail cheese dirty'}, {c:'🐿️', k:'chipmunk squirrel nut tree acorn climb wild'}, 
                {c:'🦔', k:'hedgehog sonic cute spike roll ball small'}, {c:'🐾', k:'paw prints dog cat pet track step walk animal'}, {c:'🐉', k:'dragon mythical lizard fire fantasy magic china'}, {c:'🐲', k:'dragon face fantasy fire mythical beast roar'}, {c:'🌵', k:'cactus desert plant prick spike dry hot succulent'}, {c:'🎄', k:'christmas tree xmas holiday pine decorate lights december'}, 
                {c:'🌲', k:'evergreen pine wood tree forest nature green outdoor'}, {c:'🌳', k:'deciduous tree wood nature forest green leaves park'}, {c:'🌴', k:'palm beach tropical tree vacation ocean sand hot'}, {c:'🌱', k:'seedling plant grow nature green sprout dirt earth'}, {c:'🌿', k:'herb leaf green weed nature plant medicine spice cook'}, {c:'☘️', k:'shamrock clover green ireland luck st patricks day'}, 
                {c:'🍀', k:'four leaf clover luck lucky green irish nature chance'}, {c:'🎍', k:'bamboo plant wood japan green panda food'}, {c:'🎋', k:'tanabata tree bamboo paper wish japan festival'}, {c:'🍃', k:'wind leaves fall blow nature green autumn fly'}, {c:'🍂', k:'fallen leaf autumn fall brown orange nature tree'}, {c:'🍁', k:'maple leaf canada autumn fall red orange nature tree'}, 
                {c:'🍄', k:'mushroom shroom fungi red spots toxic forest magic nature'}, {c:'🌾', k:'sheaf wheat farming crop grow field agriculture bread yellow'}, {c:'💐', k:'bouquet flowers romantic gift love date wedding color spring'}, {c:'🌷', k:'tulip flower spring pink nature garden bloom plant'}, {c:'🌹', k:'rose red love romantic flower date valentine thorn beautiful'}, {c:'🥀', k:'wilted flower dead sad break up wilting dry dead droop'}, 
                {c:'🌺', k:'hibiscus hawaii flower pink tropical island vacation bloom petal'}, {c:'🌸', k:'cherry blossom sakura pink flower japan spring tree bloom season'}, {c:'🌼', k:'blossom flower yellow bloom nature spring plant bright field'}, {c:'🌻', k:'sunflower happy summer yellow flower tall nature field seed'}, {c:'🌞', k:'sun face happy hot bright summer light sky morning ray'}, {c:'🌝', k:'full sun smile face moon bright light sky night glow'}, 
                {c:'🌛', k:'full moon face sleep night sky dark stars dream bedtime'}, {c:'🌜', k:'last quarter moon face night sky dark space dream sleep'}, {c:'🌚', k:'new moon face dark night sky space black shadow shade'}, {c:'🌕', k:'full moon night dark sky space stars bright light glow'}, {c:'🌖', k:'waning gibbous moon space sky night dark phase shadow'}, 
                {c:'🌗', k:'last quarter moon half night space sky dark shadow light'}, {c:'🌘', k:'waning crescent moon dark night sky space shadow phase sliver'}, {c:'🌑', k:'new moon dark space night sky black eclipse phase none'}, {c:'🌒', k:'waxing crescent moon sky night dark space sliver phase light'}, {c:'🌓', k:'first quarter moon half night dark space sky phase light'}, 
                {c:'🌔', k:'waxing gibbous moon dark night sky space light phase mostly'}, {c:'🌙', k:'crescent moon sleep night dark sky space bedtime dream stars'}, {c:'🌎', k:'earth americas planet globe world space map ocean green blue'}, {c:'🌍', k:'earth africa globe planet world space map ocean green blue'}, {c:'🌏', k:'earth asia globe planet world space map ocean green blue'}, 
                {c:'🪐', k:'planet saturn rings space galaxy universe orbit stars orbit'}, {c:'💫', k:'dizzy star shining shooting fly orbit spin circle bright yellow'}, {c:'⭐', k:'star favorite shine bright yellow point sky night space rank'}, {c:'🌟', k:'glowing star magic shine bright yellow twinkle sky space night'}, {c:'✨', k:'sparkles magic clean aesthetic shine twinkle glitter fairy stars pure'}, {c:'⚡', k:'zap lightning fast thunder electric storm flash power storm weather'}, 
                {c:'☄️', k:'comet space rock fly fire tail crash star meteor burn'}, {c:'🔥', k:'fire flame hot lit fire burn blaze heat warmth danger'}, {c:'🌊', k:'wave ocean sea surf water beach tide blue splash tsunami'}, {c:'💧', k:'droplet water tear wet rain drop cry sweat blue liquid'}
            ]},
            { id: 'food', name: 'Food', icon: '🍔', emojis: [
                {c:'🍇', k:'grapes fruit purple vine sweet wine'}, {c:'🍈', k:'melon cantaloupe fruit green sweet'}, {c:'🍉', k:'watermelon summer fruit red seed juicy slice'}, {c:'🍊', k:'tangerine orange fruit citrus sweet sour peel'}, {c:'🍋', k:'lemon sour fruit yellow citrus tart'}, {c:'🍌', k:'banana monkey fruit yellow peel healthy sweet'}, 
                {c:'🍍', k:'pineapple tropical fruit yellow spike sweet hawaii'}, {c:'🥭', k:'mango fruit tropical sweet yellow juicy pulp'}, {c:'🍎', k:'apple red fruit healthy teacher school sweet crisp'}, {c:'🍏', k:'apple green sour fruit healthy crisp tart'}, {c:'🍐', k:'pear fruit green sweet juicy tree'}, {c:'🍑', k:'peach butt juicy fruit sweet pink fuzzy'}, 
                {c:'🍒', k:'cherries fruit red sweet pair stem tree'}, {c:'🍓', k:'strawberry sweet berry red fruit seed shortcake juicy'}, {c:'🥝', k:'kiwi fruit green fuzzy brown seed tropical sweet'}, {c:'🍅', k:'tomato red veg vegetable plant ketchup salad'}, {c:'🥥', k:'coconut tropical island palm nut shell white water milk'}, {c:'🥑', k:'avocado guacamole toast healthy green pit fat veg'}, 
                {c:'🍆', k:'eggplant vegetable purple long plant'}, {c:'🥔', k:'potato spud root vegetable brown dirty fry'}, {c:'🥕', k:'carrot bugs bunny vegetable orange long root healthy eyes'}, {c:'🌽', k:'corn maize yellow vegetable cob stalk butter field'}, {c:'🌶️', k:'hot pepper spicy chili red vegetable burn heat mexico'}, {c:'🥒', k:'cucumber pickle green vegetable long salad crisp'}, 
                {c:'🥬', k:'leafy green lettuce cabbage vegetable salad healthy diet plant'}, {c:'🥦', k:'broccoli vegetable healthy green mini tree diet vegan plant'}, {c:'🧄', k:'garlic flavor clove vegetable cook spice white smelly bulb'}, {c:'🧅', k:'onion cry veg vegetable root cook layers flavor rings'}, {c:'🍄', k:'mushroom shroom fungi red cap forest cook pizza plant'}, {c:'🥜', k:'peanuts nut allergy shell brown snack elephant butter leg'}, 
                {c:'🌰', k:'chestnut nut brown shell tree fall autumn roast warm'}, {c:'🍞', k:'bread loaf carb toast bake wheat slice soft bakery'}, {c:'🥐', k:'croissant french pastry butter flake bake breakfast paris crescent'}, {c:'🥖', k:'baguette french bread long crust bake paris carb stick'}, {c:'🥨', k:'pretzel snack salt twist bake dough brown germany knot'}, {c:'🥯', k:'bagel cream cheese bread hole bake breakfast carb round new york'}, 
                {c:'🥞', k:'pancakes breakfast syrup flapjack stack butter morning sweet bake'}, {c:'🧇', k:'waffle breakfast syrup grid butter morning sweet bake iron'}, {c:'🧀', k:'cheese dairy slice yellow hole mouse cheddar swiss gouda'}, {c:'🍖', k:'meat bone bbq grill roast pig cow protein caveman flesh'}, {c:'🍗', k:'poultry drumstick chicken turkey leg bird meat fry bone kfc'}, {c:'🥩', k:'steak meat beef bbq grill red protein cut chop raw'}, 
                {c:'🥓', k:'bacon meat pork breakfast fry grease crisp fat strip pig'}, {c:'🍔', k:'hamburger burger fast food bun beef cheese grill american mcdonalds patty'}, {c:'🍟', k:'fries french fries potato fast food salt crisp fry yellow side'}, {c:'🍕', k:'pizza italian fast food slice cheese pepperoni crust delivery cheese bake'}, {c:'🌭', k:'hot dog sausage fast food bun mustard ketchup grill bbq wiener'}, {c:'🥪', k:'sandwich lunch bread meat cheese lettuce sub hoagie deli meal'}, 
                {c:'🌮', k:'taco mexican fast food shell meat cheese lettuce salsa mexico spice'}, {c:'🌯', k:'burrito wrap mexican bean rice meat tortilla foil salsa spice roll'}, {c:'🥙', k:'stuffed flatbread kebab pita gyro falafel greek meat wrap pocket'}, {c:'🧆', k:'falafel middle eastern chickpea ball fry brown veg vegan herb'}, {c:'🥚', k:'egg breakfast white protein chicken shell boil scramble yolk fry'}, {c:'🍳', k:'cooking frying pan egg breakfast yolk sizzle oil stove heat cook'}, 
                {c:'🥘', k:'pan food paella dinner stove cook meal dish rice meat spain'}, {c:'🍲', k:'pot food soup stew warm bowl broth meat veg dinner boil'}, {c:'🥣', k:'bowl cereal soup breakfast spoon eat dish meal milk morning'}, {c:'🥗', k:'salad healthy greens veg bowl leaf tomato diet vegan raw light'}, {c:'🍿', k:'popcorn movie theater snack butter kernel pop bucket film crunch'}, {c:'🧈', k:'butter dairy slide yellow fat spread milk slice melt toast cook'}, 
                {c:'🧂', k:'salt shaker spice flavor white grain sprinkle cook prep shake'}, {c:'🥫', k:'canned soup tin preserve tomato beans metal store stash shelf cook'}, {c:'🍱', k:'bento box japanese lunch sushi rice meat compartmentalized meal grid tray'}, {c:'🍘', k:'cracker rice snack seaweed asian crisp round flat bake crunch'}, {c:'🍙', k:'rice ball japanese snack seaweed nori triangle white sticky asian'}, {c:'🍚', k:'cooked rice bowl asian white chopstick steam grain meal staple'}, 
                {c:'🍛', k:'curry rice indian spicy sauce meat veg bowl brown asia heat stew'}, {c:'🍜', k:'noodle ramen soup asian warm bowl chopstick broth japan slurp pasta'}, {c:'🍝', k:'spaghetti pasta italian noodle sauce meatball tomato fork red long dish'}, {c:'🍠', k:'roasted potato sweet yam purple brown root slice bake warm winter'}, {c:'🍢', k:'oden skewer snack stick japan boil fish egg meat brown broth'}, {c:'🍣', k:'sushi japanese raw fish rice seaweed roll salmon tuna asia raw'}, 
                {c:'🍤', k:'fried shrimp tempura batter crisp tail japan seafood fry orange golden'}, {c:'🍥', k:'fish cake swirl pink white spiral naruto japan noodle soup slice'}, {c:'🥮', k:'moon cake chinese festival pastry bake round brown sweet bean lotus'}, {c:'🍡', k:'dango sweet skewer mochi balls stick pink white green dessert japan'}, {c:'🥟', k:'dumpling potsticker asian dough meat fold steam fry china dim sum'}, {c:'🥠', k:'fortune cookie chinese future paper text snap bake sweet crack'}, 
                {c:'🥡', k:'takeout box chinese food delivery oyster pail noodle rice fold carton'}, {c:'🦀', k:'crab seafood claw shell red beach ocean boil bake snip meat'}, {c:'🦞', k:'lobster seafood red claw shell tail ocean boil butter rich fine'}, {c:'🦐', k:'shrimp prawn seafood pink tail curl ocean cocktail boil fry tiny'}, {c:'🦑', k:'squid calamari sea tentacles purple ocean ink fry ring seafood'}, {c:'🦪', k:'oyster pearl seafood shell clam open ocean luxury raw drop sea'}, 
                {c:'🍦', k:'ice cream soft serve cone dessert vanilla swirl cold summer sweet dairy'}, {c:'🍧', k:'shaved ice dessert sweet flavor syrup color cold summer hawaii spoon'}, {c:'🍨', k:'ice cream scoop sundae dessert bowl glass cold sweet dairy treat'}, {c:'🍩', k:'doughnut donut sweet pastry hole frosting sprinkle sugar bake homer pink'}, {c:'🍪', k:'cookie chocolate chip dessert bake sugar sweet dough warm bite treat'}, {c:'🎂', k:'cake birthday celebrate party candles frost bake sweet slice age year'}, 
                {c:'🍰', k:'shortcake slice dessert sweet strawberry layer frost bake piece plate cream'}, {c:'🧁', k:'cupcake sweet dessert bakery frost sprinkle paper mini cake bake muffin'}, {c:'🥧', k:'pie slice dessert bake crust fruit apple thanksgiving warm cut pastry'}, {c:'🍫', k:'chocolate bar sweet cocoa dessert brown break block candy sugar rich dark'}, {c:'🍬', k:'candy sweet sugar wrapper twist piece treat kid drop flavor color'}, {c:'🍭', k:'lollipop sweet candy sugar stick spiral color lick kid treat suck'}, 
                {c:'🍮', k:'custard flan dessert sweet caramel pudding jiggle plate mold yellow bake'}, {c:'🍯', k:'honey pot sweet bee sticky gold syrup drip jar bear liquid dipper'}, {c:'🍼', k:'baby bottle milk drink infant formula nipple plastic feed child nurse'}, {c:'🥛', k:'milk glass dairy drink white cold calcium cow bone cup tall pour'}, {c:'☕', k:'coffee hot tea mug cafe wake morning caffeine bean brew steam cup'}, {c:'🍵', k:'tea matcha green warm cup leaf brew hot japan china steep drink'}, 
                {c:'🍶', k:'sake bottle japanese drink alcohol cup rice clear warm asia pour glass'}, {c:'🍾', k:'champagne bottle pop celebrate party alcohol bubbly new year spray foam cork'}, {c:'🍷', k:'wine glass red alcohol drink grape cheers fine dine relax stem pour'}, {c:'🍸', k:'cocktail glass martini alcohol drink olive party mixer stir sip fancy'}, {c:'🍹', k:'tropical drink cocktail summer beach umbrella fruit straw alcohol vacation fruit'}, {c:'🍺', k:'beer mug pint alcohol drink foam pub bar yellow glass froth cheers'}, 
                {c:'🍻', k:'beers clink cheers alcohol pub bar toast celebrate party mugs foam glass'}, {c:'🥂', k:'clinking glasses cheers celebrate toast champagne wine party alcohol tall stem'}, {c:'🥃', k:'whiskey glass shot alcohol liquor brown rock ice sip bar pour strong'}, {c:'🥤', k:'cup straw soda drink fast food plastic lid red cold pop beverage sip'}, {c:'🧃', k:'juice box drink apple kid straw fruit sweet pack liquid squeeze lunch'}, {c:'🧉', k:'mate drink tea herb gourd straw south america green leaf brew sip warm'}, {c:'🧊', k:'ice cube cold freeze water square block freeze clear chill melt drink'}
            ]},
            { id: 'activity', name: 'Activity', icon: '⚽', emojis: [
                {c:'⚽', k:'soccer ball football sport kick goal game'}, {c:'🏀', k:'basketball sport hoop dribble court game'}, {c:'🏈', k:'football nfl sport american pigskin throw touchdown'}, {c:'⚾', k:'baseball sport bat pitch hit run game'}, {c:'🥎', k:'softball sport ball yellow pitch hit game'}, {c:'🎾', k:'tennis sport racket court ball match net'}, 
                {c:'🏐', k:'volleyball sport net spike ball beach game'}, {c:'🏉', k:'rugby sport ball scrum field game'}, {c:'🥏', k:'frisbee throw sport dog park disc catch'}, {c:'🎱', k:'pool 8 ball billiards cue table game magic'}, {c:'🪀', k:'yo-yo toy play string spin kid trick'}, {c:'🏓', k:'ping pong table tennis paddle ball net game'}, 
                {c:'🏸', k:'badminton shuttlecock racket sport net hit birdie'}, {c:'🏒', k:'hockey stick puck ice sport goal skate rink'}, {c:'🏑', k:'field hockey stick sport ball grass goal'}, {c:'🥍', k:'lacrosse stick sport net ball field catch'}, {c:'🏏', k:'cricket bat ball sport field wicket pitch'}, {c:'🥅', k:'goal net soccer hockey score point sport'}, 
                {c:'⛳', k:'golf hole flag putt course green club tee'}, {c:'🪁', k:'kite fly wind toy string sky tail park'}, {c:'🏹', k:'archery bow arrow sport target shoot aim hit'}, {c:'🎣', k:'fishing pole catch water hook bait line river'}, {c:'🤿', k:'diving mask snorkel water swim ocean sea breathe'}, {c:'🥊', k:'boxing glove fight punch sport ring hit heavy'}, 
                {c:'🥋', k:'martial arts judo karate uniform taekwondo belt white'}, {c:'🎽', k:'shirt running marathon race track blue sash sport'}, {c:'🛹', k:'skateboard skate sport trick board wheel park tony'}, {c:'🛼', k:'roller skate rink retro 80s wheels blade roll'}, {c:'🛷', k:'sled snow winter ride slide cold ice hill'}, {c:'⛸️', k:'ice skate winter sport blade cold rink glide figure'}, 
                {c:'🥌', k:'curling stone winter sport ice sweep target slide'}, {c:'🎿', k:'ski snow winter sport mountain poles boots downhill'}, {c:'⛷️', k:'skier snow winter sport jump goggles cold fast mountain'}, {c:'🏂', k:'snowboarder snow winter sport mountain halfpipe jump trick'}, {c:'🪂', k:'parachute skydive fall fly extreme jump plane drop'}, {c:'🏋️', k:'weight lifting gym strong workout barbell exercise muscle press'}, 
                {c:'🤼', k:'wrestling fight match ring grapple sport uniform pin'}, {c:'🤸', k:'cartwheel gymnastics flip tumble sport handstand body bend'}, {c:'⛹️', k:'bouncing ball basketball play dribble court sport move player'}, {c:'🤺', k:'fencing sword sport mask poke duel hit foil point'}, {c:'🤾', k:'handball throw sport ball jump court player net hit'}, {c:'🏌️', k:'golfing swing sport putt club green tee fairway drive'}, 
                {c:'🏇', k:'horse racing jockey sport ride fast track animal gallop'}, {c:'🧘', k:'yoga meditate zen relax lotus pose calm peace mind'}, {c:'🏄', k:'surfing wave ocean beach board water sport wetsuit swell'}, {c:'🏊', k:'swimming pool water sport lap dive goggles breathe float'}, {c:'🤽', k:'water polo sport pool ball team throw swim goal'}, {c:'🚣', k:'rowing boat water crew river oar team paddle scull'}, 
                {c:'🧗', k:'climbing rock mountain gear rope wall cliff edge bouldering'}, {c:'🚵', k:'biking mountain bike cycle offroad trail dirt ride wheel'}, {c:'🚴', k:'cyclist bike ride sport street race tour pedal wheel'}, {c:'🏆', k:'trophy win award champion first prize gold cup cup'}, {c:'🥇', k:'1st place medal gold win award ribbon number one prize'}, {c:'🥈', k:'2nd place medal silver award ribbon two second prize runner'}, {c:'🥉', k:'3rd place medal bronze award ribbon three third prize place'}, 
                {c:'🏅', k:'medal award ribbon win sports military glory gold badge neck'}, {c:'🎖️', k:'military medal honor award ribbon badge star pin hero respect'}, {c:'🎗️', k:'reminder ribbon awareness yellow support cause memory knot tie'}, {c:'🎫', k:'ticket admit pass event movie train show cinema stub card'}, {c:'🎟️', k:'admission tickets movie show event concert roll admit stub paper'}, {c:'🎪', k:'circus tent show event clown acrobat fair carnival ring magic'}, 
                {c:'🤹', k:'juggling trick circus play balls hands skill perform clown toss'}, {c:'🎭', k:'performing arts theater drama masks comedy tragedy act play stage'}, {c:'🎨', k:'art palette paint draw creative colors brush canvas artist maker'}, {c:'🎬', k:'clapper board movie film action cut cinema direct hollywood video'}, {c:'🎤', k:'microphone sing karaoke mic music talk podcast stage record stand'}, {c:'🎧', k:'headphone music listen dj audio sound beat earphone gear play'}, 
                {c:'🎼', k:'score music sheet treble clef note staff compose sound written'}, {c:'🎹', k:'musical keyboard piano play keys instrument sound black white melody'}, {c:'🥁', k:'drum beat instrument music band loud stick snare rhythm percussion'}, {c:'🎷', k:'sax saxophone jazz instrument brass music brass band horn blow gold'}, {c:'🎺', k:'trumpet brass instrument music band horn loud blow play gold'}, {c:'🎸', k:'guitar rock instrument band string acoustic electric music strum play'}, 
                {c:'🪕', k:'banjo music instrument country folk string pick pluck play round'}, {c:'🎻', k:'violin strings classical instrument orchestra bow play music fiddle wood'}, {c:'🎲', k:'game die dice random luck casino roll board chance dot number'}, {c:'♟️', k:'pawn chess strategy board game piece black white checkmate move'}, {c:'🎯', k:'bullseye dart target focus aim board game red center hit board'}, {c:'🎳', k:'bowling pin strike alley ball game roll hit spare lane sport'}, 
                {c:'🎮', k:'game controller video games ps xbox play nintendo button pad joy'}, {c:'🎰', k:'slot machine casino gamble 777 lucky spin win jackpot machine coin'}, {c:'🧩', k:'puzzle piece solve logic game fit match connect shape brain autism'}
            ]},
            { id: 'objects', name: 'Objects', icon: '💡', emojis: [
                {c:'👟', k:'shoe running sneaker sports foot fashion walk gym lace'}, {c:'👞', k:'shoe men leather fancy formal dress brown step tie lace'}, {c:'🥾', k:'hiking boot outdoor shoe walk mountain trail camp brown lace'}, {c:'🥿', k:'flat shoe ballet slip on fashion comfortable simple women foot'}, {c:'👠', k:'high heel stiletto fashion shoe women fancy tall red dress'}, 
                {c:'👡', k:'sandal summer shoe foot open strap beach warm casual walk'}, {c:'🩰', k:'ballet shoes dance pointe pink lace tie stage perform grace'}, {c:'👢', k:'boot winter shoe fashion leather cowgirl rain protect tall brown'}, {c:'🕶️', k:'sunglasses cool shades sun summer black protect glasses eye fashion'}, {c:'👓', k:'glasses nerd see sight read vision lens frame eye smart'}, {c:'🥽', k:'goggles swim protect eye lab science pool water dive strap safety'}, 
                {c:'🥼', k:'lab coat doctor science white medical hospital doctor chemistry long jacket'}, {c:'🦺', k:'safety vest orange construction guard reflect protect work visibility neon strip'}, {c:'👔', k:'tie suit formal business office neck boss work dress sharp collar'}, {c:'👕', k:'t-shirt shirt clothes casual blue short sleeve wear top cotton plain'}, {c:'👖', k:'jeans pants denim clothes blue legs wear casual tough denim blue'}, {c:'🧣', k:'scarf winter warm neck red wrap cold clothes knit fashion wool'}, 
                {c:'🧤', k:'gloves winter warm hands cold snow protect hand cover knit clothing'}, {c:'🧥', k:'coat jacket winter warm clothes outwear cold snow protect cover thick'}, {c:'🧦', k:'socks feet warm clothes pair cotton foot cover ankle stripe gym'}, {c:'👗', k:'dress fashion girl clothes blue women piece one flow party skirt'}, {c:'👘', k:'kimono japan traditional dress robe culture wrap cloth pattern long silk'}, {c:'🥻', k:'sari india dress fashion culture traditional wrap color bright long silk'}, 
                {c:'🩱', k:'swimsuit bathing suit beach summer pool swim one piece color women'}, {c:'🩲', k:'briefs underwear pants white men boy clothes inner under tight cloth'}, {c:'🩳', k:'shorts pants summer beach legs short run sport casual cloth active'}, {c:'👙', k:'bikini swimsuit beach summer hot pool women two piece tie sun'}, {c:'👚', k:'clothes blouse shirt top pink women girl female wear collar button'}, {c:'👛', k:'purse coin bag money wallet pink snap pocket cash lady fashion'}, 
                {c:'👜', k:'handbag fashion bag lady leather carry handle strap women accessory tote'}, {c:'👝', k:'pouch bag makeup zip small carry cosmetic pencil case zipper accessory'}, {c:'🛍️', k:'shopping bags buy store mall retail gift paper carry buy color'}, {c:'🎒', k:'backpack school travel bag bag pack strap carry student hike camp'}, {c:'👑', k:'crown king queen royal prince gold jewel rule power hat monarch'}, {c:'👒', k:'hat sun lady fashion beach straw green ribbon wide brim summer'}, 
                {c:'🎩', k:'top hat magic fancy gentleman black tall formal prom trick rabbit'}, {c:'🎓', k:'grad cap school college smart diploma university student hat tassel ceremony'}, {c:'🧢', k:'cap baseball hat casual blue sport head cover brim team fashion'}, {c:'⛑️', k:'helmet rescue safety red cross hard hat protect head construction work'}, {c:'📿', k:'beads prayer religion rosary necklace chain meditate faith spirit god monk'}, {c:'💄', k:'lipstick makeup beauty kiss fashion red lips cosmetic paint tube gloss'}, 
                {c:'💍', k:'ring diamond engagement marry propose jewel gold band love promise finger'}, {c:'💎', k:'gem diamond jewel shiny rich blue stone precious sparkle luxury rock'}, {c:'⌚', k:'watch time clock wrist apple tick smart accessory band wear metal'}, {c:'📱', k:'mobile phone call iphone app cellular screen device text talk text'}, {c:'💻', k:'computer laptop mac pc tech code work screen keyboard type portable'}, {c:'⌨️', k:'keyboard type computer tech keys board button input office typing tech'}, 
                {c:'🖥️', k:'desktop computer pc mac monitor screen display work desk screen stand'}, {c:'🖨️', k:'printer paper ink tech office copy page document machine output tray'}, {c:'🖱️', k:'mouse computer tech click scroll point wire desktop input peripheral device'}, {c:'🖲️', k:'trackball mouse computer tech input roll wheel point control device ball'}, {c:'🕹️', k:'joystick game play arcade retro stick controller video game button vintage'}, {c:'🗜️', k:'clamp tool vice squeeze press hold tighten fix tool hardware metal'}, 
                {c:'💽', k:'minidisc music retro disc storage save player record audio data media'}, {c:'💾', k:'floppy disk save retro computer tech storage 90s data square magnetic'}, {c:'💿', k:'cd disc music compact software silver circle data optical store record'}, {c:'📀', k:'dvd disc movie video gold circle data optical store film record'}, {c:'📼', k:'vhs tape video retro movie cassette black box film record 90s'}, {c:'📷', k:'camera photo picture shoot lens snap focus flash capture image device'}, 
                {c:'📸', k:'flash camera photo snap flash pop light burst capture picture device'}, {c:'📹', k:'video camera record tape shoot film movie camcorder tape memory shoot'}, {c:'🎥', k:'movie camera film cinema video tape direct shoot hollywood record studio'}, {c:'📽️', k:'projector movie film cinema reel screen play light show reel beam'}, {c:'🎞️', k:'film frames movie cinema picture strip roll reel negative photo cell'}, {c:'📞', k:'telephone call phone dial ring receiver talk hear handset talk connection'}, 
                {c:'☎️', k:'phone telephone red classic dial call retro talk hear wire bell'}, {c:'📟', k:'pager retro tech beep message green screen pocket device 90s doctor'}, {c:'📠', k:'fax machine print office paper copy scan send machine paper phone'}, {c:'📺', k:'tv television watch show video screen broadcast tube antenna retro screen'}, {c:'📻', k:'radio listen music broadcast retro news tune frequency boombox fm am'}, {c:'🎙️', k:'mic microphone podcast sing voice audio record studio radio voice stand'}, 
                {c:'🎚️', k:'level slider audio mix volume studio eq control fade panel music'}, {c:'🎛️', k:'knobs audio mix control dial studio eq spin panel twist button'}, {c:'🧭', k:'compass navigate north direction map south east west needle magnetic tool'}, {c:'⏱️', k:'stopwatch time track race run fast lap clock click button speed'}, {c:'⏲️', k:'timer clock kitchen cook count wait dial bake tick measure time'}, {c:'⏰', k:'clock alarm time wake morning bell ring tick sleep alert red'}, 
                {c:'🕰️', k:'mantelpiece clock vintage time old wood tick tock shelf antique hands'}, {c:'⌛', k:'hourglass time sand wait slow done empty run out fall glass'}, {c:'⏳', k:'sand hourglass time wait flow ticking passing trickling glass measure speed'}, {c:'📡', k:'satellite dish space signal radar broadcast transmission tower space radio network'}, {c:'🔋', k:'battery power charge energy low full green cell phone die alive'}, {c:'🔌', k:'plug power outlet cord electric wire wall charge connect ac cable'}, 
                {c:'💡', k:'bulb light idea bright genius electric glass shine thought eureka glow'}, {c:'🔦', k:'flashlight light dark see beam electric torch shine handheld search beam'}, {c:'🕯️', k:'candle wax light fire dark flame scent melt wick burn romantic'}, {c:'🪔', k:'diya lamp oil light india dipawali fest flame culture burn wick mud'}, {c:'🧱', k:'brick wall build red block house construction mason stack mortar clay'}, {c:'🧯', k:'extinguisher fire red safety emergency put out spray cylinder stop foam flame'}, 
                {c:'🛢️', k:'oil drum barrel fuel gas slick spill blue metal container toxic leak'}, {c:'💸', k:'money fly cash spend rich pay loss dollar wings poor broke lose'}, {c:'💵', k:'dollar bill money cash buck green pay paper currency wealth fiat stack'}, {c:'💴', k:'yen money japan bill cash currency pay paper wealth asia fiat note'}, {c:'💶', k:'euro money europe bill cash currency pay paper wealth union fiat note'}, {c:'💷', k:'pound money uk british bill cash pay paper wealth england fiat note'}, 
                {c:'💰', k:'moneybag rich wealth cash gold stash bag dollar tie sack thief bank'}, {c:'💳', k:'credit card pay swipe plastic money buy debit charge bank shop debt'}, {c:'⚖️', k:'scale balance law justice court equal judge weigh fair lawyer weight court'}, {c:'🧰', k:'toolbox box fix build repair work mechanic tools metal box heavy handle'}, {c:'🔧', k:'wrench tool fix build tighten mechanic hardware metal turn nut socket'}, {c:'🔨', k:'hammer tool fix build hit nail smash hardware bang strike carpentry metal'}, 
                {c:'⚒️', k:'hammer pick tool mine build work fix pickaxe cross dwarf rock stone'}, {c:'🛠️', k:'tools wrench hammer fix repair build mechanic crossed workshop diy handy metal'}, {c:'⛏️', k:'pick pickaxe tool mine dig rock break stone minecraft metal strike ground'}, {c:'🔩', k:'bolt nut screw tool fix metal hardware build twist thread turn hardware'}, {c:'⚙️', k:'gear cog machine fix mechanic settings engine spin wheel teeth metal system'}, {c:'⛓️', k:'chains metal link bind heavy steel restrict prison locked jail iron link'}, 
                {c:'🔫', k:'pistol gun weapon shoot bang water squirt toy green plastic squirt shoot'}, {c:'💣', k:'bomb explode blast boom kaboom fuse danger explosive black war destruction loud'}, {c:'🧨', k:'firecracker explode boom spark bang fuse pop new year red china dynamite'}, {c:'🪓', k:'axe hatchet tool chop wood cut tree lumberjack split blade handle weapon'}, {c:'🔪', k:'knife cut slice stab sharp kitchen cook chef weapon blade metal handle'}, {c:'🗡️', k:'dagger knife sword cut stab weapon sharp combat fight blade fantasy handle'}, 
                {c:'⚔️', k:'swords cross battle fight weapon knight medieval war duel blade metal sharp'}, {c:'🛡️', k:'shield protect defend block armor knight battle guard save fantasy metal crest'}, {c:'🚬', k:'smoking cigarette puff tobacco smoke ash habit unhealthy drag cancer light burn'}, {c:'⚰️', k:'coffin dead bury funeral death grave vampire dracula box wood rip tomb'}, {c:'⚱️', k:'urn ash dead jar pot vase funeral bury creamation vessel urn rip ceramic'}, {c:'🏺', k:'amphora vase pot jar ancient greek rome clay vessel jug handle history'}, 
                {c:'🔮', k:'crystal ball future magic fortune teller predict purple glass psychic future see'}, {c:'📿', k:'beads prayer necklace rosary religion spiritual chain meditate god islam chant count'}, {c:'🧿', k:'nazar amulet evil eye protect charm blue greek turkish lucky circle eye bead'}, {c:'💈', k:'barber pole hair cut salon shave stripe red blue white spiral spin twist'}, {c:'⚗️', k:'alembic chemistry science flask lab potion distill glass brew beaker magic liquid'}, {c:'🔭', k:'telescope star space astronomy glass look see far lens zoom sky planet look'}, 
                {c:'🔬', k:'microscope science lab zoom look small biology cell tech tool lens focus micro'}, {c:'🕳️', k:'hole black empty dark drop fall pit abyss space deep trap abyss ground'}, {c:'💊', k:'pill medicine drug sick heal health doctor pharmacy cure treat capsule dose med'}, {c:'💉', k:'syringe needle shot drug doctor sick blood heal cure hospital vaccine blood drawn'}, {c:'🩸', k:'blood drop red fluid hurt bleed cut period vamp heal liquid red body leak'}, {c:'🩹', k:'bandage bandaid heal hurt cut scrape stick stick patch fix plaster skin wound'}, 
                {c:'🩺', k:'stethoscope doctor listen heart beat chest health sick clinic pulse breath ear tube'}, {c:'🧬', k:'dna spiral helix gene science biology code life strand trait medical curve chain'}, {c:'🚪', k:'door wood open close enter exit room home house knob portal walk through panel'}, {c:'🛏️', k:'bed sleep rest lie night room home house mattress comfort blanket pillow frame'}, {c:'🛋️', k:'couch sofa sit rest room furniture home lounge house cushion living relax lazy'}, {c:'🪑', k:'chair sit rest wood furniture seat room home house table dining stool leg four'}, 
                {c:'🚽', k:'toilet bathroom washroom flush pee poop pot seat water home bowl plumbing crap'}, {c:'🚿', k:'shower wash bathroom water clean soap wet home bathe washroom spray head rinse'}, {c:'🛁', k:'bath tub wash soap water clean wet bubble bathroom home soak ceramic suds'}, {c:'🪒', k:'razor shave cut hair sharp bathroom tool barber blade groom facial skin handle'}, {c:'🧴', k:'lotion cream soap bottle squeeze smooth rub skin sun block moisture pump hygiene'}, {c:'🧷', k:'pin safety needle tack attach hold metal secure stick fasten diaper clip cloth'}, 
                {c:'🧹', k:'broom sweep clean brush floor dust house tidy witch wood straw handle dirt'}, {c:'🧺', k:'basket laundry carry picnic weave wood clothes home carry store handle hamper wicker'}, {c:'🧻', k:'paper roll toilet wipe bathroom tissue wipe sheet clean soft tube hygiene clean'}, {c:'🧼', k:'soap wash clean bubble bathroom hand froth suds scrub fresh bar slide lather'}, {c:'🧽', k:'sponge wash clean wipe scrub absorb dish kitchen soft yellow porous soak scrub'}, {c:'🛒', k:'cart shop buy grocery store supermarket wheel market buy push basket metal roll'},
                // Adding some generic tech items for developer context (Goorac related)
                {c:'📡', k:'antenna signal broadcast connection wifi internet transmit space tech radar'}, {c:'🛰️', k:'satellite space orbit tech signal transmit gps connection beam machine array'}
            ]},
            { id: 'symbols', name: 'Symbols', icon: '❤️', emojis: [
                {c:'❤️', k:'heart red love like passion romance true'}, {c:'🧡', k:'orange heart love warm friend'}, {c:'💛', k:'yellow heart love happy sun friend'}, {c:'💚', k:'green heart love nature envy money earth'}, {c:'💙', k:'blue heart love water cold sad sad'}, 
                {c:'💜', k:'purple heart love magic royal'}, {c:'🖤', k:'black heart love dark goth sad emotion'}, {c:'🤍', k:'white heart love pure clean snow peace'}, {c:'🤎', k:'brown heart love chocolate wood earth'}, {c:'💔', k:'broken heart love sad split tear ache'}, 
                {c:'❣️', k:'exclamation heart red love point mark heavy'}, {c:'💕', k:'two hearts love romance pair sweet double'}, {c:'💞', k:'revolving hearts love orbit spin sweet moving'}, {c:'💓', k:'beating heart love pulse beat alive throb'}, {c:'💗', k:'growing heart love big beat swell expand'}, 
                {c:'💖', k:'sparkling heart love shine bright star magic'}, {c:'💘', k:'arrow heart love cupid hit strike target'}, {c:'💝', k:'ribbon heart love gift wrap box present'}, {c:'💟', k:'decoration heart love box purple frame stamp'}, {c:'☮️', k:'peace sign symbol hippie calm harmony stop war'}, 
                {c:'✝️', k:'cross religion christian jesus god faith pray holy'}, {c:'☪️', k:'star crescent islam religion muslim moon faith pray'}, {c:'🕉️', k:'om hinduism religion symbol god spirit faith india'}, {c:'☸️', k:'dharma wheel buddhism religion symbol faith path karma'}, {c:'✡️', k:'star david judaism religion jewish hexagram faith israel'}, 
                {c:'🔯', k:'six star purple hexagram magic pattern symbol decor'}, {c:'🕎', k:'menorah judaism religion light candle hanukkah jewish god'}, {c:'☯️', k:'yin yang taoism religion balance zen peace harmony symbol'}, {c:'☦️', k:'orthodox cross religion christian god faith pray symbol'}, {c:'🛐', k:'worship pray religion sign faith kneel god pray bow'}, 
                {c:'⛎', k:'ophiuchus zodiac sign astrology star snake symbol space'}, {c:'♈', k:'aries zodiac sign ram star astrology horoscope space symbol'}, {c:'♉', k:'taurus zodiac sign bull star astrology horoscope space symbol'}, {c:'♊', k:'gemini zodiac sign twins star astrology horoscope space symbol'}, {c:'♋', k:'cancer zodiac sign crab star astrology horoscope space symbol'}, 
                {c:'♌', k:'leo zodiac sign lion star astrology horoscope space symbol'}, {c:'♍', k:'virgo zodiac sign maiden star astrology horoscope space symbol'}, {c:'♎', k:'libra zodiac sign scales star astrology horoscope space symbol'}, {c:'♏', k:'scorpio zodiac sign scorpion star astrology horoscope space symbol'}, {c:'♐', k:'sagittarius zodiac sign archer star astrology horoscope space symbol'}, 
                {c:'♑', k:'capricorn zodiac sign goat star astrology horoscope space symbol'}, {c:'♒', k:'aquarius zodiac sign water bearer star astrology horoscope space symbol'}, {c:'♓', k:'pisces zodiac sign fish star astrology horoscope space symbol'}, {c:'🆔', k:'id identification badge card recognize sign name symbol face'}, {c:'⚛️', k:'atom science physics energy biology chemistry atom power nuclear'}, 
                {c:'🉑', k:'accept agree ok yes allow approve sign symbol pass'}, {c:'☢️', k:'radioactive hazard danger warn nuclear toxic poison bad symbol'}, {c:'☣️', k:'biohazard danger hazard toxic poison bad warn death symbol'}, {c:'📴', k:'mobile off phone silent turn off no phone quiet cell'}, {c:'📳', k:'vibration mode phone shake silent ring mobile turn on buzz'}, 
                {c:'🈶', k:'have possess own rich hold get claim sign chinese mark'}, {c:'🈚', k:'no none empty void hollow lack nil sign chinese mark'}, {c:'🈸', k:'application form ask plead beg request sign chinese symbol'}, {c:'🈺', k:'open business work run start go sign chinese store shop'}, {c:'🈷️', k:'month moon time date calendar sign chinese period sign symbol'}, 
                {c:'✴️', k:'eight star point shape shine edge symbol decor mark sign'}, {c:'🆚', k:'vs versus against combat fight battle match game score box'}, {c:'💮', k:'white flower stamp seal sign mark good well done japan print'}, {c:'🉐', k:'advantage benefit win gain profit get sign chinese earn deal'}, {c:'㊙️', k:'secret hide unknown private top lock sign chinese sign mark'}, 
                {c:'㊗️', k:'congrats praise happy win bless party sign chinese wish gift'}, {c:'🈴', k:'match combine join fit together sign chinese merge hook unite'}, {c:'🈵', k:'full filled capacity pack complete sign chinese whole round done'}, {c:'🈹', k:'discount sale price cut lower save sign chinese deal retail'}, {c:'🈲', k:'prohibit ban stop no halt forbid sign chinese law stop warn'}, 
                {c:'🅰️', k:'a letter alphabet blood type first score letter red symbol mark'}, {c:'🅱️', k:'b letter alphabet blood type score second letter red symbol mark'}, {c:'🆎', k:'ab letter alphabet blood type rare red symbol sign mark blood'}, {c:'🆑', k:'cl clear clean wipe delete back clear red symbol mark blank'}, {c:'🅾️', k:'o letter alphabet blood type zero circle letter red symbol mark blood'}, 
                {c:'🆘', k:'sos help save danger emergency distress red alert mark warn'}, {c:'❌', k:'cross mark x no wrong stop incorrect error red false fail'}, {c:'⭕', k:'circle mark o round correct yes true hollow red ring hollow'}, {c:'🛑', k:'stop sign halt danger warning alert block red stop sign wait'}, {c:'⛔', k:'no entry sign stop danger block forbidden warn red stop ban'}, 
                {c:'📛', k:'name badge label tag hello indentify flame red shield title'}, {c:'🚫', k:'prohibited stop ban no halt restrict block sign symbol forbid'}, {c:'💯', k:'hundred score percent perfect 100 grade full test pass win best'}, {c:'💢', k:'anger angry mad symbol pop vein explode rage blast emotion tick'}, {c:'♨️', k:'hot springs heat warm water steam bath relax boil boil sign symbol'}, 
                {c:'🚷', k:'no pedestrians walk stop ban street sign forbid sign warn block symbol'}, {c:'🚯', k:'no litter trash garbage stop ban clean waste sign warn block symbol'}, {c:'🚳', k:'no bikes bicycle stop ban road sign path forbid warn block symbol'}, {c:'🚱', k:'no water drink stop ban hazard toxic bad sign warn block symbol'}, {c:'🔞', k:'under 18 age limit minor adult ban stop forbid sign warn block symbol'}, 
                {c:'📵', k:'no phones cell stop ban quiet device mute sign warn block symbol'}, {c:'🚭', k:'no smoking cigarette stop ban clear sign warn block symbol health'}, {c:'❗', k:'exclamation point mark punctuation alert red danger warning yell shout'}, {c:'❕', k:'white exclamation point mark punctuation alert grey plain shout mark'}, {c:'❓', k:'question point mark punctuation red ask huh wtf what query doubt'}, 
                {c:'❔', k:'white question point mark punctuation grey ask huh what query plain'}, {c:'‼️', k:'double exclamation point mark punctuation red alert danger warning shout fast'}, {c:'⁉️', k:'interrobang question exclamation mark alert ask wtf shock surprise punct'}, {c:'🔅', k:'dim brightness sun low light down gear down less setting control'}, {c:'🔆', k:'bright brightness sun high light up gear up more setting shine'}, 
                {c:'〽️', k:'part alternation mark line yellow wave up down trace symbol note mark'}, {c:'⚠️', k:'warning triangle danger alert sign hazard caution stop beware sign'}, {c:'🚸', k:'children crossing walk road sign kid school caution warn sign path'}, {c:'🔱', k:'trident weapon pitchfork poseidon sea fork gold symbol tool prong'}, {c:'⚜️', k:'fleur de lis lily gold scout sign french symbol flower rank emblem'}, 
                {c:'🔰', k:'beginner sign start learning new leaf japan green yellow shape symbol'}, {c:'♻️', k:'recycle sign green save earth eco friendly repeat loop paper plastic'}, {c:'✅', k:'check mark correct yes green true pass approved done tick right ok'}, {c:'🈯', k:'reserved seat hold keep space open sign mark chinese sign label box'}, {c:'💹', k:'chart green up line graph trend stock money rise grow arrow eco'}, 
                {c:'❇️', k:'sparkle green flash shape diamond mark sign star blink blink decor'}, {c:'✳️', k:'asterisk star point eight green star shape mark sign note multi math'}, {c:'❎', k:'cross box mark x green false error wrong deny button ban stop close'}, {c:'🌐', k:'globe grid earth world web global net www map sphere internet link'}, {c:'💠', k:'diamond shape blue gem crystal point frame dot decor pattern shape'}, 
                {c:'Ⓜ️', k:'m letter alphabet blue circle metro subway train sign mark initial'}, {c:'🌀', k:'cyclone storm hurricane blue wind weather tornado swirl spin twist dizzy'}, {c:'💤', k:'zzz sleep tired snore rest exhausted blue bed dream nap night snore'}, {c:'🏧', k:'atm cash money bank machine draw blue sign dollar finance withdraw'}, {c:'🚾', k:'wc toilet bathroom washroom blue sign pee pot rest public water'}, 
                {c:'♿', k:'wheelchair blue handicap disabled walk aid sign access park roll sit'}, {c:'🅿️', k:'parking car letter p blue sign street lot spot space block leave'}, {c:'🈳', k:'vacancy empty free available room space sign mark chinese box void'}, {c:'🈂️', k:'service free provided help charge box sign mark japanese box gratis'}, {c:'🛂', k:'passport control travel check border identity security blue sign stamp pass'}, 
                {c:'🛃', k:'customs border travel bag check box blue sign tax duty luggage pass'}, {c:'🛄', k:'baggage claim luggage bag travel belt blue sign case take pickup'}, {c:'🛅', k:'locker luggage bag key safe keep store travel blue sign hide lock'}, {c:'🚹', k:'mens room bathroom toilet man male sign blue wash boy pee pee'}, {c:'🚺', k:'womens room bathroom toilet woman female lady sign wash girl pee pee'}, 
                {c:'🚼', k:'baby sign bathroom change washroom kid child infant care blue safe'}, {c:'🚻', k:'restroom toilet bathroom male female man woman sign blue wash men'}, {c:'🚮', k:'litter bin sign trash garbage clean throw recycle blue pot drop drop'}, {c:'🎦', k:'cinema film movie theater play watch show ticket sign tape blue cam'}, {c:'📶', k:'signal strength bar phone wifi connection network tower blue connect cell'}, 
                {c:'🈁', k:'koko here this place direction box sign mark japanese box map spot'}, {c:'🔣', k:'symbols sign input math char type ampersand character alt shift type'}, {c:'ℹ️', k:'info information letter i help sign guide blue mark query detail tell'}, {c:'🔤', k:'abc lowercase letter alphabet text type input string char type shift'}, {c:'🔡', k:'abcd lowercase letter alphabet text type input string char type shift'}, 
                {c:'🔠', k:'capital uppercase letter alphabet text type input string char shift caps'}, {c:'🆖', k:'ng no good bad fail flop error sign mark box block red stop deny'}, {c:'🆗', k:'ok okay yes fine agree approve pass clear sign blue mark word box'}, {c:'🆙', k:'up word point high sky rise raise increase top blue sign level lift'}, {c:'🆒', k:'cool word sign slang nice blue chill vibe great mark word text font'}, 
                {c:'🆕', k:'new word sign recent fresh release start box blue mark box word font'}, {c:'🆓', k:'free word sign open no charge gratis gratis box blue mark save text'}, {c:'0️⃣', k:'zero number digit 0 box zero sign rank count null zero math blue'}, {c:'1️⃣', k:'one number digit 1 box one sign rank count first top math blue'}, {c:'2️⃣', k:'two number digit 2 box two sign rank count second pair math blue'}, 
                {c:'3️⃣', k:'three number digit 3 box three sign rank count third trio math blue'}, {c:'4️⃣', k:'four number digit 4 box four sign rank count forth quad math blue'}, {c:'5️⃣', k:'five number digit 5 box five sign rank count fifth quint math blue'}, {c:'6️⃣', k:'six number digit 6 box six sign rank count sixth hex math blue'}, {c:'7️⃣', k:'seven number digit 7 box seven sign rank count lucky math blue'}, 
                {c:'8️⃣', k:'eight number digit 8 box eight sign rank count oct math blue'}, {c:'9️⃣', k:'nine number digit 9 box nine sign rank count math blue'}, {c:'🔟', k:'ten number digit 10 box ten sign rank count math blue perfect full'}, {c:'🔢', k:'numbers sign input math char type digit count hash grid 123 sum type'}, {c:'#️⃣', k:'hash tag pound key sign sharp grid number box type string id rank'}, 
                {c:'*️⃣', k:'star asterisk point sign key type box star point multi times math'}, {c:'⏏️', k:'eject play button remove quit out up pop eject push disc drive arrow'}, {c:'▶️', k:'play arrow right fast forward media go start action start tape drive'}, {c:'⏸️', k:'pause two lines media stop halt freeze wait rest break media hold break'}, {c:'⏯️', k:'play pause arrow right media start stop flip toggle switch action break'}, 
                {c:'⏹️', k:'stop square halt end quit media finish stop red wait no hold end'}, {c:'⏺️', k:'record circle round media tape store keep red camera tape hit mic'}, {c:'⏭️', k:'next forward arrow skip fast advance media skip jump hop go speed next'}, {c:'⏮️', k:'prev backward arrow skip rewind media back turn jump rear slow last'}, {c:'⏩', k:'fast fwd double arrow right skip media speed zoom rush run go next'}, 
                {c:'⏪', k:'rewind double arrow left skip media reverse back return rear look past'}, {c:'⏫', k:'fast up double arrow up top speed rise jump ascend lift rise peak'}, {c:'⏬', k:'fast down double arrow down bottom speed drop fall sink low drop'}, {c:'◀️', k:'reverse arrow left back return rear look left point direction left go'}, {c:'🔼', k:'up arrow triangle point top high ceiling lift sky roof rise peak go'}, 
                {c:'🔽', k:'down arrow triangle point bottom low floor drop sink ground down fall'}, {c:'➡️', k:'right arrow point direction right go next lead straight path road turn'}, {c:'⬅️', k:'left arrow point direction left go back turn return side cross way shift'}, {c:'⬆️', k:'up arrow point direction sky top rise ascend high lift sky jump top'}, {c:'⬇️', k:'down arrow point direction floor low drop sink ground depth dive bottom'}, 
                {c:'↗️', k:'up right arrow point direction angle rise growth positive angle pitch lean'}, {c:'↘️', k:'down right arrow point direction angle drop fall sink angle dive loss'}, {c:'↙️', k:'down left arrow point direction angle return fall back back tilt sink angle'}, {c:'↖️', k:'up left arrow point direction angle rise back retreat angle tilt bank angle'}, {c:'↕️', k:'up down arrow double point direction vertical height tall long rise pan drop'}, 
                {c:'↔️', k:'left right arrow double point direction horizontal wide span pan slide broad'}, {c:'🔄', k:'counterclockwise arrow circle spin turn flip reload sync cycle round loop refresh'}, {c:'↪️', k:'right curv arrow point direction bend turn right loop snake wrap twist'}, {c:'↩️', k:'left curv arrow point direction bend turn left return loop bounce curve wrap'}, {c:'⤴️', k:'curv up arrow point direction rise sweep jump curve wave arc loft swoop'}, 
                {c:'⤵️', k:'curv down arrow point direction drop sink fall dip arc drop scoop swing'}, {c:'🔀', k:'shuffle media arrows mix swap random twist interlace thread twine media'}, {c:'🔁', k:'repeat media arrows cycle round loop round sync again replay refresh renew'}, {c:'🔂', k:'repeat one media arrows cycle round loop one track single replay loop solo'}
            ]},
            { id: 'flags', name: 'Flags', icon: '🏳️', emojis: [
                {c:'🏳️', k:'white flag surrender peace truce blank clear color wind'}, {c:'🏳️‍🌈', k:'rainbow flag pride lgbtq color gay parade love peace'}, {c:'🏳️‍⚧️', k:'transgender flag trans lgbtq pride rights color blue pink'}, {c:'🏴', k:'black flag pirate dark protest shadow color wave bold empty'}, 
                {c:'🏁', k:'checkered flag finish race win nascar sport track end square line'}, {c:'🚩', k:'triangular flag red danger alert mark point spot wind warning'}, {c:'🎌', k:'crossed flags japan holiday celebrate event cheer festival wave parade'}, {c:'🏴‍☠️', k:'pirate flag jolly roger skull crossbones death danger sea steal boat'}, 
                {c:'🇺🇳', k:'un flag united nations global world peace earth union group'}, {c:'🇦🇫', k:'afghanistan flag nation country middle east kaboul asian asia'}, {c:'🇦🇱', k:'albania flag nation country europe balkan balkan eagle red'}, {c:'🇩🇿', k:'algeria flag nation country africa north arab star crescent green'}, 
                {c:'🇦🇸', k:'american samoa flag nation country island oceania pacific eagle'}, {c:'🇦🇩', k:'andorra flag nation country europe iberia spain french shield'}, {c:'🇦🇴', k:'angola flag nation country africa machete gear star red black'}, {c:'🇦🇮', k:'anguilla flag nation country caribbean island uk union blue shield'}, 
                {c:'🇦🇶', k:'antarctica flag nation continent south pole cold ice map white blue'}, {c:'🇦🇬', k:'antigua flag nation country caribbean sun island sand sea v'}, {c:'🇦🇷', k:'argentina flag nation country south america sun blue white messi'}, {c:'🇦🇲', k:'armenia flag nation country asia europe caucasus red blue orange'}, 
                {c:'🇦🇼', k:'aruba flag nation country caribbean island star blue yellow'}, {c:'🇦🇺', k:'australia flag nation country oceania down under star uk blue'}, {c:'🇦🇹', k:'austria flag nation country europe red white alps'}, {c:'🇦🇿', k:'azerbaijan flag nation country caucasus asia star crescent fire'}, 
                {c:'🇧🇸', k:'bahamas flag nation country caribbean island black yellow blue'}, {c:'🇧🇭', k:'bahrain flag nation country middle east arab red white'}, {c:'🇧🇩', k:'bangladesh flag nation country asia sun green red circle'}, {c:'🇧🇧', k:'barbados flag nation country caribbean trident island blue yellow'}, 
                {c:'🇧🇾', k:'belarus flag nation country europe red green pattern'}, {c:'🇧🇪', k:'belgium flag nation country europe black yellow red waffle'}, {c:'🇧🇿', k:'belize flag nation country central america shield blue red'}, {c:'🇧🇯', k:'benin flag nation country africa green yellow red'}, 
                {c:'🇧🇲', k:'bermuda flag nation country caribbean island uk red shield'}, {c:'🇧🇹', k:'bhutan flag nation country asia dragon orange yellow himalaya'}, {c:'🇧🇴', k:'bolivia flag nation country south america red yellow green shield'}, {c:'🇧🇦', k:'bosnia flag nation country europe balkan star yellow blue'}, 
                {c:'🇧🇼', k:'botswana flag nation country africa light blue black white'}, {c:'🇧🇷', k:'brazil flag nation country south america green yellow blue star soccer'}, {c:'🇮🇴', k:'british indian ocean flag territory island uk blue wave palm crown'}, {c:'🇻🇬', k:'british virgin islands flag territory caribbean uk blue shield'}, 
                {c:'🇧🇳', k:'brunei flag nation country asia yellow black white crest'}, {c:'🇧🇬', k:'bulgaria flag nation country europe balkan white green red'}, {c:'🇧🇫', k:'burkina faso flag nation country africa red green star pan'}, {c:'🇧🇮', k:'burundi flag nation country africa star green red white cross'}, 
                {c:'🇰🇭', k:'cambodia flag nation country asia angkor wat blue red'}, {c:'🇨🇲', k:'cameroon flag nation country africa green red yellow star'}, {c:'🇨🇦', k:'canada flag nation country north america maple leaf red white'}, {c:'🇮🇨', k:'canary islands flag territory spain africa island white blue yellow dogs'}, 
                {c:'🇨🇻', k:'cape verde flag nation country africa island blue white red stars'}, {c:'🇧🇶', k:'caribbean netherlands flag territory island star blue red white'}, {c:'🇰🇾', k:'cayman islands flag territory caribbean uk blue shield'}, {c:'🇨🇫', k:'central african republic flag nation country africa blue white green yellow red star'}, 
                {c:'🇹🇩', k:'chad flag nation country africa blue yellow red'}, {c:'🇨🇱', k:'chile flag nation country south america star blue white red'}, {c:'🇨🇳', k:'china flag nation country asia star red yellow'}, {c:'🇨🇽', k:'christmas island flag territory oceania bird star green blue yellow'}, 
                {c:'🇨🇨', k:'cocos islands flag territory oceania palm star moon green yellow'}, {c:'🇨🇴', k:'colombia flag nation country south america yellow blue red'}, {c:'🇰🇲', k:'comoros flag nation country africa island moon star yellow white red blue'}, {c:'🇨🇬', k:'congo brazzaville flag nation country africa green yellow red line'}, 
                {c:'🇨🇩', k:'congo kinshasa flag nation country africa blue star red yellow drc'}, {c:'🇨🇰', k:'cook islands flag territory oceania star circle blue uk'}, {c:'🇨🇷', k:'costa rica flag nation country central america blue white red shield'}, {c:'🇨🇮', k:'cote divoire flag nation country africa ivory coast orange white green'}, 
                {c:'🇭🇷', k:'croatia flag nation country europe balkan red white blue shield checker'}, {c:'🇨🇺', k:'cuba flag nation country caribbean star blue white red triangle'}, {c:'🇨🇼', k:'curacao flag territory caribbean star blue yellow island'}, {c:'🇨🇾', k:'cyprus flag nation country europe mediterranean map olive orange white'}, 
                {c:'🇨🇿', k:'czechia flag nation country europe czech republic blue white red triangle'}, {c:'🇩🇰', k:'denmark flag nation country europe nordic cross red white'}, {c:'🇩🇯', k:'djibouti flag nation country africa light blue green white red star'}, {c:'🇩🇲', k:'dominica flag nation country caribbean island green bird cross star'}, 
                {c:'🇩🇴', k:'dominican republic flag nation country caribbean island cross blue red white shield'}, {c:'🇪🇨', k:'ecuador flag nation country south america yellow blue red shield eagle'}, {c:'🇪🇬', k:'egypt flag nation country africa arab red white black eagle'}, {c:'🇸🇻', k:'el salvador flag nation country central america blue white shield'}, 
                {c:'🇬🇶', k:'equatorial guinea flag nation country africa green white red blue triangle tree'}, {c:'🇪🇷', k:'eritrea flag nation country africa green red blue triangle branch'}, {c:'🇪🇪', k:'estonia flag nation country europe baltic blue black white'}, {c:'🇪🇹', k:'ethiopia flag nation country africa green yellow red star pentagram'}, 
                {c:'🇪🇺', k:'european union flag europe stars circle blue eu symbol union'}, {c:'🇫🇰', k:'falkland islands flag territory ocean uk shield blue sheep'}, {c:'🇫🇴', k:'faroe islands flag territory nordic cross white blue red denmark'}, {c:'🇫🇯', k:'fiji flag nation country oceania island blue uk shield pigeon'}, 
                {c:'🇫🇮', k:'finland flag nation country europe nordic cross white blue'}, {c:'🇫🇷', k:'france flag nation country europe blue white red french paris'}, {c:'🇬🇫', k:'french guiana flag territory south america star yellow green red'}, {c:'🇵🇫', k:'french polynesia flag territory oceania red white boat sun french'}, 
                {c:'🇹🇫', k:'french southern territories flag territory oceania french letters stars shield'}, {c:'🇬🇦', k:'gabon flag nation country africa green yellow blue'}, {c:'🇬🇲', k:'gambia flag nation country africa red blue green white line'}, {c:'🇬🇪', k:'georgia flag nation country caucasus europe asia white red cross'}, 
                {c:'🇩🇪', k:'germany flag nation country europe black red yellow deutschland'}, {c:'🇬🇭', k:'ghana flag nation country africa red yellow green star black'}, {c:'🇬🇮', k:'gibraltar flag territory europe spain uk castle key red white'}, {c:'🇬🇷', k:'greece flag nation country europe mediterranean cross blue white'}, 
                {c:'🇬🇱', k:'greenland flag territory north america denmark white red circle half'}, {c:'🇬🇩', k:'grenada flag nation country caribbean island red yellow green star flame'}, {c:'🇬🇵', k:'guadeloupe flag territory caribbean french black green yellow sun plant'}, {c:'🇬🇺', k:'guam flag territory oceania us shield blue red border palm beach'}, 
                {c:'🇬🇹', k:'guatemala flag nation country central america light blue white shield bird'}, {c:'🇬🇬', k:'guernsey flag territory europe uk cross red yellow white island'}, {c:'🇬🇳', k:'guinea flag nation country africa red yellow green pan'}, {c:'🇬🇼', k:'guinea bissau flag nation country africa red yellow green star black'}, 
                {c:'🇬🇾', k:'guyana flag nation country south america green yellow red triangle black white arrow'}, {c:'🇭🇹', k:'haiti flag nation country caribbean island blue red shield'}, {c:'🇭🇳', k:'honduras flag nation country central america blue white star five'}, {c:'🇭🇰', k:'hong kong flag territory asia china red flower white petal'}, 
                {c:'🇭🇺', k:'hungary flag nation country europe red white green'}, {c:'🇮🇸', k:'iceland flag nation country europe nordic cross blue white red'}, {c:'🇮🇳', k:'india flag nation country asia orange white green wheel ashoka chakra'}, {c:'🇮🇩', k:'indonesia flag nation country asia red white'}, 
                {c:'🇮🇷', k:'iran flag nation country middle east asia green white red symbol'}, {c:'🇮🇶', k:'iraq flag nation country middle east arab red white black green text'}, {c:'🇮🇪', k:'ireland flag nation country europe green white orange'}, {c:'🇮🇲', k:'isle of man flag territory europe uk red legs triskelion'}, 
                {c:'🇮🇱', k:'israel flag nation country middle east jewish star david blue white'}, {c:'🇮🇹', k:'italy flag nation country europe green white red pizza rome'}, {c:'🇯🇲', k:'jamaica flag nation country caribbean island green yellow black cross'}, {c:'🇯🇵', k:'japan flag nation country asia red circle sun white tokyo'}, 
                {c:'🇯🇪', k:'jersey flag territory europe uk white red cross shield lions'}, {c:'🇯🇴', k:'jordan flag nation country middle east arab black white green red star'}, {c:'🇰🇿', k:'kazakhstan flag nation country asia light blue sun eagle pattern'}, {c:'🇰🇪', k:'kenya flag nation country africa black red green white shield spear'}, 
                {c:'🇰🇮', k:'kiribati flag nation country oceania island red wave bird sun'}, {c:'🇽🇰', k:'kosovo flag nation country europe balkan blue yellow map star six'}, {c:'🇰🇼', k:'kuwait flag nation country middle east arab green white red black'}, {c:'🇰🇬', k:'kyrgyzstan flag nation country asia red sun lines pattern'}, 
                {c:'🇱🇦', k:'laos flag nation country asia red blue white circle moon'}, {c:'🇱🇻', k:'latvia flag nation country europe baltic red white maroon line'}, {c:'🇱🇧', k:'lebanon flag nation country middle east arab red white tree cedar'}, {c:'🇱🇸', k:'lesotho flag nation country africa blue white green hat black basotho'}, 
                {c:'🇱🇷', k:'liberia flag nation country africa star stripes red white blue like us'}, {c:'🇱🇾', k:'libya flag nation country africa arab red black green star crescent'}, {c:'🇱🇮', k:'liechtenstein flag nation country europe blue red crown gold'}, {c:'🇱🇹', k:'lithuania flag nation country europe baltic yellow green red'}, 
                {c:'🇱🇺', k:'luxembourg flag nation country europe red white light blue'}, {c:'🇲🇴', k:'macao flag territory asia china green flower lotus water star'}, {c:'🇲🇬', k:'madagascar flag nation country africa island white red green'}, {c:'🇲🇼', k:'malawi flag nation country africa black red green sun rising'}, 
                {c:'🇲🇾', k:'malaysia flag nation country asia stripes red white blue star crescent yellow'}, {c:'🇲🇻', k:'maldives flag nation country asia island red green white crescent'}, {c:'🇲🇱', k:'mali flag nation country africa green yellow red pan'}, {c:'🇲🇹', k:'malta flag nation country europe island white red cross george grey'}, 
                {c:'🇲🇭', k:'marshall islands flag nation country oceania blue star orange white stripe ray'}, {c:'🇲🇶', k:'martinique flag territory caribbean french island blue cross white snake'}, {c:'🇲🇷', k:'mauritania flag nation country africa green yellow star crescent red border'}, {c:'🇲🇺', k:'mauritius flag nation country africa island red blue yellow green'}, 
                {c:'🇾🇹', k:'mayotte flag territory africa island french white shield sea horse text'}, {c:'🇲🇽', k:'mexico flag nation country north america green white red eagle snake cactus'}, {c:'🇫🇲', k:'micronesia flag nation country oceania island light blue star white four'}, {c:'🇲🇩', k:'moldova flag nation country europe blue yellow red shield eagle ox'}, 
                {c:'🇲🇨', k:'monaco flag nation country europe red white half'}, {c:'🇲🇳', k:'mongolia flag nation country asia red blue yellow symbol soyombo fire'}, {c:'🇲🇪', k:'montenegro flag nation country europe balkan red gold eagle double crown'}, {c:'🇲🇸', k:'montserrat flag territory caribbean uk blue shield cross lady'}, 
                {c:'🇲🇦', k:'morocco flag nation country africa arab red star green pentagram'}, {c:'🇲🇿', k:'mozambique flag nation country africa green black yellow red star book gun ak47 hoe'}, {c:'🇲🇲', k:'myanmar flag nation country asia burma yellow green red star white'}, {c:'🇳🇦', k:'namibia flag nation country africa blue red green white sun yellow'}, 
                {c:'🇳🇷', k:'nauru flag nation country oceania island blue yellow line star white'}, {c:'🇳🇵', k:'nepal flag nation country asia himalaya red blue triangle shape sun moon'}, {c:'🇳🇱', k:'netherlands flag nation country europe red white blue holland'}, {c:'🇳🇨', k:'new caledonia flag territory oceania french blue red green yellow circle emblem'}, 
                {c:'🇳🇿', k:'new zealand flag nation country oceania down under uk blue star red kiwi'}, {c:'🇳🇮', k:'nicaragua flag nation country central america light blue white shield triangle volcano'}, {c:'🇳🇪', k:'niger flag nation country africa orange white green circle sun'}, {c:'🇳🇬', k:'nigeria flag nation country africa green white green stripe'}, 
                {c:'🇳🇺', k:'niue flag territory oceania yellow uk star circle'}, {c:'🇳🇫', k:'norfolk island flag territory oceania australia green white pine tree'}, {c:'🇰🇵', k:'north korea flag nation country asia red blue white star circle dprk'}, {c:'🇲🇰', k:'north macedonia flag nation country europe balkan red yellow sun ray'}, 
                {c:'🇲🇵', k:'northern mariana islands flag territory oceania us blue star latte stone wreath flower'}, {c:'🇳🇴', k:'norway flag nation country europe nordic cross red white blue'}, {c:'🇴🇲', k:'oman flag nation country middle east arab white red green sword dagger khanjar'}, {c:'🇵🇰', k:'pakistan flag nation country asia green white star crescent'}, 
                {c:'🇵🇼', k:'palau flag nation country oceania island light blue yellow circle moon'}, {c:'🇵🇸', k:'palestinian territories flag nation middle east arab black white green red triangle palestine free'}, {c:'🇵🇦', k:'panama flag nation country central america red blue white star square'}, {c:'🇵🇬', k:'papua new guinea flag nation country oceania red black star yellow bird paradise'}, 
                {c:'🇵🇾', k:'paraguay flag nation country south america red white blue shield star seal'}, {c:'🇵🇪', k:'peru flag nation country south america red white red stripe shield animal'}, {c:'🇵🇭', k:'philippines flag nation country asia blue red white triangle sun star'}, {c:'🇵🇳', k:'pitcairn islands flag territory oceania uk blue shield anchor bible plant'}, 
                {c:'🇵🇱', k:'poland flag nation country europe white red stripe'}, {c:'🇵🇹', k:'portugal flag nation country europe green red shield sphere yellow castle shield'}, {c:'🇵🇷', k:'puerto rico flag territory caribbean island red white blue triangle star'}, {c:'🇶🇦', k:'qatar flag nation country middle east arab maroon white zigzag edge tooth'}, 
                {c:'🇷🇪', k:'reunion flag territory africa island french flag volcano yellow red blue'}, {c:'🇷🇴', k:'romania flag nation country europe blue yellow red stripe chad'}, {c:'🇷🇺', k:'russia flag nation country europe asia white blue red stripe moscow'}, {c:'🇷🇼', k:'rwanda flag nation country africa light blue yellow green sun ray'}, 
                {c:'🇼🇸', k:'samoa flag nation country oceania island red blue star cross south'}, {c:'🇸🇲', k:'san marino flag nation country europe white light blue shield crown mountain tree'}, {c:'🇸🇹', k:'sao tome flag nation country africa island green yellow red triangle black star'}, {c:'🇸🇦', k:'saudi arabia flag nation country middle east arab green white text sword islam'}, 
                {c:'🇸🇳', k:'senegal flag nation country africa green yellow red star pan stripe'}, {c:'🇷🇸', k:'serbia flag nation country europe balkan red blue white shield eagle double crown'}, {c:'🇸🇨', k:'seychelles flag nation country africa island blue yellow red white green ray angle'}, {c:'🇸🇱', k:'sierra leone flag nation country africa green white light blue stripe'}, 
                {c:'🇸🇬', k:'singapore flag nation country asia red white moon crescent star five'}, {c:'🇸🇽', k:'sint maarten flag territory caribbean island dutch red blue white triangle shield sun courthouse'}, {c:'🇸🇰', k:'slovakia flag nation country europe white blue red shield cross double mountain'}, {c:'🇸🇮', k:'slovenia flag nation country europe white blue red shield mountain star wave'}, 
                {c:'🇸🇧', k:'solomon islands flag nation country oceania blue green yellow line diagonal white star'}, {c:'🇸🇴', k:'somalia flag nation country africa light blue white star five point center'}, {c:'🇿🇦', k:'south africa flag nation country africa green yellow black white red blue y shape mandela'}, {c:'🇬🇸', k:'south georgia flag territory oceania island uk blue shield lion penguin seal animal star'}, 
                {c:'🇰🇷', k:'south korea flag nation country asia white circle red blue trigram black seoul'}, {c:'🇸🇸', k:'south sudan flag nation country africa black red green white triangle blue star yellow'}, {c:'🇪🇸', k:'spain flag nation country europe red yellow red stripe shield crown pillar eagle'}, {c:'🇱🇰', k:'sri lanka flag nation country asia island yellow lion sword maroon green orange square'}, 
                {c:'🇧🇱', k:'st barthelemy flag territory caribbean french island white shield blue cross pelican tree crown text'}, {c:'🇸🇭', k:'st helena flag territory africa island uk blue shield bird coast ship flag cross shield'}, {c:'🇰🇳', k:'st kitts flag nation country caribbean island green red black line diagonal yellow star white'}, {c:'🇱🇨', k:'st lucia flag nation country caribbean island light blue triangle yellow black white shape peak'}, 
                {c:'🇲🇫', k:'st martin flag territory caribbean french island blue white red stripe'}, {c:'🇵🇲', k:'st pierre flag territory north america french blue ship yellow wave white square detail cross'}, {c:'🇻🇨', k:'st vincent flag nation country caribbean island blue yellow green v shape diamond diamond'}, {c:'🇸🇩', k:'sudan flag nation country africa arab red white black green triangle'}, 
                {c:'🇸🇷', k:'suriname flag nation country south america green white red stripe yellow star five point'}, {c:'🇸🇯', k:'svalbard flag territory europe island norway red white blue cross nordic shape cold snow'}, {c:'🇸🇪', k:'sweden flag nation country europe blue yellow cross nordic ikea'}, {c:'🇨🇭', k:'switzerland flag nation country europe red square white cross plus alps'}, 
                {c:'🇸🇾', k:'syria flag nation country middle east arab red white black green star two point'}, {c:'🇹🇼', k:'taiwan flag nation country asia red blue white square sun ray shape republic china'}, {c:'🇹🇯', k:'tajikistan flag nation country asia red white green crown star gold seven arc line point'}, {c:'🇹🇿', k:'tanzania flag nation country africa green blue black yellow line diagonal stripe shape angle split'}, 
                {c:'🇹🇭', k:'thailand flag nation country asia red white blue stripe horizontal thick line bangkok'}, {c:'🇹🇱', k:'timor leste flag nation country asia oceania island red yellow black triangle white star shape point'}, {c:'🇹🇬', k:'togo flag nation country africa green yellow horizontal stripe red square white star line point pan'}, {c:'🇹🇰', k:'tokelau flag territory oceania island blue sail boat yellow star cross shape cross wind water sea'}, 
                {c:'🇹🇴', k:'tonga flag nation country oceania island red white square red cross shape box island'}, {c:'🇹🇹', k:'trinidad flag nation country caribbean island red black diagonal white line stripe cross shape square point'}, {c:'🇹🇳', k:'tunisia flag nation country africa arab red white circle moon star crescent line shape round'}, {c:'🇹🇷', k:'turkey flag nation country europe asia middle east red white moon star crescent shape point arab balkan'}, 
                {c:'🇹🇲', k:'turkmenistan flag nation country asia green vertical maroon carpet pattern moon star crescent white shape stripe pattern rug point'}, {c:'🇹🇨', k:'turks caicos flag territory caribbean uk blue shield shell lobster cactus shape water ocean plant seal animal sea shield line'}, {c:'🇹🇻', k:'tuvalu flag nation country oceania island uk light blue yellow star nine pattern map star group point line'}, {c:'🇺🇬', k:'uganda flag nation country africa black yellow red stripe horizontal bird crane circle white shape line circle pan round'}, 
                {c:'🇺🇦', k:'ukraine flag nation country europe blue yellow horizontal stripe line kiev color free'}, {c:'🇦🇪', k:'united arab emirates flag nation country middle east arab green white black red stripe vertical horizontal pan uae dubai'}, {c:'🇬🇧', k:'united kingdom flag nation country europe uk cross red white blue jack union english british london'}, {c:'🇺🇸', k:'united states flag nation country north america us usa america red white blue stripe star fifty shape line point square star stripe'}, 
                {c:'🇺🇾', k:'uruguay flag nation country south america blue white horizontal stripe line sun face yellow shape ray box square ray'}, {c:'🇻🇮', k:'us virgin islands flag territory caribbean island white blue yellow eagle shield arrow branch star us text shape bird shape animal leaf symbol plant'}, {c:'🇺🇿', k:'uzbekistan flag nation country asia blue white green stripe red line horizontal moon star twelve white pattern crescent dot shape'}, {c:'🇻🇺', k:'vanuatu flag nation country oceania island red green black y shape yellow line pig tusk plant branch shape leaf green point line cross split yellow'}, 
                {c:'🇻🇦', k:'vatican city flag nation country europe yellow white square cross key red cord crown catholic pope holy religion star shield crown line stripe cross point'}, {c:'🇻🇪', k:'venezuela flag nation country south america yellow blue red horizontal stripe star eight white arc pattern shape point line point arc star shape'}, {c:'🇻🇳', k:'vietnam flag nation country asia red yellow star five point shape point center color yellow shape red box flag color star line'}, {c:'🇼🇫', k:'wallis futuna flag territory oceania island french red white cross square shield red point cross square cross line white point cross french red color line flag pattern flag'}, 
                {c:'🇪🇭', k:'western sahara flag nation country africa arab black white green horizontal stripe red triangle star crescent point pan star green point triangle red red stripe green line horizontal color red'}, {c:'🇾🇪', k:'yemen flag nation country middle east arab red white black horizontal stripe pan color box color point flag flag horizontal red black white pattern'}, {c:'🇿🇲', k:'zambia flag nation country africa green vertical stripe red black orange shape bird eagle fly color red black color green orange line shape animal'}, {c:'🇿🇼', k:'zimbabwe flag nation country africa green yellow red black horizontal stripe white triangle star red bird animal shape stone shape line point star red yellow pan green color flag pan triangle point'}
            ]}
        ];
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    background: #121212;
                    /* Feature: Match size to mobile keyboard dynamically using CSS environment variables */
                    height: var(--emoji-keyboard-height, 320px);
                    max-height: 50vh;
                    width: 100%;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    overflow: hidden;
                    padding-bottom: env(safe-area-inset-bottom);
                }
                .ep-header {
                    padding: 8px 12px;
                    border-bottom: 1px solid #262626;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(18,18,18,0.95);
                    flex-shrink: 0; 
                }
                .ep-search-container {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .ep-search {
                    width: 100%;
                    background: #262626;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 30px 8px 12px;
                    color: #fff;
                    font-size: 14px;
                    outline: none;
                }
                .ep-clear-search {
                    position: absolute;
                    right: 10px;
                    background: none;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    display: none;
                    font-size: 16px;
                    padding: 0;
                    outline: none;
                }
                .ep-clear-search:hover { color: #fff; }
                .ep-nav {
                    display: flex;
                    overflow-x: auto;
                    padding: 6px 4px;
                    border-bottom: 1px solid #262626;
                    gap: 4px;
                    scrollbar-width: none;
                    flex-shrink: 0;
                }
                .ep-nav::-webkit-scrollbar { display: none; }
                .ep-nav-item {
                    font-size: 1.2rem;
                    padding: 6px 10px;
                    border-radius: 8px;
                    cursor: pointer;
                    opacity: 0.5;
                    transition: opacity 0.2s, background 0.2s;
                }
                .ep-nav-item.active { opacity: 1; background: #262626; }
                
                .ep-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                    scroll-behavior: smooth;
                    min-height: 0; /* Critical for flex scrolling */
                }
                .ep-category-title {
                    font-size: 0.75rem;
                    color: #888;
                    margin: 15px 0 8px 5px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                /* Optional glow for AI specific categories to make it look advanced */
                #cat-suggested .ep-category-title { color: #a162f7; }
                #cat-related .ep-category-title { color: #00d2ff; }
                #cat-chatmood .ep-category-title { color: #ff3366; text-shadow: 0 0 8px rgba(255, 51, 102, 0.4); }
                
                .ep-grid {
                    display: grid;
                    grid-template-columns: repeat(8, 1fr);
                    gap: 8px;
                }
                .ep-emoji {
                    font-size: 1.7rem;
                    cursor: pointer;
                    text-align: center;
                    border-radius: 6px;
                    transition: transform 0.1s, background 0.1s;
                    user-select: none;
                    position: relative;
                }
                .ep-emoji:active { transform: scale(1.2); background: #333; }
                
                /* Tooltip styling */
                .ep-emoji[title]:hover::after {
                    content: attr(title);
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #333;
                    color: #fff;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    white-space: nowrap;
                    z-index: 10;
                    pointer-events: none;
                    opacity: 0.9;
                    font-family: sans-serif;
                }
                
                #recents-context {
                    position: absolute; display: none;
                    background: #333; color: white;
                    padding: 8px 12px; border-radius: 8px;
                    font-size: 0.8rem; z-index: 100;
                    cursor: pointer;
                }
                #recents-context:hover { background: #444; }
            </style>
            <div class="ep-header">
                <div class="ep-search-container">
                    <input type="text" class="ep-search" placeholder="Search emoji...">
                    <button class="ep-clear-search">&times;</button>
                </div>
            </div>
            <div class="ep-nav" id="nav-bar"></div>
            <div class="ep-body" id="emoji-body"></div>
            <div id="recents-context">Clear Recents</div>
        `;
    }

    setupEvents() {
        const searchInput = this.shadowRoot.querySelector('.ep-search');
        const clearBtn = this.shadowRoot.querySelector('.ep-clear-search');
        
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            this.lastSearchedTerm = val;
            clearBtn.style.display = val ? 'block' : 'none';
            this.filterEmojis(val);
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.lastSearchedTerm = '';
            clearBtn.style.display = 'none';
            this.filterEmojis('');
        });

        const recentsBtn = this.shadowRoot.getElementById('recents-context');
        recentsBtn.addEventListener('click', () => {
            this.recentEmojis = [];
            localStorage.setItem('goorac_recents', JSON.stringify([]));
            this.loadEmojis('all');
            recentsBtn.style.display = 'none';
        });
        
        // Hide context menu if clicking anywhere else
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.id !== 'recents-context') {
                recentsBtn.style.display = 'none';
            }
        });

        // Setup scroll spy for nav bar highlights
        const body = this.shadowRoot.getElementById('emoji-body');
        body.addEventListener('scroll', () => {
            if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.updateActiveNavOnScroll();
            }, 50);
        });
    }

    // New Feature: Use local storage of chats to calculate VADER-inspired AI Mood Context
    getRecentChatContext() {
        let allChatMessages = [];
        
        // Loop through localStorage to find active chat messages
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if (key && key.startsWith('chat_msgs_')) {
                try {
                    let msgs = JSON.parse(localStorage.getItem(key)) || [];
                    allChatMessages = allChatMessages.concat(msgs);
                } catch(e) {}
            }
        }

        // Sort all messages descending to analyze latest context
        allChatMessages.sort((a, b) => {
            const tA = new Date(a.timestampIso || 0).getTime();
            const tB = new Date(b.timestampIso || 0).getTime();
            return tB - tA; 
        });

        // Take only the last 15 active messages to compute immediate mood
        return allChatMessages.slice(0, 15);
    }

    calculateChatMood() {
        const messages = this.getRecentChatContext();
        if (messages.length === 0) return null;

        const scores = { happy: 0, sad: 0, angry: 0, love: 0, funny: 0, surprised: 0 };
        const negations = ['not', "don't", "dont", 'never', 'no', 'illa', 'illai', 'illay', 'illam', 'kidayathu', 'இல்லை'];
        
        const lexicons = {
            emojis: {
                happy: ['😊', '😁', '😄', '🙂', '🥳', '😎', '😇', '😌', '👍'],
                sad: ['😢', '😭', '😞', '😔', '💔', '☹️', '😓', '👎'],
                angry: ['😠', '😡', '🤬', '😾', '😤', '🖕'],
                love: ['❤️', '😍', '🥰', '😘', '💕', '💖', '💗', '🫂', '🖤', '🤍', '🤎', '💙', '💜', '💚', '💛', '🧡'],
                funny: ['😂', '🤣', '💀', '😹'],
                surprised: ['😮', '😱', '😲', '🤯', '😳', '👀']
            },
            tamil: {
                happy: ['santhosham', 'magilchi', 'super', 'sema', 'nalla', 'nandri', 'சந்தோஷம்', 'மகிழ்ச்சி', 'நன்று', 'mass', 'verithanam'],
                sad: ['kavalai', 'varutham', 'sogam', 'kavala', 'kashtam', 'vali', 'கவலை', 'வருத்தம்', 'சோகம்', 'paavam'],
                angry: ['kovam', 'kaduppu', 'erichal', 'poda', 'loosu', 'mutal', 'கோபம்', 'கடுப்பு', 'எரிச்சல்', 'eruma'],
                love: ['kadhal', 'anbu', 'chellam', 'kutti', 'pondatti', 'purushan', 'uyire', 'காதல்', 'அன்பு', 'செல்லம்', 'thangam', 'kannu'],
                funny: ['sirippu', 'nagaichuvai', 'கலக்கல்', 'சிரிப்பு', 'siripa'],
                surprised: ['achariyam', 'athirchi', 'enna', 'nijamava', 'ஆச்சரியம்', 'அதிர்ச்சி', 'appadiya', 'unmaiyava']
            },
            english: {
                happy: ['good', 'great', 'happy', 'yay', 'awesome', 'nice', 'sweet', 'cool', 'amazing', 'best'],
                sad: ['sad', 'bad', 'sorry', 'depressed', 'down', 'miss', 'cry', 'hurt', 'pain'],
                angry: ['angry', 'mad', 'hate', 'annoyed', 'wtf', 'stupid', 'dumb', 'idiot', 'furious'],
                love: ['love', 'miss you', 'babe', 'baby', 'kiss', 'heart', 'beautiful', 'cute'],
                funny: ['haha', 'lmao', 'lol', 'rofl', 'dead', 'funny', 'joke', 'hilarious'],
                surprised: ['wow', 'omg', 'really', 'shocked', 'whoa', 'crazy', 'insane']
            }
        };

        // NLP NLP.js/VADER Engine loop
        messages.forEach((msg, index) => {
            const rawText = (msg.text || '').toLowerCase();
            const tokens = rawText.split(/[\s,.\?!]+/);
            const timeWeight = 1.0 - (index * 0.06); 

            // Emojis (x3.0 Priority)
            for (const [emotion, emojiList] of Object.entries(lexicons.emojis)) {
                emojiList.forEach(emoji => {
                    if (rawText.includes(emoji)) scores[emotion] += 3.0 * timeWeight;
                });
            }

            // Word Tokens (Tamil x2.0, English x1.0)
            for (let i = 0; i < tokens.length; i++) {
                let word = tokens[i];
                if (!word) continue;

                let isNegated = false;
                if (i > 0 && negations.includes(tokens[i - 1])) isNegated = true;

                const applyScore = (emotion, value) => {
                    if (isNegated) {
                        if (emotion === 'happy' || emotion === 'love' || emotion === 'funny') scores.sad += value * timeWeight;
                        else if (emotion === 'sad' || emotion === 'angry') scores.happy += value * timeWeight;
                    } else {
                        scores[emotion] += value * timeWeight;
                    }
                };

                for (const [emotion, tamilList] of Object.entries(lexicons.tamil)) {
                    if (tamilList.includes(word)) applyScore(emotion, 2.0);
                }

                for (const [emotion, engList] of Object.entries(lexicons.english)) {
                    if (engList.includes(word)) applyScore(emotion, 1.0);
                }
            }
        });

        // Determine dominant mood
        let dominant = null;
        let maxScore = 0.5; // Threshold
        for (const [emotion, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                dominant = emotion;
            }
        }

        if (dominant) {
            // New Feature: Show multiple emojis based on the dominant ML calculated mood
            const moodDisplayMap = {
                happy: { name: 'Happy', list: ['😁', '😃', '🥳', '😎', '😇', '😌', '🙌', '🌞'] },
                sad: { name: 'Sad', list: ['😢', '💔', '😔', '😞', '🥺', '🌧️', '🫂', '🩹'] },
                angry: { name: 'Angry', list: ['😠', '😡', '🤬', '😤', '💥', '💢', '👎', '🛑'] },
                love: { name: 'In Love', list: ['❤️', '😍', '🥰', '😘', '💕', '💘', '🌹', '✨'] },
                funny: { name: 'Funny', list: ['😂', '🤣', '💀', '🤡', '😹', '🤪', '🎭', '🔥'] },
                surprised: { name: 'Surprised', list: ['😮', '🤯', '😲', '😱', '👀', '⁉️', '🚨', '⚡'] }
            };
            return { name: moodDisplayMap[dominant].name, emojis: moodDisplayMap[dominant].list };
        }
        
        return null;
    }

    // AI suggestion engine (Upgraded for 1 line & multiple data points)
    getSuggestedEmojis() {
        // Feature 3 & 4: Context Variables (Time of day and Month)
        const hour = new Date().getHours();
        const month = new Date().getMonth();
        let timeModifier = "";
        let seasonModifier = "";
        
        if (hour > 5 && hour < 11) timeModifier = "morning coffee wake sun breakfast";
        else if (hour >= 11 && hour < 15) timeModifier = "lunch sandwich food";
        else if (hour >= 18 && hour < 22) timeModifier = "dinner wine relax evening";
        else if (hour >= 22 || hour <= 5) timeModifier = "sleep night zzz bed moon";
        
        if (month === 9) seasonModifier = "halloween pumpkin ghost spooky"; // October
        else if (month === 11) seasonModifier = "christmas tree xmas santa winter cold"; // December
        else if (month >= 5 && month <= 7) seasonModifier = "summer beach hot sun swim vacation"; // Summer

        // Feature 1: Sequential Prediction Check
        const lastUsed = this.recentEmojis[0] || null;
        const likelyNext = lastUsed && this.emojiPairs[lastUsed] ? Object.entries(this.emojiPairs[lastUsed]).sort((a,b) => b[1] - a[1]) : [];

        // Compile a master list of all emoji objects with their combined ML score
        let allScores = [];
        
        this.emojiData.forEach(cat => {
            cat.emojis.forEach(e => {
                if (this.recentEmojis.includes(e.c)) return; // Skip if it's already in recents

                let score = 0;
                
                // 1. Frequency Score (Feature 6: includes implicit decay over time via scoring logic in addToRecents)
                score += (this.emojiFrequency[e.c] || 0) * 2;
                
                // 2. Sequential Score
                const pairIndex = likelyNext.findIndex(p => p[0] === e.c);
                if (pairIndex !== -1) score += (10 - pairIndex) * 3; // Massive boost for predicted pairs
                
                // 3. Time/Circadian Score
                if (timeModifier && e.k.split(' ').some(word => timeModifier.includes(word))) score += 5;
                
                // 4. Seasonal Score
                if (seasonModifier && e.k.split(' ').some(word => seasonModifier.includes(word))) score += 5;
                
                // 5. Category Affinity Score
                if (this.categoryAffinity[cat.id]) score += this.categoryAffinity[cat.id] * 0.5;

                if (score > 0) {
                    allScores.push({ c: e.c, score: score, k: e.k });
                }
            });
        });

        // Sort by highest score
        allScores.sort((a, b) => b.score - a.score);
        
        // Take top 7 (leaves 1 spot for Serendipity AI)
        let topSuggestions = allScores.slice(0, 7).map(item => ({ c: item.c, k: 'smart prediction ai' }));
        
        // Feature 7: Serendipity AI - Inject 1 random, lesser-used emoji
        if (topSuggestions.length < 8) {
            let randomCat = this.emojiData[Math.floor(Math.random() * this.emojiData.length)];
            let randomEmoji = randomCat.emojis[Math.floor(Math.random() * randomCat.emojis.length)];
            if (!this.recentEmojis.includes(randomEmoji.c) && !topSuggestions.find(e => e.c === randomEmoji.c)) {
                 topSuggestions.push({ c: randomEmoji.c, k: 'ai serendipity random discover' });
            }
        }
        
        // Exactly 1 line (8 elements max)
        return topSuggestions.slice(0, 8);
    }
    
    // Feature 2: Semantic Context Matching
    getRelatedEmojis() {
        if(this.recentEmojis.length === 0) return [];
        const lastUsed = this.recentEmojis[0];
        let lastUsedKeywords = [];
        
        // Find the keywords of the last used emoji
        for(let cat of this.emojiData) {
            const found = cat.emojis.find(e => e.c === lastUsed);
            if(found) {
                lastUsedKeywords = found.k.split(' ');
                break;
            }
        }
        
        if(lastUsedKeywords.length === 0) return [];
        
        // Find other emojis that share these keywords
        let relatedScores = [];
        this.emojiData.forEach(cat => {
            cat.emojis.forEach(e => {
                if(e.c === lastUsed) return;
                let overlap = 0;
                const currentKeywords = e.k.split(' ');
                
                // Simple TF-IDF conceptual approach
                lastUsedKeywords.forEach(kw => {
                    if(kw.length > 2 && currentKeywords.includes(kw)) overlap++;
                });
                
                if(overlap > 0) relatedScores.push({c: e.c, overlap: overlap, k: e.k});
            });
        });
        
        // Sort by highest overlap, slice to 1 line (8 emojis)
        return relatedScores.sort((a,b) => b.overlap - a.overlap).slice(0, 8).map(item => ({ c: item.c, k: 'related context' }));
    }

    updateActiveNavOnScroll() {
        const body = this.shadowRoot.getElementById('emoji-body');
        const categories = this.shadowRoot.querySelectorAll('.ep-body > div[id^="cat-"]');
        let currentActive = null;

        for (const cat of categories) {
            // If the category top is within the upper half of the view container
            if (cat.offsetTop - body.scrollTop <= body.clientHeight / 2) {
                currentActive = cat.id.replace('cat-', '');
            } else {
                break;
            }
        }

        if (currentActive) {
            this.shadowRoot.querySelectorAll('.ep-nav-item').forEach(i => i.classList.remove('active'));
            const activeNav = this.shadowRoot.querySelector(`.ep-nav-item[data-target="${currentActive}"]`);
            if (activeNav) activeNav.classList.add('active');
        }
    }

    loadEmojis(filter) {
        const navBar = this.shadowRoot.getElementById('nav-bar');
        const body = this.shadowRoot.getElementById('emoji-body');
        
        navBar.innerHTML = '';
        body.innerHTML = '';

        let displayData = [...this.emojiData];

        // NEW Feature: Inject VADER NLP AI Mood Row reading directly from Local Storage
        const chatMoodData = this.calculateChatMood();
        if (chatMoodData && chatMoodData.emojis.length > 0) {
            displayData.unshift({
                id: 'chatmood', name: `Chat Vibe: ${chatMoodData.name}`, icon: '🧠',
                emojis: chatMoodData.emojis.map(e => ({c: e, k: 'ai mood chat context dynamic'}))
            });
        }
        
        // Feature 2: Inject "Related" Row Context based on very last click
        const relatedList = this.getRelatedEmojis();
        if(relatedList.length > 0) {
            displayData.unshift({
                id: 'related', name: 'Related to Recent', icon: '🔗', 
                emojis: relatedList 
            });
        }
        
        // Insert Suggestions AI if we have data (Now strictly 1 line, up to 8 emojis)
        const suggestedList = this.getSuggestedEmojis();
        if (suggestedList.length > 0) {
            displayData.unshift({
                id: 'suggested', name: 'Smart AI', icon: '✨', 
                emojis: suggestedList 
            });
        }

        // Insert Recents (limit to 16 handled in addToRecents/constructor)
        if (this.recentEmojis.length > 0) {
            displayData.unshift({
                id: 'recents', name: 'Recent', icon: '🕒', 
                emojis: this.recentEmojis.map(e => ({c: e, k: 'recent'})) 
            });
        }

        displayData.forEach(cat => {
            if(cat.id === 'recents' && this.recentEmojis.length === 0) return;
            const span = document.createElement('span');
            span.className = 'ep-nav-item';
            span.dataset.target = cat.id; // added for scroll spy
            span.innerText = cat.icon;
            span.title = cat.name;
            span.onclick = () => {
                const el = this.shadowRoot.getElementById(`cat-${cat.id}`);
                if(el) el.scrollIntoView({block: 'start'});
                this.shadowRoot.querySelectorAll('.ep-nav-item').forEach(i => i.classList.remove('active'));
                span.classList.add('active');
            };
            navBar.appendChild(span);
        });

        // Set initial active nav
        if (navBar.firstChild) navBar.firstChild.classList.add('active');

        displayData.forEach(cat => {
            const catContainer = document.createElement('div');
            catContainer.id = `cat-${cat.id}`;
            
            const title = document.createElement('div');
            title.className = 'ep-category-title';
            title.innerText = cat.name;
            
            if(cat.id === 'recents') {
                 title.addEventListener('contextmenu', (e) => {
                     e.preventDefault();
                     const ctx = this.shadowRoot.getElementById('recents-context');
                     ctx.style.display = 'block';
                     ctx.style.left = e.offsetX + 'px';
                     ctx.style.top = e.offsetY + 'px';
                 });
            }

            const grid = document.createElement('div');
            grid.className = 'ep-grid';

            cat.emojis.forEach(eObj => {
                const el = document.createElement('div');
                el.className = 'ep-emoji';
                el.title = eObj.k.split(' ')[0] || cat.name; // Simple hover title logic
                el.innerText = eObj.c; // Removed skin tone application
                el.onclick = () => {
                    this.addToRecents(eObj.c, cat.id); // Passing Category ID for Affinity tracking
                    this.dispatchEvent(new CustomEvent('emoji-click', { 
                        detail: { emoji: eObj.c, unicode: eObj.c },
                        bubbles: true, 
                        composed: true 
                    }));
                };
                grid.appendChild(el);
            });

            catContainer.appendChild(title);
            catContainer.appendChild(grid);
            body.appendChild(catContainer);
        });
    }

    filterEmojis(query) {
        const body = this.shadowRoot.getElementById('emoji-body');
        const navBar = this.shadowRoot.getElementById('nav-bar');
        
        if(!query) {
            navBar.style.display = 'flex';
            this.loadEmojis('all');
            return;
        }
        
        body.innerHTML = '';
        navBar.style.display = 'none'; // Hide nav while searching
        
        const grid = document.createElement('div');
        grid.className = 'ep-grid';
        grid.style.marginTop = '10px';

        let count = 0;
        
        // Feature 8: Fuzzy match & Dynamically Learned words checking
        this.emojiData.forEach(cat => {
            cat.emojis.forEach(e => {
                if(count > 100) return; 
                
                let matchesSearch = e.k.includes(query) || e.c === query;
                
                // Check if this emoji was previously associated with the search term via ML learning
                if(!matchesSearch && this.learnedKeywords[query] === e.c) {
                    matchesSearch = true;
                }
                
                // Allow slightly split words (e.g. "smile face" matching "smile" and "face")
                if(!matchesSearch) {
                    const queryParts = query.split(' ');
                    if(queryParts.every(part => e.k.includes(part))) matchesSearch = true;
                }

                if(matchesSearch) {
                    const el = document.createElement('div');
                    el.className = 'ep-emoji';
                    el.title = e.k.split(' ')[0] || "emoji";
                    el.innerText = e.c;
                    el.onclick = () => {
                        this.addToRecents(e.c, cat.id);
                        this.dispatchEvent(new CustomEvent('emoji-click', { detail: { emoji: e.c } }));
                    };
                    grid.appendChild(el);
                    count++;
                }
            });
        });
        
        if (count === 0) {
            const noResults = document.createElement('div');
            noResults.style.color = '#888';
            noResults.style.textAlign = 'center';
            noResults.style.marginTop = '20px';
            noResults.innerText = 'No emojis found.';
            body.appendChild(noResults);
        } else {
            body.appendChild(grid);
        }
    }

    addToRecents(char, categoryId = null) {
        // AI Tracking feature 1: Sequential Pair Learning
        if (this.recentEmojis.length > 0) {
            let previous = this.recentEmojis[0];
            if (previous !== char) { // Don't track spamming the same emoji as a pair
                if (!this.emojiPairs[previous]) this.emojiPairs[previous] = {};
                this.emojiPairs[previous][char] = (this.emojiPairs[previous][char] || 0) + 1;
                localStorage.setItem('goorac_quantum_pairs', JSON.stringify(this.emojiPairs));
            }
        }
        
        // AI Tracking feature 5: Dynamic Search Keyword Learning
        if (this.lastSearchedTerm && this.lastSearchedTerm.length > 2) {
            this.learnedKeywords[this.lastSearchedTerm] = char;
            localStorage.setItem('goorac_learned_words', JSON.stringify(this.learnedKeywords));
        }
        
        // AI Tracking feature 10: Category Affinity
        if (categoryId && categoryId !== 'recents' && categoryId !== 'suggested' && categoryId !== 'related' && categoryId !== 'chatmood') {
             this.categoryAffinity[categoryId] = (this.categoryAffinity[categoryId] || 0) + 1;
             localStorage.setItem('goorac_cat_affinity', JSON.stringify(this.categoryAffinity));
        }

        // Basic Frequency Logic (Modified with Feature 6: Implicit Decay)
        // By multiplying existing frequencies by 0.99, older emojis slowly lose rank over time
        for(let key in this.emojiFrequency) {
            this.emojiFrequency[key] = this.emojiFrequency[key] * 0.99; 
            if(this.emojiFrequency[key] < 0.1) delete this.emojiFrequency[key]; // clean up floating decimals
        }
        this.emojiFrequency[char] = (this.emojiFrequency[char] || 0) + 1;
        localStorage.setItem('goorac_emoji_freq', JSON.stringify(this.emojiFrequency));

        // Recents array manipulation - limited to 16
        this.recentEmojis = this.recentEmojis.filter(e => e !== char);
        this.recentEmojis.unshift(char);
        if(this.recentEmojis.length > 16) this.recentEmojis.pop(); // Max 2 lines (8 columns x 2)
        localStorage.setItem('goorac_recents', JSON.stringify(this.recentEmojis));
        
        this.updateRecentsDOM();
    }

    updateRecentsDOM() {
        let recentsContainer = this.shadowRoot.getElementById('cat-recents');
        
        // If we just started having recents or the suggested list layout needs to recalculate, trigger full reload
        // Since we now have 'Related' rows that update on EVERY click, we must run loadEmojis() entirely.
        this.loadEmojis('all');
    }
}

customElements.define('emoji-picker', EmojiPicker);
