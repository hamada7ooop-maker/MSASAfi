# تقرير الفحص الشامل لتطبيق مصاريفي (Masarifi)

**الإصدار المفحوص:** v23.0.6
**تاريخ الفحص:** 2026-09-12
**الفرع:** `arena/01a097d5-msasafi`
**نطاق الفحص:** ‏68,418 سطر TypeScript/TSX · 518 ملف · 69 ملف اختبار

---

> **تحديث:** عولجت في هذا الفرع كل الملاحظات الحرجة وعالية الخطورة تقريباً عبر سلسلة الالتزامات المرفقة.
> **C-1 أُغلقت نهائياً:** استُعيدت ملفات Gradle في `ee272e9`، وأكّد المالك نجاح البناء والتوقيع فعلياً تحت Java 21 (Adoptium Hotspot) بإنتاج
> `Masarifi_V23.0.9_Signed_Release.apk` (15.85 MB، ببصمة تشفير موثّقة) — وهو الإثبات التشغيلي الذي تعذّر في بيئة المراجعة لانعدام `java`.
> راجع قسم **12. حالة المعالجة** في نهاية التقرير.

## 1. الملخص التنفيذي

مصاريفي تطبيق مالي شخصي **ناضج ومهندَس بشكل جيد بدرجة تفوق المتوسط بكثير**. البنية المعيارية (feature-based) نظيفة، طبقة قاعدة البيانات مفصولة المسؤوليات باحترافية، ولا يوجد **ولا استخدام واحد** لـ `any` أو `@ts-ignore` في كامل الكود المصدري — وهذا إنجاز نادر في مشروع بهذا الحجم.

### نتائج فحوصات الجودة (منفَّذة فعلياً)

| الفحص | النتيجة | التفاصيل |
|---|---|---|
| `tsc --noEmit` | ✅ نجح | صفر أخطاء أنواع |
| `eslint .` | ✅ نجح | صفر تحذيرات |
| `vitest run` | ✅ نجح | 409 اختبار / 69 ملف — كلها خضراء (87 ثانية) |
| `vite build` | ✅ نجح | 10.2 ثانية |
| `security-scan.mjs` | ✅ نجح | لا مشاكل حرجة |
| `guardian.mjs validate` | ✅ نجح | الترجمات سليمة |
| `i18n-sync.mjs` | ✅ نجح | 11 لغة بتغطية 100% (3100 مفتاح) |
| **`vitest run --coverage`** | ❌ **فشل** | **أقل من العتبات المحددة** |
| **`npm audit`** | ❌ **فشل** | **10 ثغرات (1 حرجة، 6 عالية)** |

### التقييم العام

| المحور | التقييم |
|---|---|
| جودة الكود وسلامة الأنواع | 9.5 / 10 |
| البنية المعمارية | 9 / 10 |
| التوطين (i18n) | 10 / 10 |
| الأمان | **5 / 10** ⚠️ |
| جاهزية البناء والنشر | **3 / 10** ⚠️ |
| الاختبارات | 7 / 10 |
| إمكانية الوصول (a11y) | 6 / 10 |

> **الخلاصة:** التطبيق **ليس جاهزاً للنشر الآن**. توجد 5 مشكلات حرجة تمنع الإصدار — أهمها أن مشروع الأندرويد **لا يمكن بناؤه إطلاقاً** (ملفات Gradle مفقودة)، وأن **قفل التطبيق يفسد البيانات المشفرة** عند إعادة الفتح.

---

## 2. المشكلات الحرجة (توقف الإصدار)

### 🔴 C-1 — مشروع الأندرويد غير قابل للبناء: ملفات Gradle مفقودة بالكامل

**الخطورة:** حرجة — لا يمكن إنتاج APK/AAB إطلاقاً.

مجلد `android/` يحتوي على `AndroidManifest.xml` و `MainActivity.java` والموارد و `gradlew`، لكن **جميع ملفات بناء Gradle مفقودة**:

```
android/build.gradle          ← مفقود
android/app/build.gradle      ← مفقود
android/settings.gradle       ← مفقود
android/variables.gradle      ← مفقود
```

أي أمر `./gradlew assembleRelease` سيفشل فوراً. هذا يعني أيضاً عدم وجود `applicationId` أو `versionCode` أو `versionName` أو إعدادات التوقيع أو `minSdkVersion` — أي أن الوثيقة التي تصف التطبيق كتطبيق أندرويد جاهز **غير دقيقة**.

**سبب المشكلة:** الملفات غير مُتجاهَلة في `android/.gitignore` (تجاهله يشمل `build/` و `.gradle/` فقط، لا `build.gradle`) — أي أنها **حُذفت أو لم تُضَف للمستودع أبداً**.

