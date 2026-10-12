# مراجع GitLab API لمتصفح المشاريع العامة

تم تصميم متصفح GitLab كتكامل عام للقراءة فقط، من دون Personal Access Token ومن دون التعامل مع المشاريع الخاصة. وثائق GitLab الرسمية التي راجعناها:

- Projects API: https://docs.gitlab.com/api/projects/
  - `GET /users/:user_id/projects` يعيد المشاريع المرئية للمستخدم، والطلبات غير المصادق عليها ترى المشاريع العامة فقط.
  - `GET /projects` يدعم البحث العام، ولا تُعرض في الطلبات غير المصادق عليها إلا المشاريع العامة.
- Repositories API: https://docs.gitlab.com/api/repositories/
  - `GET /projects/:id/repository/tree` يقبل رقم المشروع أو مسار المشروع المرمّز، ويمكن استخدامه دون مصادقة إذا كان المستودع عاماً.
- Repository files API: https://docs.gitlab.com/api/repository_files/
  - `GET /projects/:id/repository/files/:file_path/raw` يقرأ الملف الخام من مشروع عام؛ يجب ترميز `file_path` وقراءة الاستجابة بحد حجم.

يفرض التنفيذ المضيف `gitlab.com/api/v4`، والتحقق من المدخلات، وحدود حجم/معدل، وذاكرة تخزين مؤقتة قصيرة، ويعرض الملفات النصية المسموح بها فقط. لا ينفذ أو يستنسخ أو يكتب إلى المستودعات.
