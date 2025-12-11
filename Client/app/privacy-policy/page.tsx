"use client"

import { useLocale } from "@/components/providers/locale-provider"
import { formatLocalizedDate } from "@/lib/i18n"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import MainLayout from "@/components/layout/main-layout"

// Last updated date - Update this when the Privacy Policy is modified
const LAST_UPDATED_DATE = new Date('2024-12-19')

export default function PrivacyPolicyPage() {
    const { t, isRTL, locale } = useLocale()

    // Format the last updated date based on locale
    const formattedDate = formatLocalizedDate(LAST_UPDATED_DATE, locale, 'long')

    // Get localized "Last updated" text with date
    const lastUpdatedText = (t('privacy_last_updated') || 'Last updated: {date}').replace('{date}', formattedDate)

    return (
        <MainLayout breadcrumbs={[{ label: t('privacy_policy') || 'Privacy Policy' }]}>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="max-w-4xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className={isRTL ? 'rotate-180' : ''}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" dir={isRTL ? 'rtl' : 'ltr'}>
                                {t('privacy_policy') || 'Privacy Policy'}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-2" dir={isRTL ? 'rtl' : 'ltr'}>
                                {lastUpdatedText}
                            </p>
                        </div>
                    </div>

                    {/* Content Card */}
                    <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-emerald-200 dark:border-emerald-800" dir={isRTL ? 'rtl' : 'ltr'}>
                        <CardContent className="pt-6">
                            <div className="space-y-8 text-sm prose prose-slate dark:prose-invert max-w-none" dir={isRTL ? 'rtl' : 'ltr'}>
                                {locale === 'ar' ? (
                                    <>
                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">1. المقدمة</h2>
                                            <p className="text-muted-foreground leading-relaxed" dir="rtl">
                                                توضح هذه السياسة كيفية جمع واستخدام وتخزين وحماية المعلومات الشخصية للمستخدمين على المنصة ("نحن" أو "المنصة"). باستخدامك المنصة، فإنك توافق على شروط سياسة الخصوصية هذه.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">2. المعلومات التي نقوم بجمعها</h2>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                قد نقوم بجمع الأنواع التالية من المعلومات:
                                            </p>

                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">2.1 المعلومات الشخصية</h3>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>الاسم الكامل</li>
                                                <li>رقم الهاتف</li>
                                                <li>البريد الإلكتروني</li>
                                                <li>تاريخ الميلاد</li>
                                                <li>الجنس</li>
                                                <li>العنوان (إذا لزم لتقديم الخدمة)</li>
                                            </ul>

                                            <h3 className="text-lg font-medium mb-2 mt-4 text-gray-800 dark:text-gray-200" dir="rtl">2.2 المعلومات الطبية والصحية</h3>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>تفاصيل المواعيد</li>
                                                <li>اختيار مقدمي الرعاية الطبية</li>
                                                <li>طلبات الفحوصات المخبرية</li>
                                                <li>نتائج المختبرات التي يتم تحميلها على حساب المستخدم</li>
                                                <li>ملاحظات أو توصيات مقدمي الرعاية الصحية</li>
                                            </ul>

                                            <h3 className="text-lg font-medium mb-2 mt-4 text-gray-800 dark:text-gray-200" dir="rtl">2.3 المعلومات التقنية</h3>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>معلومات الجهاز</li>
                                                <li>عنوان IP</li>
                                                <li>سجلات الاستخدام</li>
                                                <li>بيانات التحليل</li>
                                                <li>الكوكيز والتقنيات المشابهة</li>
                                            </ul>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">3. كيفية استخدام المعلومات</h2>
                                            <p className="text-muted-foreground mb-2" dir="rtl">قد تُستخدم المعلومات لتلبية أغراض مثل:</p>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>إنشاء وإدارة الحساب</li>
                                                <li>معالجة وتأكيد المواعيد</li>
                                                <li>مشاركة المعلومات مع الطبيب أو المختبر المختص</li>
                                                <li>عرض نتائج المختبر على حساب المستخدم</li>
                                                <li>إرسال الإشعارات والتحديثات</li>
                                                <li>تحسين أداء ووظائف المنصة</li>
                                            </ul>
                                            <p className="text-muted-foreground mt-3 font-medium" dir="rtl">
                                                لا تُستخدم المعلومات الطبية للإعلانات أو أي أغراض خارج نطاق الخدمة.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">4. مشاركة المعلومات</h2>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                قد تُشارك المعلومات فقط مع:
                                            </p>

                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">4.1 مقدمي الرعاية الطبية</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                الأطباء والعيادات المرتبطون بمواعيد المستخدم.
                                            </p>

                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">4.2 المختبرات</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                المختبرات التي تقوم بإجراء الفحوصات وتحميل النتائج على حساب المستخدم.
                                            </p>

                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">4.3 مقدمو الخدمات</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                الطرف الثالث الضروري لتشغيل المنصة، مثل: خدمات الرسائل القصيرة والبريد الإلكتروني، خدمات الاستضافة السحابية، مقدمو خدمات الدفع (إن وجد).
                                            </p>

                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">4.4 الالتزام القانوني</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                قد نكشف عن المعلومات إذا كان ذلك مطلوبًا بموجب قوانين الجمهورية العربية السورية أو بأمر قضائي مختص.
                                            </p>

                                            <p className="text-muted-foreground font-medium" dir="rtl">
                                                لا يتم بيع أي معلومات شخصية للمستخدمين.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">5. تخزين البيانات وأمانها</h2>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>تُخزن البيانات باستخدام أساليب آمنة ومعتمدة صناعيًا.</li>
                                                <li>يتم تطبيق تدابير تقنية وإدارية لحماية البيانات من الوصول غير المصرح به أو الفقدان أو سوء الاستخدام.</li>
                                                <li>لا يوجد نظام رقمي مضمون بالكامل ضد المخاطر، لكننا نعمل على تعزيز الأمان باستمرار.</li>
                                            </ul>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">6. حقوق المستخدمين</h2>
                                            <p className="text-muted-foreground mb-2" dir="rtl">
                                                قد يكون للمستخدمين، حسب القوانين المعمول بها، الحق في:
                                            </p>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>الوصول إلى معلوماتهم الشخصية</li>
                                                <li>طلب تصحيح البيانات غير الدقيقة</li>
                                                <li>طلب حذف بعض المعلومات عند السماح القانوني</li>
                                                <li>سحب الموافقة على الاستخدام الاختياري للبيانات</li>
                                                <li>طلب نسخة من بياناتهم</li>
                                            </ul>
                                            <p className="text-muted-foreground mt-3" dir="rtl">
                                                يمكن تقديم هذه الطلبات من خلال قنوات الدعم داخل المنصة.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">7. مدة الاحتفاظ بالبيانات</h2>
                                            <p className="text-muted-foreground" dir="rtl">
                                                نحتفظ بالبيانات الشخصية فقط طالما كان ذلك ضروريًا لتقديم الخدمات، أو للامتثال للالتزامات القانونية، أو لحل النزاعات.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">8. خصوصية الأطفال</h2>
                                            <p className="text-muted-foreground" dir="rtl">
                                                المنصة غير مخصصة للمستخدمين دون سن 18 عامًا إلا إذا كان هناك إشراف من الوالد أو الوصي القانوني. لا نقوم بجمع بيانات knowingly من القصر بدون موافقة مناسبة.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">9. الكوكيز والتقنيات المشابهة</h2>
                                            <p className="text-muted-foreground mb-2" dir="rtl">
                                                قد نستخدم الكوكيز أو أدوات مماثلة من أجل:
                                            </p>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>الحفاظ على أمان الجلسة</li>
                                                <li>تحسين الأداء</li>
                                                <li>تحليل أنماط الاستخدام</li>
                                                <li>تحسين تجربة المستخدم</li>
                                            </ul>
                                            <p className="text-muted-foreground mt-3" dir="rtl">
                                                يمكن للمستخدم ضبط إعدادات الكوكيز من خلال المتصفح.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">10. التغييرات على سياسة الخصوصية</h2>
                                            <p className="text-muted-foreground" dir="rtl">
                                                يجوز تحديث هذه السياسة من وقت لآخر. تصبح التحديثات نافذة بمجرد نشرها على المنصة. استمرار الاستخدام يعني قبول السياسة المحدّثة.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">11. القانون والاختصاص القضائي</h2>
                                            <p className="text-muted-foreground" dir="rtl">
                                                تحكم سياسة الخصوصية هذه القوانين في <strong>الجمهورية العربية السورية</strong>. أي نزاعات تخضع للاختصاص الحصري لمحاكم الجمهورية العربية السورية.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">12. الاتصال</h2>
                                            <p className="text-muted-foreground" dir="rtl">
                                                لأي استفسارات أو طلبات بخصوص سياسة الخصوصية، يمكن للمستخدم التواصل من خلال قنوات الدعم المتاحة داخل المنصة.
                                            </p>
                                        </section>
                                    </>
                                ) : (
                                    <>
                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">1. {t('privacy_introduction') || 'Introduction'}</h2>
                                            <p className="text-muted-foreground leading-relaxed">
                                                {t('privacy_intro_text') || 'This Privacy Policy explains how the Platform ("we", "our", "us") collects, uses, stores, and protects your personal information. By using the Platform, you agree to the terms outlined here.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">2. {t('privacy_information_collected') || 'Information We Collect'}</h2>
                                            <p className="text-muted-foreground mb-3">
                                                {t('privacy_collect_intro') || 'We may collect the following types of information:'}
                                            </p>

                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">2.1 {t('privacy_personal_info') || 'Personal Information'}</h3>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('privacy_full_name') || 'Full name'}</li>
                                                <li>{t('privacy_phone') || 'Phone number'}</li>
                                                <li>{t('privacy_email') || 'Email address'}</li>
                                                <li>{t('privacy_dob') || 'Date of birth'}</li>
                                                <li>{t('privacy_gender') || 'Gender'}</li>
                                                <li>{t('privacy_address') || 'Address (if required for service delivery)'}</li>
                                            </ul>

                                            <h3 className="text-lg font-medium mb-2 mt-4 text-gray-800 dark:text-gray-200">2.2 {t('privacy_medical_info') || 'Medical & Health-Related Information'}</h3>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('privacy_appointment_details') || 'Appointment details'}</li>
                                                <li>{t('privacy_provider_selections') || 'Medical provider selections'}</li>
                                                <li>{t('privacy_lab_orders') || 'Lab test orders'}</li>
                                                <li>{t('privacy_lab_results') || 'Lab results uploaded to your account'}</li>
                                                <li>{t('privacy_medical_notes') || 'Medical notes or recommendations provided by healthcare professionals'}</li>
                                            </ul>

                                            <h3 className="text-lg font-medium mb-2 mt-4 text-gray-800 dark:text-gray-200">2.3 {t('privacy_technical_info') || 'Technical Information'}</h3>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('privacy_device_info') || 'Device information'}</li>
                                                <li>{t('privacy_ip_address') || 'IP address'}</li>
                                                <li>{t('privacy_log_data') || 'Log data'}</li>
                                                <li>{t('privacy_usage_stats') || 'Usage statistics'}</li>
                                                <li>{t('privacy_cookies') || 'Cookies and similar technologies'}</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">3. {t('privacy_how_we_use') || 'How We Use Your Information'}</h2>
                                            <p className="text-muted-foreground mb-2">{t('privacy_use_intro') || 'Your information may be used to:'}</p>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('privacy_create_account') || 'Create and manage your account'}</li>
                                                <li>{t('privacy_process_appointments') || 'Process and confirm appointments'}</li>
                                                <li>{t('privacy_share_with_providers') || 'Share your information with the selected doctor or laboratory'}</li>
                                                <li>{t('privacy_display_results') || 'Display lab results on your account'}</li>
                                                <li>{t('privacy_notifications') || 'Provide notifications and updates'}</li>
                                                <li>{t('privacy_improve_platform') || 'Improve Platform performance and functionality'}</li>
                                                <li>{t('privacy_legal_compliance') || 'Ensure compliance with legal requirements'}</li>
                                            </ul>
                                            <p className="text-muted-foreground mt-3 font-medium">
                                                {t('privacy_no_advertising') || 'We do not use your medical data for advertising or unrelated purposes.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">4. {t('privacy_sharing') || 'Sharing Your Information'}</h2>
                                            <p className="text-muted-foreground mb-3">
                                                {t('privacy_sharing_intro') || 'We may share your information only with:'}
                                            </p>

                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">4.1 {t('privacy_medical_providers') || 'Medical Providers'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('privacy_providers_text') || 'Doctors and clinics involved in your medical appointments.'}
                                            </p>

                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">4.2 {t('privacy_laboratories') || 'Laboratories'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('privacy_labs_text') || 'Labs performing your requested tests and uploading results.'}
                                            </p>

                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">4.3 {t('privacy_service_providers') || 'Service Providers'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('privacy_service_providers_text') || 'Trusted third parties necessary for Platform operation, including: SMS/email notification services, Cloud hosting providers, Payment processors (if applicable)'}
                                            </p>

                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">4.4 {t('privacy_legal_requirements') || 'Legal Requirements'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('privacy_legal_text') || 'We may disclose information if required by the laws of the Syrian Arab Republic or by a competent court order.'}
                                            </p>

                                            <p className="text-muted-foreground font-medium">
                                                {t('privacy_no_selling') || 'We do not sell your personal information.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">5. {t('privacy_storage_security') || 'Data Storage & Security'}</h2>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('privacy_secure_storage') || 'Your data is stored using secure, industry-standard methods.'}</li>
                                                <li>{t('privacy_security_measures') || 'We take reasonable technical and administrative measures to protect your information from unauthorized access, loss, or misuse.'}</li>
                                                <li>{t('privacy_no_guarantee') || 'No system can guarantee absolute security, but we work continuously to enhance protection.'}</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">6. {t('privacy_user_rights') || 'User Rights'}</h2>
                                            <p className="text-muted-foreground mb-2">
                                                {t('privacy_rights_intro') || 'Depending on applicable laws, Users may have the right to:'}
                                            </p>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('privacy_access_data') || 'Access their personal information'}</li>
                                                <li>{t('privacy_correct_data') || 'Request corrections to inaccurate data'}</li>
                                                <li>{t('privacy_delete_data') || 'Request deletion of certain information (when legally permitted)'}</li>
                                                <li>{t('privacy_withdraw_consent') || 'Withdraw consent for optional data uses'}</li>
                                                <li>{t('privacy_copy_data') || 'Request a copy of their data'}</li>
                                            </ul>
                                            <p className="text-muted-foreground mt-3">
                                                {t('privacy_requests') || 'Requests may be submitted through the Platform\'s support channels.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">7. {t('privacy_retention') || 'Data Retention'}</h2>
                                            <p className="text-muted-foreground">
                                                {t('privacy_retention_text') || 'We retain personal information only as long as necessary to provide services, comply with legal obligations, or resolve disputes.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">8. {t('privacy_children') || 'Children\'s Privacy'}</h2>
                                            <p className="text-muted-foreground">
                                                {t('privacy_children_text') || 'The Platform is not intended for users under 18 unless supervised by a parent or legal guardian. We do not knowingly collect data from minors without appropriate consent.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">9. {t('privacy_cookies') || 'Cookies & Tracking Technologies'}</h2>
                                            <p className="text-muted-foreground mb-2">
                                                {t('privacy_cookies_intro') || 'We may use cookies or similar tools to:'}
                                            </p>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('privacy_maintain_session') || 'Maintain session security'}</li>
                                                <li>{t('privacy_improve_performance') || 'Improve performance'}</li>
                                                <li>{t('privacy_analyze_usage') || 'Analyze usage patterns'}</li>
                                                <li>{t('privacy_enhance_experience') || 'Enhance user experience'}</li>
                                            </ul>
                                            <p className="text-muted-foreground mt-3">
                                                {t('privacy_cookie_settings') || 'Users may adjust cookie settings through their browser.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">10. {t('privacy_changes') || 'Changes to This Privacy Policy'}</h2>
                                            <p className="text-muted-foreground">
                                                {t('privacy_changes_text') || 'We may update this Privacy Policy from time to time. Updates will take effect once published on the Platform. Continued use of the Platform signifies acceptance of the updated policy.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">11. {t('privacy_jurisdiction') || 'Jurisdiction'}</h2>
                                            <p className="text-muted-foreground">
                                                {t('privacy_jurisdiction_text') || 'This Privacy Policy is governed by the laws of the Syrian Arab Republic. Any disputes shall fall under the exclusive jurisdiction of the courts of the Syrian Arab Republic.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">12. {t('privacy_contact') || 'Contact Us'}</h2>
                                            <p className="text-muted-foreground">
                                                {t('privacy_contact_text') || 'If you have any questions or requests regarding this Privacy Policy, please contact us through the support channels provided in the Platform.'}
                                            </p>
                                        </section>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Back Button */}
                    <div className="flex justify-center pt-4">
                        <Link href="/">
                            <Button variant="outline" className="min-w-[120px]">
                                {isRTL ? '← العودة' : '← Back'}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}