**الحل:**
```bash
# إعادة توليد المنصة الأصلية من Capacitor
npx cap add android      # إن لم يكن المجلد موجوداً
# أو الأفضل، للحفاظ على التخصيصات الحالية:
npx cap sync android
```
ثم إضافة الملفات المولَّدة للمستودع، مع ضبط التوقيع في `android/app/build.gradle`:
```gradle
android {
    namespace "com.masarifi.app"
    compileSdk 35
    defaultConfig {
        applicationId "com.masarifi.app"
        minSdkVersion 23          // مطلوب لـ AES-GCM + Biometric
        targetSdkVersion 35
        versionCode 230006
        versionName "23.0.6"
    }
    signingConfigs {
        release {
            storeFile file(System.getenv("MASARIFI_KEYSTORE") ?: "release.keystore")
            storePassword System.getenv("MASARIFI_STORE_PASS")
            keyAlias System.getenv("MASARIFI_KEY_ALIAS")
            keyPassword System.getenv("MASARIFI_KEY_PASS")
        }
    }
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```
⚠️ لا تضع كلمات مرور التوقيع في الملف — استخدم متغيرات البيئة كما بالأعلى.

---

### 🔴 C-2 — القفل التلقائي يجعل كل البيانات المالية غير قابلة للقراءة بعد إعادة الفتح

**الخطورة:** حرجة — فقدان وظيفي كامل للبيانات أمام المستخدم.

**التسلسل:**
1. `src/core/security.ts` عند القفل التلقائي أو انتقال التطبيق للخلفية ينفّذ:
   ```ts
   setLocked(true);
   clearEncryptionKey();   // ← مفتاح AES-GCM يُمسح من الذاكرة
   ```
2. المستخدم يعيد إدخال الـ PIN في `src/features/auth/components/PinScreen.tsx`:
   ```ts
   const hashed = await hashPin(newPin, pinSalt);
   if (hashed === pinHash) {
     setAttempts(0);
     setLocked(false);    // ← فتح القفل فقط... لا إعادة اشتقاق للمفتاح!
   }
   ```

`PinScreen.tsx` **لا يستدعي `setEncryptionKey` أو `deriveMasterKey` إطلاقاً**. تحققتُ من ذلك عبر بحث شامل: الاستدعاء الوحيد لـ `setEncryptionKey` في كامل `src/` موجود في `src/core/onboarding.ts` (المسار البيومتري فقط).

**النتيجة:** بعد أي قفل تلقائي وفتح بالـ PIN، كل قراءة من الجداول المشفَّرة تفشل. و `_decryptRecord` **يبتلع الخطأ ويُرجع السجل الخام**:
```ts
} catch (e: unknown) {
  recordException('[DB] Decryption failed for record', ...);
  return obj;   // ← يرجع السجل بدون حقول amount/description/balance
}
```
أي أن المستخدم سيرى **مبالغ فارغة/`undefined` وأرصدة مفقودة** بدلاً من رسالة خطأ واضحة. والأخطر: إذا عدّل ثم حفظ سجلاً في هذه الحالة، فإن `_encryptRecord` يخرج مبكراً (`if (!isEncryptionKeyReady()) return obj;`) فيُكتب السجل **بنص صريح** — أي **تسريب بيانات + فساد دائم**.

**أثبتُّ السلوك باختبار فعلي:**
```ts
const key = await deriveMasterKey('1234', 'salt123');
setEncryptionKey(key);
const blob = await encryptData({ amount: 500 });
expect(await decryptData(blob)).toEqual({ amount: 500 });   // ✓

clearEncryptionKey();                                        // محاكاة القفل
await expect(decryptData(blob)).rejects.toThrow('Encryption key not loaded');  // ✓ يفشل
```
الاختبار نجح — ما يؤكد أن فتح القفل بدون إعادة اشتقاق المفتاح يترك البيانات غير قابلة للقراءة.

**الحل** في `PinScreen.tsx`:
```ts
const hashed = await hashPin(newPin, pinSalt);
if (hashed === pinHash) {
  // إعادة اشتقاق مفتاح AES-GCM قبل فتح القفل
  const { deriveMasterKey, setEncryptionKey } = await import('@core/security/crypto');
  setEncryptionKey(await deriveMasterKey(newPin, pinSalt));
  setAttempts(0);
  setLocked(false);
}
```
**وإصلاح مُكمّل ضروري** في `encryption.ts` — امنع الكتابة بنص صريح بدلاً من السقوط الصامت:
```ts
export async function _encryptRecord(table, obj) {
  const fields = ENCRYPTED_FIELDS[table];
  if (!fields?.length) return obj;
  if (!isEncryptionKeyReady()) {
    throw new Error(`[DB] Refusing to write plaintext to "${table}" — key not loaded`);
  }
  ...
}
```

---

### 🔴 C-3 — تجاوز كامل لشاشة القفل عند غياب الـ PIN المخزَّن

**الخطورة:** حرجة — تجاوز مصادقة.

