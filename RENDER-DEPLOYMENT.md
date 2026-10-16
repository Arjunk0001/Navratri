# Render एवं GitHub Deployment Guide 🚀

इस प्रोजेक्ट को GitHub पर सेव करने और Render पर लाइव डिप्लॉय करने के लिए सभी फाइल्स और सेटिंग्स तैयार कर दी गई हैं।

---

## 1. प्रोजेक्ट में पहले से क्या तैयार किया गया है?

1. **Git Repository**: प्रोजेक्ट में Git इनिशियलाइज़ कर दिया गया है और सभी 58 फाइल्स (Vite Frontend, Express Server, Rituals Guide, Firebase Config आदि) को `main` ब्रांच में कमिट कर दिया गया है।
2. **Dynamic PORT Binding**: `server.ts` में `process.env.PORT || 3000` सेट कर दिया गया है ताकि Render का डायनामिक पोर्ट आसानी से कनेक्ट हो सके।
3. **CORS & Host Whitelist**: `allowedHosts: true` और सुरक्षित CORS सेट कर दिया गया है ताकि किसी भी डोमेन से वेबसाइट बिना 403 एरर के चले।
4. **Render Blueprint (`render.yaml`)**: Render पर 1-क्लिक डिप्लॉयमेंट के लिए कॉन्फ़िगरेशन फ़ाइल बना दी गई है।
5. **Build Test Passed**: `npm run build` सफल हो चुका है।

---

## 2. GitHub पर पुश (Save) कैसे करें?

AI Studio सुरक्षा कारणों से आपका निजी GitHub पासवर्ड या पर्सनल एक्सेस टोकन स्टोर नहीं करता। आप अपने कंप्यूटर या टर्मिनल पर इसे 1 कमांड में पुश कर सकते हैं:

### विकल्प A (GitHub Personal Access Token द्वारा):
1. GitHub पर जाएँ: **Settings -> Developer Settings -> Personal Access Tokens (Classic)** और `repo` अनुमति के साथ एक टोकन बनाएँ।
2. टर्मिनल में यह कमांड चलाएँ (अपनी `TOKEN` की जगह असली टोकन डालें):
```bash
git remote set-url origin https://<YOUR_GITHUB_TOKEN>@github.com/Arjunk0001/Navratri.git
git push -u origin main --force
```

### विकल्प B (GitHub Desktop या VS Code):
- अपने GitHub रेपो `Arjunk0001/Navratri` को क्लोन करें और इन अपडेटेड फाइल्स को पुश कर दें।

---

## 3. Render पर Live Deploy कैसे करें? (आसान 3 कदम)

1. **Render.com पर लॉगिन करें**:
   - [https://dashboard.render.com](https://dashboard.render.com) पर अपने GitHub अकाउंट से लॉगिन करें।

2. **New Web Service बनाएँ**:
   - **New +** बटन पर क्लिक करें और **Web Service** चुनें।
   - अपनी रिपॉजिटरी **`Arjunk0001/Navratri`** को चुनें और **Connect** पर क्लिक करें।

3. **सेटिंग्स भरें**:
   - **Name**: `shree-shakti-durga-puja` (या जो नाम आप चाहें)
   - **Region**: `Singapore` (एशिया के लिए सबसे तेज़) या `Oregon`
   - **Branch**: `main`
   - **Root Directory**: खाली छोड़ें (Blank)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free`

4. **Environment Variables जोड़ें** (Advanced सेक्शन में):
   - `NODE_ENV` = `production`
   - `PORT` = `10000`

5. **Deploy**:
   - **Create Web Service** पर क्लिक करें।
   - Render 2-3 मिनट में आपका ऐप बिल्ड करके एक फ्री लाइव URL (उदा. `https://shree-shakti-durga-puja.onrender.com`) प्रदान कर देगा! 🎉
