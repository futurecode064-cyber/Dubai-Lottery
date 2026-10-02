# Dubai Lottery — development source, version 0.2

ဤ repository တွင် Android app source နှင့် server source ပါဝင်သည်။ Android project၊ စမ်းသပ် server၊ ဖုန်းမျက်နှာပြင်နှင့် tests ပါဝင်သော source package ဖြစ်သည်။ Production service မဟုတ်သေးပါ။ လက်ရှိ token များကို အမှန်တကယ်ငွေသွင်း/ငွေထုတ်လုပ်ရန် မသုံးပါနှင့်။

## သတ်မှတ်ထားသောစနစ်

| အချက် | တန်ဖိုး |
|---|---|
| App အမည် | Dubai Lottery |
| ရည်ရွယ်သောအသုံးပြုရာ | မြန်မာနိုင်ငံ |
| ရည်ရွယ်သောငွေလဲနှုန်း | ၁ token = ၁ ကျပ် |
| 2D | 00–99 / ဆ 80 |
| 3D | 000–999 / ဆ 650 |
| 4D | 0000–9999 / ဆ 6000 |
| နေ့စဉ်ပိတ်ချိန် | ညနေ 6:00၊ Asia/Yangon |
| ပွဲစဉ် | တစ်ရက်၊ တစ်မျိုးလျှင် တစ်ကြိမ် |
| ရလဒ် | Admin က သီးခြားတစ်မျိုးစီ ရိုက်ထည့်ပြီး ထုတ်ပြန်သည် |
| ပေါက်ကြေး | ထိုးထားသော token × multiplier၊ မူလ token ကို ထပ်မပေါင်းပါ |

ဥပမာ 2D ဂဏန်း 07 ကို 10 token ထိုးလျှင် လက်ကျန် 10 token လျော့သည်။ ပေါက်လျှင် 800 token ထည့်ပေးသည်။ လက်ကျန် 1,000 ဖြင့် စတင်လျှင် ထိုးပြီး 990၊ ပေါက်ပြီး 1,790 ဖြစ်သည်။

3D ဂဏန်း 007 နှင့် 4D ဂဏန်း 0007 တို့သည် သီးခြားပွဲစဉ်များ ဖြစ်သည်။ 2D/3D/4D ရလဒ်များကို တစ်ခုကနေ တစ်ခု အလိုအလျောက်ဆင်းသက်တွက်ချက်ခြင်း မလုပ်ထားပါ။ ရလဒ်များ လွတ်လပ်စွာ သတ်မှတ်ထားသည်။

## ပါဝင်သောအလုပ်လုပ်မှု

- Admin ဖန်တီးပေးသော Player အကောင့်များ၊ password hashing၊ သက်တမ်း 12 နာရီရှိ session။
- 2D/3D/4D ဂဏန်းများကို အစသုညအပါအဝင် ရွေးနိုင်ခြင်း။ ဂဏန်း 100 စီပြပြီး 4D ဂဏန်း 10,000 ကို ရှာနိုင်ခြင်း။
- ကံစမ်းမှုနှင့် token နုတ်ခြင်းကို database transaction တစ်ခုတည်းဖြင့် ပြုလုပ်ခြင်း။
- Receipt အမှတ်၊ ရက်စွဲအလိုက် ကံစမ်းမှတ်တမ်း၊ ရလဒ်မှတ်တမ်း၊ token အဝင်/အထွက်စာရင်း။
- Admin token ဖြည့်/နုတ်ခြင်းနှင့် အကြောင်းပြချက်၊ Admin လုပ်ဆောင်မှုမှတ်တမ်း။
- ပိတ်ချိန်မတိုင်မီ ရလဒ်ထုတ်ပြန်၍မရ။ ထုတ်ပြန်ပြီး ရလဒ်ပြန်ပြင်၍မရ။ ပေါက်ကြေးကို transaction တစ်ခုတည်းဖြင့် ထည့်ပေးသည်။
- ကံစမ်းမှု၊ token ဖြည့်/နုတ်မှုနှင့် ပေါက်ကြေးကို ထပ်ပို့မိသော request ကြောင့် နှစ်ခါမလုပ်စေရန် ကာကွယ်ထားသည်။
- Daily token limit လျှော့ချခြင်း၊ မိမိဆန္ဒအလျောက် နားချိန်သတ်မှတ်ခြင်း။
- Android HTTPS WebView shell နှင့် GitHub Actions debug APK build workflow။