في `PinScreen.tsx` (السطور 87-94):
```ts
if (!pinSalt || !pinHash) {
  if (legacyPin && newPin === legacyPin) {
    setAttempts(0); setLocked(false); return;
  }
  setLocked(false);   // ← يفتح القفل لأي رقم سري مُدخَل!
  return;
}
```
إذا كان `pinHash` أو `pinSalt` مفقوداً أو تالفاً (فشل ترحيل، مسح جزئي للبيانات، أو تلاعب مباشر بـ IndexedDB عبر أدوات المطور)، فإن **أي 4 أرقام عشوائية تفتح التطبيق**. المهاجم الذي يملك وصولاً فيزيائياً للجهاز يمكنه حذف مفتاح `pinHash` من IndexedDB ثم الدخول بأي رقم.

**الحل:** الفشل يجب أن يكون آمناً (fail-closed):
```ts
if (!pinSalt || !pinHash) {
  if (legacyPin && newPin === legacyPin) {
    // ترحيل فوري للتجزئة الآمنة ثم الفتح
    const salt = generateSalt();
    await DB.setSetting('pinSalt', salt);
    await DB.setSetting('pinHash', await hashPin(newPin, salt));
    await DB.setSetting('pin', null);
    setLocked(false);
    return;
  }
  setError(true);
  setPin('');
  toast(t('settings.pinError'), 'error');
  return;   // ← ابقَ مقفلاً
}
```

**ملاحظة مرتبطة:** المقارنة `hashed === pinHash` غير ثابتة الزمن (timing-unsafe). الخطر عملياً منخفض هنا (محلي + PBKDF2 بـ 600k تكرار يهيمن على الزمن)، لكن الأفضل استخدام مقارنة ثابتة الزمن.

---

### 🔴 C-4 — إعداد Vite خاطئ: `console.log` و `debugger` **لا** تُحذف من بناء الإنتاج

**الخطورة:** حرجة — تسريب بيانات مالية في سجلات الإنتاج.

في `vite.config.ts`، كتلة `esbuild` موضوعة **داخل** `build` بدلاً من جذر الإعداد:
```ts
build: {
  outDir: 'dist',
  esbuild: {                      // ❌ Vite يتجاهل هذا الموقع تماماً
    drop: ['debugger'],
    pure: ['console.log', ...],
  },
}
```
`build.esbuild` **ليس خياراً معترفاً به في Vite** — الخيار الصحيح هو `esbuild` في الجذر. التعليق في الملف يقول «Strip ALL dev-only code in production» لكن ذلك **لا يحدث**.

**أثبتُّ الخطأ عملياً:** أضفتُ ملف اختبار يحوي `console.log("PROBE_MARKER_SHOULD_BE_DROPPED")` و `debugger;`، ثم بنيتُ:

| الحالة | `PROBE_MARKER` في dist | `debugger` في dist |
|---|---|---|
| الإعداد الحالي | **1 (موجود!)** ❌ | **2** ❌ |
| بعد نقل `esbuild` للجذر | **0** ✅ | **0** ✅ |

**الحل** — انقل الكتلة خارج `build`:
```ts
export default defineConfig({
  plugins: [...],
  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.warn', 'console.debug', 'console.info'],
  },
  build: { outDir: 'dist', /* ... */ },
});
```
⚠️ **احذف `console.error` من قائمة `pure`** — فهي تُستخدم في `ErrorBoundary` والمسارات الحرجة، وإزالتها تُعمي التشخيص. `logger.ts` يحرس الطباعة بـ `import.meta.env.DEV` أصلاً، لذا لا حاجة لإسكاتها قسراً.

> ملاحظة إيجابية: `logger.ts` مصمم جيداً ويحجب الطباعة في الإنتاج. المشكلة تخص أي `console` مباشرة (مثل تلك في `public/sw.js` التي لا تمر عبر Vite أصلاً، وفي تبعيات الطرف الثالث).

---

### 🔴 C-5 — لا يوجد ملف `.gitignore` في جذر المشروع

**الخطورة:** حرجة — خطر تسريب أسرار ومفاتيح توقيع.

الجذر **لا يحتوي على `.gitignore` إطلاقاً**. تحققتُ: `git check-ignore node_modules dist` يعيد "NOT IGNORED". خلال هذا الفحص ظهر `node_modules/` و `dist/` و `coverage/` كملفات غير متعقَّبة جاهزة للإضافة العرضية.

الخطر الأكبر: **لا شيء يمنع `git add .` من رفع `.env` يحوي `VITE_MASTER_HASH`/`VITE_MASTER_SALT`، أو ملف `release.keystore`** — وهو ما يعني فقدان السيطرة على هوية التطبيق على متجر Play نهائياً.

