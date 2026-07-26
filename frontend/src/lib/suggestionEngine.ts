export type LanguageType = 'English' | 'Bangla' | 'Hindi';

export interface Suggestion {
  id: string;
  feature: string;
  path: string;
  text: string;
  iconType: 'quiz' | 'podcast' | 'flashcards' | 'molecule' | 'battle' | 'purifier' | 'map' | 'oracle' | 'live-podcast' | 'notes';
}

const FEATURE_CONFIG = [
  {
    id: 'quiz',
    feature: 'Quiz Mode',
    path: '/quiz',
    iconType: 'quiz' as const,
    keywords: {
      English: ['test', 'quiz', 'question', 'examine', 'understand', 'concept', 'assess', 'check', 'evaluate', 'ready', 'exam', 'prepare'],
      Bangla: ['কুইজ', 'টেস্ট', 'পরীক্ষা', 'প্রশ্ন', 'যাচাই', 'বুঝতে', 'প্রস্তুতি', 'মুল্যায়ন', 'পরীক্ষণ', 'নম্বর'],
      Hindi: ['क्विज़', 'टेस्ट', 'परीक्षा', 'प्रश्न', 'जांच', 'समझ', 'तैयारी', 'मूल्यांकन', 'जाँचना', 'नंबर']
    },
    questions: {
      English: [
        "Ready to test your knowledge on this?",
        "Should we do a quick pop quiz to lock this in?",
        "Let's see if you understood this! Take a quiz?",
        "Would you like to challenge yourself with some questions?",
        "Are you prepared for a 5-minute quiz on this topic?",
        "Time for a rapid-fire quiz round?",
        "Let's check your grasp on this material with a short quiz.",
        "How about a quiz to make sure this sticks?",
        "Want to generate an interactive test for this?",
        "Think you mastered this? Let's verify with a quiz!"
      ],
      Bangla: [
        "এই বিষয়ে আপনার জ্ঞান যাচাই করতে প্রস্তুত?",
        "পড়াটা মনে রাখতে একটা ছোট্ট কুইজ হয়ে যাক?",
        "চলুন দেখি আপনি কতটুকু বুঝেছেন! কুইজ শুরু করব?",
        "নিজেকে কয়েকটি প্রশ্ন দিয়ে চ্যালেঞ্জ করতে চান?",
        "এই টপিকের উপর ৫ মিনিটের একটি কুইজের জন্য প্রস্তুত?",
        "একটি দ্রুত কুইজ রাউন্ড শুরু করা যাক?",
        "ছোট্ট একটি কুইজ দিয়ে আপনার বোঝাপড়া যাচাই করে নিই।",
        "পড়াটা ভালোভাবে মনে রাখতে একটি কুইজ হয়ে যাক?",
        "এই বিষয়ে একটি ইন্টারঅ্যাকটিভ টেস্ট জেনারেট করব কি?",
        "ভাবছেন আপনি এটি পুরোপুরি শিখে গেছেন? কুইজ দিয়ে যাচাই করুন!"
      ],
      Hindi: [
        "क्या आप इस विषय पर अपना ज्ञान जांचने के लिए तैयार हैं?",
        "इसे याद रखने के लिए एक छोटी क्विज़ हो जाए?",
        "चलिए देखते हैं कि आपने कितना समझा! क्विज़ शुरू करें?",
        "क्या आप कुछ सवालों के साथ खुद को चुनौती देना चाहते हैं?",
        "इस विषय पर 5 मिनट की क्विज़ के लिए तैयार हैं?",
        "रैपिड-फायर क्विज़ राउंड का समय?",
        "एक छोटी क्विज़ के साथ अपनी समझ की जाँच करें।",
        "इसे पक्का करने के लिए एक क्विज़ कैसी रहेगी?",
        "क्या आप इसके लिए एक इंटरैक्टिव टेस्ट बनाना चाहते हैं?",
        "लगता है आपने इसे मास्टर कर लिया है? क्विज़ से जाँच करें!"
      ]
    }
  },
  {
    id: 'notes',
    feature: 'AI Notes Workspace',
    path: '/notes',
    iconType: 'notes' as const,
    keywords: {
      English: ['note', 'write', 'document', 'save', 'markdown', 'workspace', 'summary', 'record', 'draft', 'keep'],
      Bangla: ['নোট', 'লেখা', 'ডকুমেন্ট', 'সংরক্ষণ', 'সারসংক্ষেপ', 'রেকর্ড'],
      Hindi: ['नोट', 'लिखना', 'दस्तावेज़', 'सहेजना', 'सारांश', 'रिकॉर्ड']
    },
    questions: {
      English: [
        "Want to save this explanation to your AI Notes Workspace?",
        "Should we document this in your personal notes?",
        "I can help you draft a markdown note for this. Want to save it?",
        "Let's store this safely in your Workspace for later review."
      ],
      Bangla: [
        "এই ব্যাখ্যাটি আপনার এআই নোটস ওয়ার্কস্পেসে সেভ করতে চান?",
        "এটি কি আপনার ব্যক্তিগত নোটে সংরক্ষণ করব?",
        "পরবর্তীতে পড়ার জন্য এটি ওয়ার্কস্পেসে সেভ করে রাখুন।"
      ],
      Hindi: [
        "क्या आप इस स्पष्टीकरण को अपने AI नोट्स वर्कस्पेस में सहेजना चाहते हैं?",
        "क्या हम इसे आपके व्यक्तिगत नोट्स में दस्तावेज़ करें?",
        "बाद में पढ़ने के लिए इसे वर्कस्पेस में सुरक्षित रखें।"
      ]
    }
  },
  {
    id: 'podcast',
    feature: 'Audio Podcast',
    path: '/podcast',
    iconType: 'podcast' as const,
    keywords: {
      English: ['listen', 'audio', 'podcast', 'hear', 'discuss', 'debate', 'conversation', 'explain', 'long', 'story', 'voice'],
      Bangla: ['শুনুন', 'অডিও', 'পডকাস্ট', 'শোনা', 'আলোচনা', 'বিতর্ক', 'কথোপকথন', 'গল্প', 'ভয়েস'],
      Hindi: ['सुनना', 'ऑडियो', 'पॉडकास्ट', 'सुनें', 'चर्चा', 'बहस', 'बातचीत', 'कहानी', 'आवाज़']
    },
    questions: {
      English: [
        "Want to listen to a 2-person debate on this?",
        "Should I convert this explanation into an audio podcast?",
        "Rest your eyes. Would you like to listen to this instead?",
        "How about we turn these notes into a conversation?",
        "I can generate a dynamic audio discussion on this. Want to hear it?",
        "Want to hear an AI-generated debate about this?",
        "Would an audio summary make this easier to understand?",
        "Let's put on some headphones and listen to this topic.",
        "How about an audio deep-dive into these concepts?",
        "Prefer listening? I can create a custom podcast on this."
      ],
      Bangla: [
        "এই বিষয়ে একটি ২-জনের অডিও বিতর্ক শুনতে চান?",
        "আমি কি এই ব্যাখ্যাটি একটি পডকাস্টে রূপান্তর করব?",
        "চোখকে বিশ্রাম দিন। এর বদলে এটা শুনতে চান?",
        "চলুন এই নোটগুলোকে একটি কথোপকথনে পরিণত করি?",
        "আমি একটি অডিও আলোচনা তৈরি করতে পারি। শুনবেন কি?",
        "এই বিষয়ে এআই জেনারেটেড অডিও ডিবেট শুনতে চান?",
        "একটি অডিও সামারি কি এটি বুঝতে আরও সাহায্য করবে?",
        "হেডফোন লাগিয়ে এই টপিকটি শোনা যাক, কী বলেন?",
        "এই ধারণাগুলোর উপর একটি অডিও ডীপ-ডাইভ শুনতে চান?",
        "পড়তে ভালো লাগছে না? আমি এর উপর একটি পডকাস্ট বানিয়ে দিতে পারি।"
      ],
      Hindi: [
        "क्या आप इस पर 2-व्यक्ति ऑडियो बहस सुनना चाहते हैं?",
        "क्या मुझे इस स्पष्टीकरण को पॉडकास्ट में बदलना चाहिए?",
        "आँखों को आराम दें। क्या आप इसके बजाय इसे सुनना चाहेंगे?",
        "चलिए इन नोट्स को बातचीत में बदलते हैं?",
        "मैं एक ऑडियो चर्चा उत्पन्न कर सकता हूँ। क्या आप सुनना चाहेंगे?",
        "क्या आप इस पर AI-जनरेटेड बहस सुनना चाहते हैं?",
        "क्या एक ऑडियो सारांश इसे समझने में आसान बनाएगा?",
        "चलिए हेडफ़ोन लगाते हैं और इस विषय को सुनते हैं।",
        "इन अवधारणाओं पर एक ऑडियो डीप-डाइव कैसा रहेगा?",
        "क्या आप सुनना पसंद करेंगे? मैं इस पर एक कस्टम पॉडकास्ट बना सकता हूँ।"
      ]
    }
  },
  {
    id: 'flashcards',
    feature: 'Flashcards',
    path: '/flashcards',
    iconType: 'flashcards' as const,
    keywords: {
      English: ['memorize', 'remember', 'recall', 'term', 'definition', 'vocabulary', 'retain', 'flashcard', 'short', 'fact'],
      Bangla: ['মুখস্থ', 'মনে রাখা', 'স্মরণ', 'সংজ্ঞা', 'শব্দভাণ্ডার', 'ফ্ল্যাশকার্ড', 'তথ্য'],
      Hindi: ['याद', 'स्मरण', 'याद रखना', 'परिभाषा', 'शब्दावली', 'फ्लैशकार्ड', 'तथ्य']
    },
    questions: {
      English: [
        "Should I generate flashcards so you don't forget this?",
        "Want to memorize these terms quickly with Flashcards?",
        "Let's lock this into your long-term memory. Create flashcards?",
        "Need to memorize these definitions? I can make cards.",
        "Would spaced-repetition help you remember this better?",
        "Let's convert this into bite-sized flashcards.",
        "Struggling to remember this? Flashcards can help.",
        "I can extract the key terms into flashcards for you.",
        "Want to drill these concepts using flashcards?",
        "Let's build a flashcard deck out of this information!"
      ],
      Bangla: [
        "পড়া যাতে ভুলে না যান, তাই কি ফ্ল্যাশকার্ড তৈরি করব?",
        "ফ্ল্যাশকার্ড দিয়ে কি এই টার্মগুলো দ্রুত মুখস্থ করতে চান?",
        "চলুন এটা দীর্ঘমেয়াদী মেমোরিতে সেভ করি। ফ্ল্যাশকার্ড বানাবো?",
        "এই সংজ্ঞাগুলো মনে রাখা দরকার? আমি কার্ড বানাতে পারি।",
        "Spaced-repetition কি এটা আরও ভালোভাবে মনে রাখতে সাহায্য করবে?",
        "চলুন এগুলোকে ছোট ছোট ফ্ল্যাশকার্ডে রূপান্তর করি।",
        "মনে রাখতে কষ্ট হচ্ছে? ফ্ল্যাশকার্ড সাহায্য করতে পারে।",
        "আমি আপনার জন্য গুরুত্বপূর্ণ টার্মগুলো দিয়ে ফ্ল্যাশকার্ড তৈরি করতে পারি।",
        "ফ্ল্যাশকার্ড দিয়ে এই ধারণাগুলো প্র্যাকটিস করতে চান?",
        "এই তথ্যগুলো দিয়ে একটি ফ্ল্যাশকার্ড ডেক তৈরি করা যাক!"
      ],
      Hindi: [
        "क्या मुझे फ्लैशकार्ड बनाने चाहिए ताकि आप इसे न भूलें?",
        "फ्लैशकार्ड के साथ इन शब्दों को जल्दी याद करना चाहते हैं?",
        "चलिए इसे आपकी लॉन्ग-टर्म मेमोरी में सेव करते हैं। फ्लैशकार्ड बनाएं?",
        "इन परिभाषाओं को याद रखने की आवश्यकता है? मैं कार्ड बना सकता हूँ。",
        "क्या Spaced-repetition इसे बेहतर ढंग से याद रखने में मदद करेगा?",
        "चलिए इसे छोटे-छोटे फ्लैशकार्ड में बदलते हैं।",
        "इसे याद रखने में संघर्ष कर रहे हैं? फ्लैशकार्ड मदद कर सकते हैं।",
        "मैं आपके लिए मुख्य शब्दों को निकालकर फ्लैशकार्ड बना सकता हूँ।",
        "फ्लैशकार्ड का उपयोग करके इन अवधारणाओं का अभ्यास करना चाहते हैं?",
        "चलिए इस जानकारी से एक फ्लैशकार्ड डेक बनाते हैं!"
      ]
    }
  },
  {
    id: 'live-podcast',
    feature: 'Live Podcast',
    path: '/live',
    iconType: 'live-podcast' as const,
    keywords: {
      English: ['live', 'broadcast', 'host', 'microphone', 'speak', 'interview', 'talk', 'radio', 'on-air', 'studio', 'mic'],
      Bangla: ['লাইভ', 'সম্প্রচার', 'মাইক্রোফোন', 'কথা', 'সাক্ষাৎকার', 'রেডিও', 'স্টুডিও'],
      Hindi: ['लाइव', 'प्रसारण', 'मेजबान', 'माइक्रोफोन', 'बोलना', 'साक्षात्कार', 'बात', 'रेडियो', 'स्टूडियो']
    },
    questions: {
      English: [
        "Want to host a live interactive podcast on this?",
        "Should we turn this into a live radio broadcast?",
        "Let's step into the studio for a live AI interview.",
        "Want to discuss this topic live on air?",
        "I can start a live podcast session. Ready?",
        "Would you like to be the host of a live show about this?",
        "Let's grab a mic and start a live podcast!",
        "Time for a live talk show about these concepts?",
        "Want to debate this in real-time on a live podcast?",
        "Let's broadcast your knowledge in a live session!"
      ],
      Bangla: [
        "এই বিষয়ে একটি লাইভ ইন্টারঅ্যাকটিভ পডকাস্ট হোস্ট করতে চান?",
        "আমরা কি এটিকে একটি লাইভ রেডিও সম্প্রচারে পরিণত করব?",
        "চলুন লাইভ এআই সাক্ষাৎকারের জন্য স্টুডিওতে যাই।",
        "এই টপিকটি নিয়ে লাইভ অন-এয়ার আলোচনা করতে চান?",
        "আমি একটি লাইভ পডকাস্ট সেশন শুরু করতে পারি। প্রস্তুত?",
        "আপনি কি এই বিষয়ে একটি লাইভ শো-এর হোস্ট হতে চান?",
        "চলুন মাইক হাতে নিই এবং একটি লাইভ পডকাস্ট শুরু করি!",
        "এই ধারণাগুলো নিয়ে একটি লাইভ টক শো-এর সময় হয়েছে?",
        "লাইভ পডকাস্টে রিয়েল-টাইমে এটি নিয়ে বিতর্ক করতে চান?",
        "চলুন একটি লাইভ সেশনে আপনার জ্ঞান সম্প্রচার করি!"
      ],
      Hindi: [
        "क्या आप इस पर लाइव इंटरैक्टिव पॉडकास्ट होस्ट करना चाहते हैं?",
        "क्या हमें इसे लाइव रेडियो प्रसारण में बदलना चाहिए?",
        "चलिए लाइव AI साक्षात्कार के लिए स्टूडियो में चलते हैं।",
        "क्या आप इस विषय पर लाइव ऑन-एयर चर्चा करना चाहते हैं?",
        "मैं एक लाइव पॉडकास्ट सत्र शुरू कर सकता हूँ। तैयार हैं?",
        "क्या आप इस बारे में लाइव शो के मेजबान बनना चाहेंगे?",
        "चलिए माइक लेते हैं और एक लाइव पॉडकास्ट शुरू करते हैं!",
        "क्या इन अवधारणाओं के बारे में लाइव टॉक शो का समय आ गया है?",
        "क्या आप लाइव पॉडकास्ट पर रीयल-टाइम में इस पर बहस करना चाहते हैं?",
        "चलिए लाइव सत्र में आपके ज्ञान का प्रसारण करते हैं!"
      ]
    }
  },
  {
    id: 'molecule',
    feature: '3D Lab',
    path: '/molecule',
    iconType: 'molecule' as const,
    keywords: {
      English: ['chemistry', 'molecule', 'bond', 'atom', 'structure', 'chemical', 'reaction', 'organic', 'carbon', 'compound'],
      Bangla: ['রসায়ন', 'অণু', 'বন্ড', 'পরমাণু', 'কাঠামো', 'রাসায়নিক', 'প্রতিক্রিয়া', 'জৈব', 'যৌগ'],
      Hindi: ['रसायन विज्ञान', 'अणु', 'बंधन', 'परमाणु', 'संरचना', 'रासायनिक', 'प्रतिक्रिया', 'कार्बनिक', 'यौगिक']
    },
    questions: {
      English: [
        "Want to visualize this molecule in the 3D Lab?",
        "Should we look at the 3D structure of this compound?",
        "Let's step into the 3D chemistry lab to see this clearly.",
        "Would a 3D visualization help you understand these bonds?",
        "I can render this chemical structure in 3D. Open the lab?",
        "Want to spin this molecule around in 3D space?",
        "Let's explore the molecular geometry of this compound.",
        "I can bring this molecule to life in the 3D viewer.",
        "Ready to interact with this molecule's 3D model?",
        "Let's open the 3D Lab and inspect this compound closely."
      ],
      Bangla: [
        "থ্রিডি ল্যাবে এই অণুটি দেখতে চান?",
        "আমরা কি এই যৌগের থ্রিডি কাঠামোটি দেখব?",
        "চলুন এটা পরিষ্কারভাবে দেখতে থ্রিডি কেমিস্ট্রি ল্যাবে যাই।",
        "থ্রিডি ভিজ্যুয়ালাইজেশন কি বন্ডগুলো বুঝতে সাহায্য করবে?",
        "আমি এই রাসায়নিক কাঠামো থ্রিডিতে রেন্ডার করতে পারি। ল্যাব খুলব?",
        "এই অণুটি থ্রিডি স্পেসে ঘুরিয়ে দেখতে চান?",
        "চলুন এই যৌগের আণবিক গঠনটি আরও ভালোভাবে এক্সপ্লোর করি।",
        "আমি এই অণুকে থ্রিডি ভিউয়ারে জীবন্ত করে তুলতে পারি।",
        "এই অণুর থ্রিডি মডেল নিয়ে কাজ করতে প্রস্তুত?",
        "চলুন থ্রিডি ল্যাব খুলে এই যৌগটি আরও ভালোভাবে দেখি।"
      ],
      Hindi: [
        "क्या आप 3D लैब में इस अणु की कल्पना करना चाहते हैं?",
        "क्या हमें इस यौगिक की 3D संरचना देखनी चाहिए?",
        "चलिए इसे स्पष्ट रूप से देखने के लिए 3D रसायन विज्ञान प्रयोगशाला में चलते हैं।",
        "क्या 3D विज़ुअलाइज़ेशन इन बंधनों को समझने में मदद करेगा?",
        "मैं इस रासायनिक संरचना को 3D में प्रस्तुत कर सकता हूँ। लैब खोलें?",
        "क्या आप इस अणु को 3D स्पेस में घुमाना चाहते हैं?",
        "चलिए इस यौगिक की आणविक ज्यामिति का अन्वेषण करें।",
        "मैं 3D व्यूअर में इस अणु को जीवंत कर सकता हूँ।",
        "इस अणु के 3D मॉडल के साथ बातचीत करने के लिए तैयार हैं?",
        "चलिए 3D लैब खोलें और इस यौगिक का बारीकी से निरीक्षण करें।"
      ]
    }
  },
  {
    id: 'battle',
    feature: 'Concept Battle',
    path: '/concept-battle',
    iconType: 'battle' as const,
    keywords: {
      English: ['game', 'compete', 'battle', 'multiplayer', 'friend', 'challenge', 'score', 'win', 'fight', 'arena'],
      Bangla: ['খেলা', 'গেম', 'প্রতিযোগিতা', 'যুদ্ধ', 'ব্যাটেল', 'বন্ধুরা', 'চ্যালেঞ্জ', 'স্কোর', 'জেতা', 'লড়াই'],
      Hindi: ['खेल', 'गेम', 'प्रतिस्पर्धा', 'युद्ध', 'बैटल', 'दोस्त', 'चुनौती', 'स्कोर', 'जीत', 'लड़ाई']
    },
    questions: {
      English: [
        "Ready to battle your friends on this topic?",
        "Let's take this to the Concept Battle arena!",
        "Think you know this well? Challenge someone to a battle.",
        "Want to gamify your learning? Start a Concept Battle.",
        "Let's test your reflexes in a multiplayer quiz battle!",
        "Dare to face a friend in a Concept Battle?",
        "It's time to see who is the ultimate master of this topic.",
        "Turn this topic into an intense Concept Battle!",
        "Prove your knowledge in a 1-on-1 battle arena.",
        "Want to challenge another user on these concepts?"
      ],
      Bangla: [
        "এই বিষয়ে বন্ধুদের সাথে ব্যাটেলে নামতে প্রস্তুত?",
        "চলুন এটি নিয়ে কনসেপ্ট ব্যাটেলে অংশগ্রহণ করি!",
        "ভাবছেন এটা খুব ভালো পারেন? কাউকে ব্যাটেলে চ্যালেঞ্জ করুন।",
        "পড়াশোনাকে মজাদার করতে চান? একটি কনসেপ্ট ব্যাটেল শুরু করুন।",
        "চলুন মাল্টিপ্লেয়ার কুইজ ব্যাটেলে আপনার দক্ষতা পরীক্ষা করি!",
        "বন্ধুর সাথে কনসেপ্ট ব্যাটেলে মুখোমুখি হতে সাহস আছে?",
        "এই টপিকের আসল মাস্টার কে, তা দেখার সময় এসেছে।",
        "এই টপিকটিকে একটি জমজমাট ব্যাটেলে পরিণত করুন!",
        "১-বনাম-১ ব্যাটেল অ্যারেনায় আপনার জ্ঞান প্রমাণ করুন।",
        "এই ধারণাগুলোর উপর অন্য কোনো ইউজারকে চ্যালেঞ্জ করতে চান?"
      ],
      Hindi: [
        "क्या आप इस विषय पर अपने दोस्तों से मुकाबला करने के लिए तैयार हैं?",
        "चलिए इसे कॉन्सेप्ट बैटल अखाड़े में ले चलते हैं!",
        "लगता है आप इसे अच्छी तरह से जानते हैं? किसी को चुनौती दें।",
        "अपनी पढ़ाई को मजेदार बनाना चाहते हैं? कॉन्सेप्ट बैटल शुरू करें।",
        "चलिए मल्टीप्लेयर क्विज़ बैटल में आपके कौशल का परीक्षण करते हैं!",
        "क्या आप किसी दोस्त का कॉन्सेप्ट बैटल में सामना करने की हिम्मत रखते हैं?",
        "यह देखने का समय आ गया है कि इस विषय का असली मास्टर कौन है।",
        "इस विषय को एक गहन कॉन्सेप्ट बैटल में बदलें!",
        "1-ऑन-1 बैटल अखाड़े में अपना ज्ञान साबित करें।",
        "क्या आप इन अवधारणाओं पर किसी अन्य उपयोगकर्ता को चुनौती देना चाहते हैं?"
      ]
    }
  },
  {
    id: 'map',
    feature: 'Mind Map',
    path: '/mind-map',
    iconType: 'map' as const,
    keywords: {
      English: ['connect', 'relate', 'visualize', 'map', 'flow', 'structure', 'overview', 'chart', 'organize', 'hierarchy'],
      Bangla: ['সংযোগ', 'সম্পর্ক', 'কল্পনা', 'ম্যাপ', 'ফ্লোচার্ট', 'গঠন', 'চার্ট', 'সাজানো', 'মানচিত্র'],
      Hindi: ['जोड़ना', 'संबंध', 'कल्पना', 'मानचित्र', 'फ्लोचार्ट', 'संरचना', 'चार्ट', 'व्यवस्थित', 'नक्शा']
    },
    questions: {
      English: [
        "Would a Mind Map help you see the bigger picture?",
        "Should I generate a visual flowchart of these ideas?",
        "Let's connect the dots. Open the Mind Map generator?",
        "Want to see how all these concepts link together?",
        "I can build an interactive knowledge graph for this. Ready?",
        "Let's organize these ideas into a clear Mind Map.",
        "Need a visual breakdown? I can map this out.",
        "Want a bird's-eye view of this topic?",
        "Let's trace the connections between these concepts visually.",
        "I can draw a dynamic map to connect all these points."
      ],
      Bangla: [
        "মাইন্ড ম্যাপ কি পুরো বিষয়টি বুঝতে সাহায্য করবে?",
        "আমি কি এই আইডিয়াগুলোর একটি ভিজ্যুয়াল ফ্লোচার্ট তৈরি করব?",
        "চলুন বিষয়গুলোর মধ্যে সংযোগ স্থাপন করি। মাইন্ড ম্যাপ খুলব?",
        "দেখতে চান কীভাবে এই ধারণাগুলো একসাথে যুক্ত?",
        "আমি এর জন্য একটি নলেজ গ্রাফ তৈরি করতে পারি। প্রস্তুত?",
        "চলুন এই ধারণাগুলোকে একটি পরিষ্কার মাইন্ড ম্যাপে সাজাই।",
        "ভিজ্যুয়াল ব্রেকডাউন দরকার? আমি ম্যাপ করে দিতে পারি।",
        "এই টপিকের একটি সামগ্রিক চিত্র দেখতে চান?",
        "চলুন এই ধারণাগুলোর মধ্যকার সংযোগগুলো দৃশ্যত ট্রেস করি।",
        "এই পয়েন্টগুলো যুক্ত করতে আমি একটি ডায়নামিক ম্যাপ আঁকতে পারি।"
      ],
      Hindi: [
        "क्या माइंड मैप से आपको पूरी तस्वीर देखने में मदद मिलेगी?",
        "क्या मुझे इन विचारों का विज़ुअल फ्लोचार्ट बनाना चाहिए?",
        "चलिए बिंदुओं को जोड़ते हैं। माइंड मैप जनरेटर खोलें?",
        "क्या आप देखना चाहते हैं कि ये सभी अवधारणाएं कैसे जुड़ती हैं?",
        "मैं इसके लिए एक ज्ञान ग्राफ बना सकता हूँ। तैयार हैं?",
        "चलिए इन विचारों को एक स्पष्ट माइंड मैप में व्यवस्थित करते हैं।",
        "क्या एक दृश्य विश्लेषण की आवश्यकता है? मैं इसका नक्शा बना सकता हूँ।",
        "क्या आप इस विषय का विहंगम दृश्य देखना चाहते हैं?",
        "चलिए इन अवधारणाओं के बीच के संबंधों को दृष्टिगत रूप से ट्रेस करते हैं।",
        "मैं इन सभी बिंदुओं को जोड़ने के लिए एक गतिशील नक्शा बना सकता हूँ।"
      ]
    }
  },
  {
    id: 'oracle',
    feature: 'Exam Oracle',
    path: '/dashboard/oracle',
    iconType: 'oracle' as const,
    keywords: {
      English: ['predict', 'exam', 'probability', 'important', 'chance', 'score', 'grade', 'pass', 'future', 'radar', 'panic'],
      Bangla: ['ভবিষ্যদ্বাণী', 'পরীক্ষা', 'সম্ভাবনা', 'গুরুত্বপূর্ণ', 'স্কোর', 'গ্রেড', 'পাস', 'ভবিষ্যত', 'প্যানিক', 'কমন'],
      Hindi: ['भविष्यवाणी', 'परीक्षा', 'संभावना', 'महत्वपूर्ण', 'स्कोर', 'ग्रेड', 'पास', 'भविष्य', 'पैनिक', 'सामान्य']
    },
    questions: {
      English: [
        "Want to know the probability of this appearing in the exam?",
        "Should the Oracle predict if this will be tested?",
        "Let's check the Exam Radar for this topic.",
        "Want to see how critical this is for your final grade?",
        "I can analyze past papers to predict this topic's importance.",
        "Should we consult the Exam Oracle for predictions?",
        "Wondering if you can skip this? Let's check the Oracle.",
        "Let me calculate the likelihood of this question appearing.",
        "Is this a high-yield topic? The Oracle can tell you.",
        "Let's look at historical exam trends for this subject."
      ],
      Bangla: [
        "পরীক্ষায় এটি আসার সম্ভাবনা কতটুকু তা জানতে চান?",
        "ওরাকল কি ভবিষ্যদ্বাণী করবে এটি পরীক্ষায় আসবে কিনা?",
        "চলুন এই টপিকের জন্য এক্সাম রাডার চেক করি।",
        "ফাইনাল গ্রেডের জন্য এটি কতটা গুরুত্বপূর্ণ তা দেখতে চান?",
        "এটি কতটা কমন তা জানতে আমি বিগত প্রশ্ন বিশ্লেষণ করতে পারি।",
        "ভবিষ্যদ্বাণীর জন্য আমরা কি এক্সাম ওরাকলের পরামর্শ নেব?",
        "ভাবছেন এটা বাদ দেওয়া যাবে কি না? চলুন ওরাকল চেক করি।",
        "এই প্রশ্নটি আসার সম্ভাবনা কতটুকু তা আমাকে হিসাব করতে দিন।",
        "এটি কি খুব গুরুত্বপূর্ণ টপিক? ওরাকল আপনাকে বলতে পারবে।",
        "চলুন এই বিষয়ের অতীত পরীক্ষার ট্রেন্ডগুলো একবার দেখে নিই।"
      ],
      Hindi: [
        "क्या आप जानना चाहते हैं कि परीक्षा में इसके आने की कितनी संभावना है?",
        "क्या ऑरेकल को भविष्यवाणी करनी चाहिए कि यह आएगा या नहीं?",
        "चलिए इस विषय के लिए एग्जाम रडार की जांच करते हैं।",
        "क्या आप देखना चाहते हैं कि यह आपके अंतिम ग्रेड के लिए कितना महत्वपूर्ण है?",
        "मैं यह अनुमान लगाने के लिए पिछले पेपर का विश्लेषण कर सकता हूँ।",
        "क्या हमें भविष्यवाणियों के लिए एग्जाम ऑरेकल से सलाह लेनी चाहिए?",
        "सोच रहे हैं कि क्या आप इसे छोड़ सकते हैं? आइए ऑरेकल की जांच करें।",
        "मुझे इस प्रश्न के आने की संभावना की गणना करने दें।",
        "क्या यह एक महत्वपूर्ण विषय है? ऑरेकल आपको बता सकता है।",
        "चलिए इस विषय के लिए ऐतिहासिक परीक्षा प्रवृत्तियों को देखते हैं।"
      ]
    }
  }
];