## စက်ပေါ်တွင် စမ်းသပ်ရန်

Python 3.10+ လိုသည်။ External Python packages မလိုပါ။ Password များကို command ထဲမရေးဘဲ prompt မှာ ရိုက်ပါ။

```bash
python3 server/app.py --create-admin owner
python3 server/app.py
```

Browser မှ `http://127.0.0.1:8080` ကို ဖွင့်ပါ။ Admin နဲ့ဝင်ပြီး Player account ဖန်တီး၍ စမ်းသပ် token ဖြည့်ပါ။ Player account နဲ့ သီးခြား browser/private window တွင် ဝင်ပါ။ ရလဒ်ထုတ်ပြန်ခြင်းကို ညနေ 6 နာရီနောက်ပိုင်းမှာ စမ်းသပ်နိုင်ပါသည်။ Automated tests တွင် cutoff မတိုင်မီ/နောက်ပိုင်း နှစ်မျိုးစလုံး စမ်းထားသည်။

```bash
python3 -m unittest discover -s tests -v
```

Server ကို localhost တွင်သာ default ဖွင့်ထားသည်။ Built-in HTTP server ကို public internet သို့ တိုက်ရိုက်မဖွင့်ပါနှင့်။ `/health` သည် process health ကိုသာ ပြသည်။ SQLite file ကို ephemeral hosting disk တွင် ထားပါက data ပျောက်နိုင်သည်။ ဤ source တွင် Render/Neon resource မဖန်တီးထားပါ။

## APK ထုတ်ရန်

Android project ကို Android Studio တွင် ဖွင့်ပြီး JDK 17၊ Gradle 8.9၊ Android SDK 35၊ Android Gradle Plugin 8.7.3 ဖြင့် build လုပ်ရန် ပြင်ဆင်ထားသည်။ GitHub Actions တွင် APK compilation နှင့် browser tests ကို run လုပ်ရန် ပြင်ဆင်ထားသည်။ အမှန်တကယ် Android ဖုန်းပေါ် စမ်းသပ်မှုသည် မပြီးသေးပါ။

APK ဖွင့်ချိန်တွင် **Server ပြောင်းရန်** ခလုတ်ကို နှိပ်ပြီး HTTPS server လိပ်စာကို ထည့်နိုင်သည်။ Server လိပ်စာမရှိသေးလျှင် setup စာမျက်နှာသာ ပြမည်။ Server လိပ်စာကို app က မှတ်ထားပြီး ပြန်ဖွင့်ချိန်တွင် သုံးသည်။ Server ပြောင်းလျှင် ယခင် session cookie များကို ဖျက်သည်။

1. စမ်းသပ် server ကို HTTPS ဖြင့် ချိတ်ပါ။ Root URL တွင် HTML နှင့် `/api/*` routes ရှိရမည်။
2. `android/gradle.properties` တွင် `serverUrl=https://YOUR-DEVELOPMENT-HOST/` ရေးပါ။
3. Android Studio ၏ **Build APK(s)** သို့မဟုတ် အောက်ပါ command ကို သုံးပါ။

```bash
cd android
gradle :app:assembleDebug -PserverUrl=https://YOUR-DEVELOPMENT-HOST/
```

ဖိုင်ထွက်မည့်နေရာ: `android/app/build/outputs/apk/debug/app-debug.apk`။

GitHub repository သို့ ဤ package ၏ contents ကို တင်ထားလျှင် **Actions → Build Android preview → Run workflow** မှ HTTPS server URL ထည့်ပြီး build လုပ်နိုင်ရန် workflow ပေးထားသည်။ GitHub Actions အသုံးပြုခွင့်နှင့် quota ကို စစ်ပါ။ Debug APK ကို user များအား production distribution အဖြစ် မဖြန့်ပါနှင့်။ Release အတွက် သီးခြား signing key နှင့် signed release build configuration လိုသည်။