**الحل** — أنشئ `.gitignore` في الجذر:
```gitignore
node_modules/
dist/
coverage/
.env
.env.*
!.env.example
*.keystore
*.jks
*.log
.DS_Store
.vscode/
.idea/
android/local.properties
android/app/src/main/assets/public/
```

---

## 3. مشكلات عالية الخطورة

### 🟠 H-1 — ثغرات أمنية في التبعيات (1 حرجة، 6 عالية)

`npm audit --omit=dev` يُظهر **10 ثغرات**:

| الحزمة | الخطورة | الوصف |
|---|---|---|
| `tar` | **حرجة** | تهريب ملفات، انهيار العملية، DoS بالاستدعاء الذاتي |
| `vite` ≤6.4.2 | عالية | تجاوز `server.fs.deny`، كشف NTLMv2 عبر UNC |
| `react-router` / `react-router-dom` 7.15.0 | عالية | DoS عبر مطابقة مسارات غير كفؤة، تجاوز CSRF |

**الحل:**
```bash
npm audit fix          # يعالج الأغلبية دون كسر
npm audit fix --force  # للمتبقي — يتطلب اختبار انحدار كامل بعده
```
ثم أضف `npm audit --omit=dev --audit-level=high` إلى `ci:check`.

**ملاحظة معمارية مهمة:** `vite` مُدرَجة في `dependencies` وليست `devDependencies` — خطأ تصنيف يضخّم شجرة تبعيات الإنتاج ويجعل ثغرات أدوات البناء تُحسب على الإنتاج. انقلها إلى `devDependencies`.

---

### 🟠 H-2 — بيانات مالية حساسة مخزَّنة **بنص صريح** خارج نطاق التشفير

`ENCRYPTED_FIELDS` في `src/core/db/encryption.ts` يغطي 10 جداول، لكن **ثلاثة جداول حساسة مستثناة تماماً**:

**أ) `auditLog` — الأخطر.** يُسجَّل 63 استدعاءً لـ `recordAction` عبر طبقة قاعدة البيانات، وكثير منها يمرّر البيانات المالية الكاملة صراحةً:
```ts
db.recordAction('add_transaction', `Added: ${item.description || item.amount}`, {
  amount: item.amount,        // ← نص صريح
  description: item.description,
  category: item.category,
  currency: item.currency,
});
```
النتيجة: **سجل المراجعة يحتوي نسخة كاملة غير مشفَّرة من كل معاملة مالية** — ما يُبطل عملياً الغرض من تشفير جدول `transactions` نفسه.

**ب) `chatHistory`** — الوثيقة تصفه بـ «سجل المحادثات **المشفّرة**»، لكنه **غير مُدرج في `ENCRYPTED_FIELDS`**. محادثات المستشار المالي تحوي تفاصيل دخل ومصاريف وتُخزَّن بنص صريح. **الوثيقة غير مطابقة للتنفيذ.**

**ج) `settings`** — يحوي `goldApiKey` و `exchangeRateApiKey` و `fredApiKey` و `currentsApiKey` بنص صريح عبر `DB.getSetting`. (على النقيض، `geminiApiKey` و `groqApiKey` تُخزَّن بشكل صحيح عبر `secureStore` — عدم اتساق واضح.)

**الحل:**
```ts
export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  // ... الحالي ...
  chatHistory: ['content', 'text', 'message'],
  auditLog:    ['description', 'details'],
};
```
وللمفاتيح: انقل كل `*ApiKey` من `DB.setSetting` إلى `secureSet`/`secureGet` اتساقاً مع Gemini/Groq. وقلّل ما يُسجَّل في `auditLog` أصلاً — سجّل المعرّف والحدث فقط، لا المبلغ والوصف.

---

### 🟠 H-3 — غياب الذرّية (atomicity): خطر فساد الأرصدة

عمليات المعاملات تقرأ ثم تكتب الأرصدة **خارج أي transaction لقاعدة البيانات**. في `TransactionRepository.add`:
```ts
await db.transactions.put(item);              // كتابة 1
const acc = await db.accounts.get(targetAccId);
acc.balance = ... ;
await db.accounts.put(acc);                   // كتابة 2 — منفصلة تماماً
```
في كامل `src/` يوجد **استدعاء واحد فقط** لـ `db.transaction(...)` (في `useCategories.ts`). دالة `update` أعقد بكثير (تغيير الحساب/النوع/المبلغ) وتنفّذ حتى 4 كتابات متتابعة غير ذرّية.

**سيناريوهات الفساد:** إغلاق التطبيق أو قتله بواسطة نظام Android بين الكتابتين، أو ضغطتان سريعتان على «حفظ» (lost update لأن الرصيد يُقرأ قبل الكتابة الأخرى).

> وجود دالة «إصلاح فساد الأرصدة» في الكود (`Balance corruption detected and repaired`, ظهرت في سجلات الاختبار) يؤكد أن الفريق **واجه هذه المشكلة فعلياً** وعالج العرَض لا السبب.

