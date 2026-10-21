/** Arabic for the shared kit's own text (#151): buttons, states, errors, dates and validation. */
export const kitArabic: Readonly<Record<string, string>> = {
  // Components
  Cancel: 'إلغاء',
  Close: 'إغلاق',
  Dismiss: 'إخفاء',
  'Go back': 'رجوع',
  Loading: 'جارٍ التحميل',
  'Tap to dismiss': 'اضغط للإخفاء',
  'Try again': 'حاول مرة أخرى',
  'Something went wrong': 'حدث خطأ ما',
  'Something went wrong. Please try again.': 'حدث خطأ ما. حاول مرة أخرى.',
  'You appear to be offline': 'يبدو أنك غير متصل بالإنترنت',
  'Delivery Plus': 'ديليفري بلس',

  // API client
  'Delivery Plus is having trouble right now. Please try again shortly.': 'تواجه ديليفري بلس مشكلة الآن. حاول مرة أخرى بعد قليل.',
  'The request took too long. Check your connection and try again.': 'استغرق الطلب وقتًا طويلًا. تحقق من اتصالك وحاول مرة أخرى.',
  "Can't reach Delivery Plus. Check your connection and try again.": 'تعذّر الوصول إلى ديليفري بلس. تحقق من اتصالك وحاول مرة أخرى.',
  'Please sign in again.': 'يرجى تسجيل الدخول مرة أخرى.',

  // Session ended (#34, #202)
  'Your account is suspended': 'تم إيقاف حسابك',
  "You can't use Delivery Plus with this account right now. If you think this is a mistake, contact Delivery Plus support.": 'لا يمكنك استخدام ديليفري بلس بهذا الحساب حاليًا. إذا كنت تعتقد أن هذا خطأ، فتواصل مع دعم ديليفري بلس.',
  OK: 'حسنًا',
  'You have been signed out': 'تم تسجيل خروجك',
  'Your session ended. Sign in again to continue.': 'انتهت جلستك. سجّل الدخول مرة أخرى للمتابعة.',
  'Sign in': 'تسجيل الدخول',
  'This account is suspended.': 'هذا الحساب موقوف.',

  // Dates and greetings
  'Just now': 'الآن',
  '{n}m ago': 'منذ {n} د',
  '{n}h ago': 'منذ {n} س',
  '{n}d ago': 'منذ {n} يوم',
  'Good morning': 'صباح الخير',
  'Good afternoon': 'مساء الخير',
  'Good evening': 'مساء الخير',

  // Phone (#152)
  'Enter an Egyptian mobile number, e.g. 01012345678 or +20 101 234 5678 (Vodafone 010, Etisalat 011, Orange 012, WE 015).':
    'أدخل رقم موبايل مصريًا، مثل 01012345678 أو ‎+20 101 234 5678 (فودافون 010، اتصالات 011، أورنج 012، WE ‏015).',
  'Egyptian mobile, e.g. 010 1234 5678': 'موبايل مصري، مثل 010 1234 5678',

  // Sign-in errors
  'Unable to sign in right now.': 'تعذّر تسجيل الدخول الآن.',
  'Email or password is incorrect. Check for typos, or create an account if you are new.':
    'البريد الإلكتروني أو كلمة المرور غير صحيحة. تحقق من الكتابة، أو أنشئ حسابًا إذا كنت جديدًا.',
  'Too many sign-in attempts. Wait a minute, then try again.': 'محاولات تسجيل دخول كثيرة. انتظر دقيقة ثم حاول مرة أخرى.',

  // Image uploads
  'Choose a JPEG, PNG or WebP image.': 'اختر صورة بصيغة JPEG أو PNG أو WebP.',
  'Choose an image under {mb} MB.': 'اختر صورة أصغر من {mb} ميجابايت.',
  'The upload did not go through. Check your connection and try again.': 'لم يكتمل الرفع. تحقق من اتصالك وحاول مرة أخرى.',

  // Language switch
  Language: 'اللغة',
  'Restart the app to finish switching the layout direction.': 'أعد تشغيل التطبيق لإكمال تغيير اتجاه الواجهة.',
};