export class SuggestionEngine {
  /**
   * Analyzes text and returns the top 2 most relevant contextual suggestions.
   * Matches keywords globally in all languages, but returns the suggestion text in the specified UI language.
   */
  static analyzeAndSuggest(text: string, language: LanguageType = 'English'): Suggestion[] {
    const lowerText = text.toLowerCase();
    
    // 1. Score each feature based on keyword matches (checks English, Bangla, and Hindi keywords)
    const scores = FEATURE_CONFIG.map(feature => {
      let score = 0;
      const allKeywords = [
        ...feature.keywords.English,
        ...feature.keywords.Bangla,
        ...feature.keywords.Hindi
      ];

      allKeywords.forEach(kw => {
        // Simple string matching to handle non-latin word boundaries safely
        const kwLower = kw.toLowerCase();
        let index = lowerText.indexOf(kwLower);
        while (index !== -1) {
           score++;
           index = lowerText.indexOf(kwLower, index + kwLower.length);
        }
      });
      return { ...feature, score };
    });

    // 2. Sort by highest score
    scores.sort((a, b) => b.score - a.score);

    // 3. Fallback logic
    let topFeatures = scores.slice(0, 2);
    if (topFeatures[0].score === 0) {
      topFeatures = [
        scores.find(f => f.id === 'quiz')!,
        scores.find(f => f.id === 'flashcards')!
      ];
    }

    // 4. Generate the final Suggestions by picking a random question variation in the target language
    return topFeatures.map(feature => {
      const localizedQuestions = feature.questions[language] || feature.questions['English'];
      const randomIndex = Math.floor(Math.random() * localizedQuestions.length);
      return {
        id: feature.id,
        feature: feature.feature, // Keeping feature name English as it's a branded noun
        path: feature.path,
        text: localizedQuestions[randomIndex],
        iconType: feature.iconType
      };
    });
  }
}