**الحل** — غلّف كل تعديل مركّب داخل معاملة Dexie:
```ts
async add(t: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const item: Transaction = { ...t, id: this.generateId(), createdAt: new Date().toISOString() };
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    await db.transactions.put(item);
    if (item.isDraft !== true) {
      const accId = item.accountId || item.account;
      if (accId) {
        const acc = await db.accounts.get(accId);
        if (acc) {
          acc.balance += item.type === 'income' ? Number(item.amount) : -Number(item.amount);
          await db.accounts.put(acc);
        }
      }
    }
  });
  return item;
}
```
طبّق النمط نفسه على `update` و `delete` و `goalService` و `debtService` و `billService` و `recurringService`.

---

### 🟠 H-4 — عتبات التغطية غير محققة والـ CI لا يكتشف ذلك

`vitest.config.ts` يفرض عتبات، لكن التشغيل الفعلي يفشل:

| المقياس | المحقق | العتبة | الفجوة |
|---|---|---|---|
| Lines | 69.40% | 75.0% | −5.6 |
| Functions | 70.99% | 73.0% | −2.0 |
| Branches | **48.27%** | 55.0% | **−6.7** |

`npx vitest run --coverage` يعيد **exit code 1**. المشكلة الأخطر: **لا `ci:check` ولا `check:all` يستدعيان `test:coverage`** — كلاهما يستخدم `vitest run` المجرد، لذا **يمر الـ CI بنجاح كاذب** بينما بوابة الجودة مكسورة.

تغطية الفروع 48% منخفضة بشكل خاص في تطبيق مالي، حيث المنطق الشرطي (نوع المعاملة، الحسابات، المسودات) هو بالضبط ما يجب اختباره.

**الحل:** أضف التغطية إلى بوابة الـ CI:
```json
"ci:check": "npm run test:coverage && npm run test:security && npm run lint && npm run build"
```
ثم إما ارفع التغطية (الأفضل — ركّز على `repositories/` و `services/`) أو اخفض العتبات مؤقتاً لقيم واقعية مع خطة رفع تدريجي.

---

### 🟠 H-5 — `allowBackup` و `usesCleartextTraffic` في بيان الأندرويد

في `AndroidManifest.xml`:
```xml
android:usesCleartextTraffic="true"
tools:replace="android:usesCleartextTraffic"
```
صحيح أن `network_security_config.xml` يقيّد النص الصريح بـ localhost فقط (إعداد جيد)، لكن ترك `usesCleartextTraffic="true"` في البيان **يخالف إشارات مراجعة متجر Play** وقد يُرفض. القيمة مخصصة للتطوير ويجب ألا تصل للإنتاج.

**الحل:** اجعلها خاصة بنكهة debug فقط عبر `src/debug/AndroidManifest.xml`، واحذفها من البيان الرئيسي. أبقِ `network_security_config` كما هو (ممتاز)، واحذف نطاقات localhost منه لبناء الإصدار.

✅ **إيجابي:** `allowBackup="false"` مضبوط بشكل صحيح — يمنع استخراج قاعدة البيانات عبر `adb backup`. قرار ممتاز.

---

## 4. مشكلات متوسطة الخطورة

### 🟡 M-1 — منطق مهلة الشبكة معطّل في `marketData.ts`
```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);
const combinedSignal = signal || controller.signal;   // ← الخطأ
```
عندما يمرّر المستدعي `signal` خاصاً به، تُستخدم إشارته و**يُتجاهل `controller` تماماً** — فمهلة الـ 10 ثوانٍ لا تُطبَّق أبداً، والـ `setTimeout` يستدعي `abort()` على متحكم لا أحد يستمع إليه. النتيجة: طلبات قد تتعلق للأبد.

**الحل:** استخدم `AbortSignal.any` (مدعوم في WebView الحديثة):
```ts
const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
```
أو ببساطة `AbortSignal.timeout(10000)` مدموجة مع إشارة المستدعي.

### 🟡 M-2 — اختصارات PWA لا تعمل (تعارض مع HashRouter)
`AppRoot.tsx` يستخدم `HashRouter`، لكن `public/manifest.json` يعرّف اختصارات بمسارات query:
```json
"url": "/?page=add&type=expense"
```
لا يوجد أي كود يقرأ `?page=` (تحققتُ: لا وجود لـ `searchParams` في `AppRoot.tsx`/`main.tsx`). الاختصارات الثلاثة كلها **تفتح الصفحة الرئيسية فقط**.

**الحل:** حوّلها لمسارات hash مطابقة للراوتر:
```json
"url": "/#/add?type=expense"
"url": "/#/reports"
```