## အမှန်တကယ်ငွေကြေးဖြင့် ဖွင့်လှစ်မီ ကျန်ရှိသောအလုပ်

ဤ source ကို financial production system အဖြစ် အတည်မပြုထားပါ။ အောက်ပါအချက်များကို ပထမဦးစွာ ဆောင်ရွက်ရန် လိုသည်။

- ရည်ရွယ်ထားသော နိုင်ငံနှင့် အသုံးပြုသူများအတွက် လိုအပ်သော ခွင့်ပြုချက်/လိုင်စင်ကို ဒေသခံဥပဒေပညာရှင်နှင့် စစ်ဆေးခြင်း။
- အသက်နှင့် identity verification၊ privacy/retention policy၊ support/dispute policy။ Prototype တွင် identity verification မပါပါ။
- Managed database၊ backup/restore drill၊ monitoring၊ HTTPS reverse proxy၊ distributed rate limiting၊ session revocation/reset၊ Admin MFA၊ security review။
- Password ပြောင်း/ပြန်သတ်မှတ်ခြင်းနှင့် အကောင့်ပိတ်ခြင်း UI။ လက်ရှိ prototype တွင် မပါပါ။
- Cash deposit/withdrawal workflow၊ payment reconciliation၊ refund/cancel rules။ လက်ရှိ admin adjustment သည် payment processing မဟုတ်ပါ။
- Number/draw exposure limits နှင့် payout reserve။ လက်ရှိ prototype တွင် သီးခြားစီးပွားရေး liability cap မပါပါ။
- လွတ်လပ်သောရလဒ်ရင်းမြစ်နှင့် result verification။ Admin က ရလဒ်ထည့်သည့် prototype သည် ကျပန်းရလဒ်ထုတ်သည့် audited lottery မဟုတ်ပါ။
- မှတ်တမ်းအပြည့် pagination/export။ UI သည် နောက်ဆုံး bets/ledger 500၊ draws 90၊ admin audit 200 ကိုသာ ပြသည်။ Database ထဲတွင် အဟောင်းများ ဆက်လက်သိမ်းထားသည်။
- Signed release APK၊ အမှန်တကယ် Android ဖုန်းများတွင် QA၊ app update delivery။

Ledger/audit ၏ append-only triggers သည် app အဆင့်တွင် ပြင်ဆင်/ဖျက်ခြင်းကို ပိတ်သည်။ Database file ကို တိုက်ရိုက်ထိန်းချုပ်သူမှ ပြောင်းလဲနိုင်သဖြင့် external tamper-proof audit လို့ မဆိုလိုပါ။

သုံးစွဲသူ balance cap ကျော်မည့် payout တစ်ခုရှိလျှင် draw settlement တစ်ခုလုံး rollback ဖြစ်သည်။ Admin က error ကို စစ်ဆေးပြီး settlement ကို ပြန်လုပ်ရန် လိုသည်။ လက်ရှိ limit သည် token 1,000,000,000,000 ဖြစ်သည်။

ပွဲစဉ်များကို server ရက်စွဲအရ ဖန်တီးသည်။ ရလဒ်မထည့်ထားသေးသောနေ့တွင် ကံစမ်းမှုများ pending ဖြစ်နေမည်။ Admin က ရလဒ်မထည့်ဘဲ အလိုအလျောက်ပေါက်ကြေးတွက်ချက်ခြင်း မရှိပါ။

## ဖိုင်များ

- `server/core.py` — accounts, sessions, bets, ledger, daily draws, settlement
- `server/app.py` — localhost development HTTP server and admin bootstrap
- `server/index.html` — responsive Myanmar UI
- `android/` — Android shell project (uncompiled)
- `.github/workflows/android-preview.yml` — optional cloud preview build
- `tests/test_core.py` — accounting, concurrency and permission tests
- `tests/test_http.py` — HTTP/session integration tests
- `tests/test_ui.cjs` — optional Playwright browser test; not executed successfully here
- `VERIFICATION.md` — validation results
