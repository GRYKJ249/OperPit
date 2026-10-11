

## مراجع رسمية لمزودي النماذج والبريد

تم التحقق من العقود الرسمية بتاريخ 2026-10-07 قبل كتابة الموائمات؛ جميع المفاتيح تبقى على الخادم فقط:

- OpenAI Chat Completions: https://developers.openai.com/api/reference/chat-completions/overview/ — واجهة محادثة بقائمة `messages` ورد `choices`; استخدم `/v1/chat/completions` مع مفتاح Bearer وموديل يختاره إعداد الخادم. الصفحة الرسمية توصي بـResponses للمشروعات الجديدة، لكن Chat Completions مناسب لمحوّل توافق موحد.
- Gemini Generate Content: https://ai.google.dev/api/generate-content — يدعم `contents[].parts[].text` و`systemInstruction` و`generationConfig.maxOutputTokens`. المثال الحالي يوثق `gemini-3.8-flash`. دليل المفتاح https://ai.google.dev/gemini-api/docs/api-key يوثق ترويسة HTTP `x-goog-api-key`؛ لا تضع المفتاح في query string أو الواجهة.
- DeepSeek Chat Completions: https://api-docs.deepseek.com/api/create-chat-completion/ — يدعم `messages` ونماذج مثل `deepseek-flash` و`deepseek-v4-pro` وحدّ `max_tokens`. يمكن تعطيل التفكير بـ`thinking: {type:"disabled"}`؛ لا تخزّن reasoning أو chain-of-thought.
- Groq Text Chat: https://console.groq.com/docs/text-chat — واجهة Chat Completions، والمثال الرسمي يذكر `llama-3.3-70b-versatile` و`max_completion_tokens`. لا يُفترض ثبات حدود مجانية؛ المفتاح وخطة المزود هما مصدر الحقيقة.
- Resend Send Email: https://resend.com/docs/api-reference/emails/send-email — `POST https://api.resend.com/emails` مع `from`, `to`, `subject`, `html`/`text` ومفتاح Bearer خادمي. مرسل الإنتاج يحتاج نطاقاً موثقاً: https://resend.com/docs/dashboard/domains/introduction. لمنع التكرار استخدم `Idempotency-Key`: https://resend.com/docs/dashboard/emails/idempotency-keys. خزّن عنوان المرسل والمفتاح والمستلم في إعداد خادمي خاص لا في المصدر.

لا توجد مفاتيح مزودين خارجيين محفوظة في المصدر. مفاتيح Gemini/OpenAI/DeepSeek/Groq وResend وشفرة غرفة الشورى لا تُملأ إلا عبر إعدادات الأسرار المحمية لاحقاً. حالة «غير مهيأ» منفصلة عن العطل.