### 🟡 M-3 — «الباب الخلفي السيادي» يُفعَّل بـ 7 نقرات
`Settings.tsx` يفتح نافذة كلمة مرور رئيسية بعد 7 نقرات على رقم الإصدار، وعند النجاح يمنح 99,999 نقطة ويفتح كل المزايا المدفوعة. التنفيذ الأمني **سليم** (PBKDF2 600k، ويُعطَّل تلقائياً إن لم تُضبط `VITE_MASTER_HASH`).

المخاطر المتبقية: (1) التجزئة مضمَّنة في حزمة الواجهة — قابلة للاستخراج والهجوم دون اتصال؛ (2) إن بُني إصدار عام بالمتغيرات مضبوطة عن طريق الخطأ، تُفتح كل المزايا المدفوعة مجاناً.

**الحل:** احرس الميزة بالكامل بـ `if (import.meta.env.DEV)` حتى لا تصل شيفرتها لحزمة الإنتاج أصلاً، وأضف فحصاً في `security-scan.mjs` يفشل البناء إن وُجدت `VITE_MASTER_HASH` في بناء إنتاج.

### 🟡 M-4 — فحوصات النزاهة قابلة للتجاوز وتعطي أماناً وهمياً
في `security.ts`، كشف الروت يعتمد على `navigator.userAgent`:
```ts
if (ua.includes('test-keys') || ua.includes('superus') || ...)
```
هذا **بلا قيمة أمنية** — سلسلة الـ UA تُزوَّر بسطر واحد، وأي جهاز مروَّت فعلياً لن يعلن ذلك. كذلك فحص «الهوكينغ» عبر `fn.toString()` يُتجاوز بسهولة. الخطر الحقيقي: منح الفريق **إحساساً زائفاً بالأمان**.

**الحل:** إما إزالتها (وعدم الادعاء بوجودها في الوثيقة)، أو استبدالها بفحوصات أصلية حقيقية (Play Integrity API على أندرويد). الاعتماد الأساسي يجب أن يبقى على التشفير الذي هو بالفعل قوي.

### 🟡 M-5 — ميزة «منع لقطات الشاشة» موثَّقة لكنها **غير موجودة**
الوثيقة تنص: «يحتوي التطبيق على ميزات حجب لقطات الشاشة أو تسجيل الفيديو داخل الواجهات المالية الحساسة». بحثٌ شامل عن `FLAG_SECURE` في `android/` و `src/` أرجع **صفر نتائج** (عدا ذكر عابر في `.gitignore`).

الموجود فعلياً هو تمويه CSS عند الخلفية (`app-switcher-blur`) — وهو **لا يمنع لقطة الشاشة إطلاقاً**، فقط يموّه معاينة مبدّل المهام.

**الحل:** نفّذ الميزة فعلياً في `MainActivity.java`:
```java
@Override
public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE,
                         WindowManager.LayoutParams.FLAG_SECURE);
}
```
أو صحّح الوثيقة. الأسوأ هو الوعد الأمني غير المنفَّذ.

### 🟡 M-6 — استمرارية جلسة Google OAuth عبر `window.location.hash`
`processOAuthResponse` في `auth.ts` يمرّر رمز الوصول عبر hash ثم يمسحه، لكن:
- الرمز يُخزَّن عبر `secureSet` (جيد ✅)
- **لا يوجد تحقق من `state`** — أي لا حماية من CSRF في تدفق OAuth
- التنقل عبر `setTimeout(..., 800)` ثم `window.location.hash` هش ويتسابق مع تهيئة الراوتر

**الحل:** أضف معامل `state` عشوائياً وتحقق منه عند العودة، واستبدل `setTimeout` بتنقّل عبر الراوتر.

---

## 5. ملاحظات منخفضة الخطورة وتحسينات الجودة

