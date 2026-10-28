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

  // Email verification code (backend #203, #252)
  'Verify your email': 'تأكيد بريدك الإلكتروني',
  'Enter the 6-digit code we sent to {email}.': 'أدخل الكود المكوّن من 6 أرقام الذي أرسلناه إلى {email}.',
  'The code works for 10 minutes.': 'الكود صالح لمدة 10 دقائق.',
  Code: 'الكود',
  Verify: 'تحقق',
  'Resend code': 'إعادة إرسال الكود',
  'Resend code in {seconds} s': 'إعادة الإرسال بعد {seconds} ث',
  'Back to sign in': 'العودة إلى تسجيل الدخول',
  'Sign in again to get to your code.': 'سجّل الدخول مرة أخرى للوصول إلى الكود.',
  'Enter the 6 digits from the email.': 'أدخل الأرقام الستة من البريد الإلكتروني.',
  'We sent a new code to {email}.': 'أرسلنا كودًا جديدًا إلى {email}.',
  "That code isn't right. Check the email and try again.": 'الكود غير صحيح. تحقق من البريد الإلكتروني وحاول مرة أخرى.',
  'This code has expired. Request a new one.': 'انتهت صلاحية هذا الكود. اطلب كودًا جديدًا.',
  'Too many wrong codes. Request a new one.': 'أُدخلت أكواد خاطئة كثيرة. اطلب كودًا جديدًا.',
  "That code is wrong or has expired. Request a new one if it's been more than 10 minutes.":
    'الكود غير صحيح أو انتهت صلاحيته. اطلب كودًا جديدًا إذا مرّ أكثر من 10 دقائق.',
  'Too many tries. Wait a minute, then try again.': 'محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.',
  'Unable to verify right now. Try again.': 'تعذّر التحقق الآن. حاول مرة أخرى.',
  'Wait a minute before asking for another code.': 'انتظر دقيقة قبل طلب كود آخر.',
  "Email isn't available right now. Try again later.": 'البريد الإلكتروني غير متاح الآن. حاول مرة أخرى لاحقًا.',
  'Unable to send a new code right now. Try again.': 'تعذّر إرسال كود جديد الآن. حاول مرة أخرى.',
  'Email verified. Sign in to continue.': 'تم تأكيد بريدك الإلكتروني. سجّل الدخول للمتابعة.',

  // Password change and reset (backend #35)
  'Change password': 'تغيير كلمة المرور',
  'You stay signed in here. Every other device is signed out.': 'ستبقى مسجّل الدخول هنا، وسيتم تسجيل الخروج من كل الأجهزة الأخرى.',
  'Current password': 'كلمة المرور الحالية',
  'Enter your current password': 'أدخل كلمة المرور الحالية',
  'New password': 'كلمة المرور الجديدة',
  'Confirm new password': 'تأكيد كلمة المرور الجديدة',
  'At least 8 characters': '8 أحرف على الأقل',
  'Enter a new password': 'أدخل كلمة مرور جديدة',
  'Use at least {count} characters': 'استخدم {count} أحرف على الأقل',
  'Enter the new password again': 'أدخل كلمة المرور الجديدة مرة أخرى',
  "The passwords don't match": 'كلمتا المرور غير متطابقتين',
  'Choose a password different from your current one.': 'اختر كلمة مرور مختلفة عن كلمة المرور الحالية.',
  'Your current password is wrong. Too many wrong tries lock the account for a while.':
    'كلمة المرور الحالية غير صحيحة. كثرة المحاولات الخاطئة تقفل الحساب لبعض الوقت.',
  'Unable to change your password right now. Try again.': 'تعذّر تغيير كلمة المرور الآن. حاول مرة أخرى.',
  'Password changed. Your other devices were signed out.': 'تم تغيير كلمة المرور، وتم تسجيل الخروج من أجهزتك الأخرى.',
  'Forgot password?': 'نسيت كلمة المرور؟',
  'Forgot your password?': 'نسيت كلمة المرور؟',
  "Enter your account's phone number. We'll text you a code to set a new password.":
    'أدخل رقم الموبايل المسجّل في حسابك، وسنرسل إليك كودًا في رسالة نصية لتعيين كلمة مرور جديدة.',
  Phone: 'الموبايل',
  'Only a phone number you verified in the app can get the code.': 'لا يصل الكود إلا إلى رقم موبايل أكّدته في التطبيق.',
  'Send code': 'إرسال الكود',
  'Unable to send a code right now. Try again.': 'تعذّر إرسال الكود الآن. حاول مرة أخرى.',
  "Resetting a password by text message isn't available yet. Try again later.":
    'إعادة تعيين كلمة المرور برسالة نصية غير متاحة بعد. حاول مرة أخرى لاحقًا.',
  'Too many requests. Wait a while, then try again.': 'طلبات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
  'Set a new password': 'تعيين كلمة مرور جديدة',
  'Enter the code and choose a new password.': 'أدخل الكود واختر كلمة مرور جديدة.',
  'If {phone} is the verified phone of an account, we texted it a 6-digit code. It works for 5 minutes.':
    'إذا كان {phone} هو الموبايل المؤكَّد لأحد الحسابات، فقد أرسلنا إليه كودًا من 6 أرقام. الكود صالح لمدة 5 دقائق.',
  'Enter the 6 digits from the text message.': 'أدخل الأرقام الستة من الرسالة.',
  "That code isn't right. Check the text message and the phone number, then try again.":
    'الكود غير صحيح. تحقق من الرسالة النصية ورقم الموبايل، ثم حاول مرة أخرى.',
  'Unable to reset your password right now. Try again.': 'تعذّرت إعادة تعيين كلمة المرور الآن. حاول مرة أخرى.',
  'We sent a new code to {phone}.': 'أرسلنا كودًا جديدًا إلى {phone}.',
  'Reset password': 'إعادة تعيين كلمة المرور',
  'Use a different number': 'استخدام رقم آخر',
  'Password changed. Sign in with your new password.': 'تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.',

  // Image uploads
  'Choose a JPEG, PNG or WebP image.': 'اختر صورة بصيغة JPEG أو PNG أو WebP.',
  'Choose an image under {mb} MB.': 'اختر صورة أصغر من {mb} ميجابايت.',
  'The upload did not go through. Check your connection and try again.': 'لم يكتمل الرفع. تحقق من اتصالك وحاول مرة أخرى.',

  // Language switch
  Language: 'اللغة',
  'Restart the app to finish switching the layout direction.': 'أعد تشغيل التطبيق لإكمال تغيير اتجاه الواجهة.',
};