| # | الملاحظة | التوصية |
|---|---|---|
| L-1 | **ملفات ضخمة**: 15 ملفاً >600 سطر (`AddTransactionPage.tsx` = 1315، `AdvancedAnalytics.tsx` = 1223) | قسّمها لمكونات فرعية + hooks؛ تُعيق المراجعة والاختبار |
| L-2 | **ازدواج مكونات**: `components/ImageCropper.tsx` و `components/modals/ImageCropper.tsx`؛ `core/calculator.ts` و `core/ai/calculator.ts`؛ `components/Calculator.tsx` و `ui/ProfessionalCalculator.tsx` | وحّد وأزل المكرر |
| L-3 | **ازدواج إعدادات الاختبار**: `jest` + `babel-jest` + `jest-environment-jsdom` في التبعيات رغم أن المشروع يستخدم Vitest؛ و`tests/setup.js` + `setup.ts` معاً | احذف Jest بالكامل — يوفّر عشرات الميغابايت ويزيل ثغرات |
| L-4 | **حجم الحزمة**: `vendor-pdf` = 593KB، `app-i18n` = 458KB | `app-i18n` يُحمَّل دوماً رغم أن المستخدم يحتاج لغة واحدة — اجعل العربية فقط في الحزمة الأساسية وحمّل الباقي كسولاً |
| L-5 | **ازدواج CSP**: معرّفة في `index.html` و `vite.config.ts` معاً وقد تتباعدان؛ وتحوي `'unsafe-inline'` و `'unsafe-eval'` | وحّد المصدر؛ احذف `unsafe-eval` من الإنتاج (مطلوبة لـ Tesseract فقط) |
| L-6 | **`skipLibCheck: true`** في `tsconfig.json` | يخفي تعارضات أنواع التبعيات؛ فكّر بتعطيلها |
| L-7 | **34 `eslint-disable`** في الكود المصدري | راجعها — معظمها `react-hooks/exhaustive-deps` وقد تخفي أخطاء تبعيات حقيقية |
| L-8 | **`GEMINI.md` = 232KB** متعقَّب في Git | ملف ضخم جداً لمستودع كود؛ انقله لويكي أو قسّمه |
| L-9 | **إمكانية الوصول (a11y)** | `PinScreen` جيد (`role="dialog"`, `aria-modal`)، لكن راجع تباين الألوان في الوضع الزجاجي، وأضف `aria-live` للأرصدة المتغيرة، ودعم `prefers-reduced-motion` للرسوم المتحركة الكثيفة |
| L-10 | **`checkDeviceIntegrity`** يعرض تنبيهات بالعربية والإنجليزية مدمجة نصياً بدل `t()` | استخدم نظام الترجمة |

---

## 6. نقاط القوة (تستحق الحفاظ عليها)

هذه ممارسات ممتازة يجب عدم التراجع عنها:

1. **صفر `any` وصفر `@ts-ignore`** في 68 ألف سطر — انضباط استثنائي.
2. **التشفير مبني بشكل صحيح**: AES-GCM 256، PBKDF2 بـ 600,000 تكرار (يفوق توصية OWASP)، IV عشوائي 12 بايت لكل عملية، والمفاتيح `extractable: false`.
3. **معمارية طبقة البيانات**: فصل نظيف بين `repositories/` و `services/` و `schema.ts`، وmiddleware تشفير شفاف على مستوى DBCore — تصميم أنيق.
4. **الحماية من XSS محكمة**: لا وجود لـ `dangerouslySetInnerHTML` إطلاقاً، و`innerHTML` الوحيد يمر عبر DOMPurify بقائمة بيضاء صارمة، مع hook إضافي يزيل كل سمة تبدأ بـ `on`.
5. **التوطين**: 11 لغة بتغطية 100% مؤتمتة عبر `guardian.mjs` — نموذجي.
6. **`allowBackup="false"`** و `network_security_config.xml` — قرارات أمنية صائبة.
7. **مسح المفتاح من الذاكرة عند الخلفية/القفل** — النية الأمنية صحيحة تماماً (التنفيذ فقط ناقص الشق المقابل، راجع C-2).
8. **409 اختباراً تمر بالكامل** مع اختبارات تكامل لدورة حياة الديون والأهداف والمعاملات.
9. **Service Worker** باستراتيجيات متمايزة (Cache-First للأصول المُجزّأة، SWR للصور، Network-First للتنقل) مع تقليم الكاش — تنفيذ محترف.

---

## 7. خطة العمل المقترحة

### المرحلة 1 — حاصرات الإصدار (قبل أي نشر)
1. **C-1** استعادة ملفات Gradle وضبط التوقيع → بدونها لا يوجد تطبيق أصلاً
2. **C-2** إعادة اشتقاق مفتاح التشفير في `PinScreen` + منع الكتابة بنص صريح
3. **C-3** جعل شاشة القفل fail-closed
4. **C-5** إضافة `.gitignore` (دقيقتان، يمنع كارثة تسريب)
5. **C-4** نقل `esbuild` لجذر إعداد Vite

### المرحلة 2 — تصليب أمني (خلال أسبوعين)
6. **H-1** `npm audit fix` + نقل `vite` لـ devDependencies
7. **H-2** تشفير `chatHistory` و `auditLog`، ونقل مفاتيح API لـ `secureStore`
8. **H-3** تغليف عمليات الأرصدة في معاملات Dexie ذرّية
9. **H-5** إزالة `usesCleartextTraffic` من بناء الإصدار
10. **M-5** تنفيذ `FLAG_SECURE` أو تصحيح الوثيقة

### المرحلة 3 — جودة واستدامة (شهر)
11. **H-4** إضافة التغطية لبوابة الـ CI ورفع تغطية الفروع لـ 60%+
12. **M-1, M-2, M-6** إصلاح المهلة والاختصارات وتحصين OAuth
13. **L-1, L-2, L-3** تقسيم الملفات الضخمة، إزالة الازدواج، حذف Jest
14. **L-4** تحسين تحميل i18n الكسول
15. مواءمة `PROJECT_DOCUMENTATION.md` مع الواقع (عدة ادعاءات غير دقيقة حالياً)

---

## 8. ملاحظة ختامية حول دقة الوثائق

خلال الفحص وجدتُ عدة فجوات بين `PROJECT_DOCUMENTATION.md` والتنفيذ الفعلي:

| الادعاء في الوثيقة | الواقع |
|---|---|
| «سجل المحادثات **المشفّرة**» | `chatHistory` غير مشفَّر |
| «ميزات حجب لقطات الشاشة» | `FLAG_SECURE` غير موجود إطلاقاً |
| «Strip ALL dev-only code in production» | الإعداد غير فعّال (أُثبت عملياً) |
| تطبيق أندرويد جاهز | المشروع غير قابل للبناء (Gradle مفقود) |
| «TypeScript 5.8» | الفعلي `^6.0.3` |

الوثائق في المشاريع المالية جزء من سطح الثقة — أوصي بمراجعتها ضمن المرحلة 3، فالادعاءات الأمنية غير المنفَّذة (خصوصاً تشفير المحادثات ومنع اللقطات) قد تُبنى عليها قرارات مستخدمين حقيقية.

---

*أُعدّ هذا التقرير بفحص الكود يدوياً وتشغيل جميع فحوصات الجودة فعلياً (tsc، ESLint، Vitest، التغطية، البناء، npm audit، سكربتات الأمان والترجمة)، مع إثبات المشكلات C-2 و C-4 بتجارب عملية قابلة لإعادة الإنتاج. لم تُعدَّل أي ملفات في المستودع.*


---

## 12. حالة المعالجة (تحديث)

| # | المشكلة | الحالة | الالتزام |
|---|---|---|---|
| C-1 | ملفات Gradle مفقودة | ✅ **مُغلقة** — استعادة + بناء وتوقيع مُثبَت | `ee272e9` |
| C-2 | مفتاح التشفير لا يُستعاد عند فتح القفل | ✅ عولجت | `d9a08c8` |
| C-3 | تجاوز شاشة القفل | ✅ عولجت | `d9a08c8` |
| C-4 | `console`/`debugger` في الإنتاج | ✅ عولجت (مُثبتة) | `8499115` |
| C-5 | لا يوجد `.gitignore` | ✅ عولجت | `f285e10` |
| H-1 | 10 ثغرات تبعيات | ✅ عولجت (0 متبقية) | `6f08582` |
| H-2 | `auditLog`/`chatHistory` بنص صريح | ✅ عولجت | `d9a08c8` |
| H-3 | غياب الذرّية في الأرصدة | ✅ عولجت | `99bae73` |
| H-4 | بوابة التغطية معطّلة | ✅ عولجت | `4984668` |
| H-5 | `usesCleartextTraffic` | ✅ عولجت | `ecab2c2` |
| M-1 | مهلة الشبكة معطّلة | ✅ عولجت | `3d6191b` |
| M-2 | اختصارات PWA | ✅ عولجت | `013a143` |
| M-5 | `FLAG_SECURE` غير منفَّذة | ✅ نُفِّذت | `ecab2c2` |
| M-3, M-4, M-6, L-* | الباب الخلفي، فحوصات النزاهة، OAuth، جودة | ⏳ متبقية | — |

### نتائج التحقق بعد التعديلات

| الفحص | قبل | بعد |
|---|---|---|
| `tsc --noEmit` | ✅ | ✅ |
| `eslint .` | ✅ | ✅ |
| الاختبارات | 409 ✅ | **413 ✅** (+4 اختبارات انحدار) |
| `test:coverage` (البوابة) | ❌ exit 1 | ✅ exit 0 |
| `npm audit --omit=dev` | ❌ 10 ثغرات | ✅ **0** |
| `vite build` | ✅ | ✅ |
| `debugger` في dist | 2 | **0** |
| `security-scan` / `guardian` | ✅ | ✅ |

### ملاحظة حول C-1 — مُغلقة ✅

استُعيدت ملفات مشروع Gradle في `ee272e9` (AGP 8.13.0، wrapper 8.14.3، Java 21،
minSdk 24، target 36، توقيع عبر متغيرات بيئة لا أسرار في المستودع).

تعذّر إثبات البناء داخل بيئة المراجعة لعدم وجود `java` فيها، وقد ذُكر ذلك صراحةً
حينها بدل ادّعاء النجاح. وقد أكّد المالك لاحقاً تنفيذ البناء الرسمي بنجاح:

- البيئة: **Java 21 (Adoptium Hotspot)**
- المخرَج: **`Masarifi_V23.0.9_Signed_Release.apk`** — 15.85 MB، موقَّعة، ببصمة تشفير مطابقة وموثّقة

بذلك يكتمل معيار القبول الوحيد الذي كان معلّقاً، وتُغلق **C-1** نهائياً.
