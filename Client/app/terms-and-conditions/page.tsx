"use client"

import { useLocale } from "@/components/providers/locale-provider"
import { formatLocalizedDate } from "@/lib/i18n"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import MainLayout from "@/components/layout/main-layout"

// Last updated date - Update this when the Terms & Conditions are modified
const LAST_UPDATED_DATE = new Date('2024-12-19')

export default function TermsAndConditionsPage() {
    const { t, isRTL, locale } = useLocale()

    // Format the last updated date based on locale
    const formattedDate = formatLocalizedDate(LAST_UPDATED_DATE, locale, 'long')

    // Get localized "Last updated" text with date
    const lastUpdatedText = (t('terms_last_updated') || 'Last updated: {date}').replace('{date}', formattedDate)

    return (
        <MainLayout breadcrumbs={[{ label: t('terms_and_conditions') || 'Terms & Conditions' }]}>
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
                                {t('terms_and_conditions') || 'Terms & Conditions'}
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
                                                باستخدام هذه المنصة ("المنصة")، فإنك توافق على هذه الشروط والأحكام ("الشروط"). إذا لم توافق، يجب عليك التوقف عن استخدام المنصة.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">2. التعاريف</h2>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li><strong>المنصة:</strong> التطبيق والموقع الإلكتروني الذي يوفر خدمات طبية ومخبرية.</li>
                                                <li><strong>المستخدم / المريض:</strong> أي شخص يستخدم المنصة.</li>
                                                <li><strong>مقدم الرعاية الطبية:</strong> أي طبيب أو عيادة أو متخصص صحي يقدم خدمات عبر المنصة.</li>
                                                <li><strong>المختبر:</strong> أي مختبر يقدم خدمات فحص أو تشخيص عبر المنصة.</li>
                                                <li><strong>الموعد:</strong> أي استشارة أو زيارة مخبرية محجوزة من قبل المستخدم.</li>
                                            </ul>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">3. نطاق الخدمات</h2>
                                            <p className="text-muted-foreground mb-2" dir="rtl">توفر المنصة الخدمات الرقمية التالية:</p>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>حجز الاستشارات الطبية</li>
                                                <li>حجز الفحوصات المخبرية</li>
                                                <li>إدارة المواعيد</li>
                                                <li>عرض نتائج المختبرات على حساب المستخدم</li>
                                            </ul>
                                            <p className="text-muted-foreground mt-3" dir="rtl">
                                                المنصة <strong>لا تقدم</strong> استشارات أو تشخيص طبي. جميع الخدمات الطبية مسؤولية مقدمي الرعاية الصحية والمختبرات.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">4. الحساب الشخصي للمستخدم</h2>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">4.1 دقة المعلومات</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                يجب على المستخدم تقديم معلومات صحيحة وكاملة عند إنشاء الحساب أو حجز أي خدمة.
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">4.2 أمان الحساب</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                المستخدم مسؤول عن الحفاظ على سرية بيانات الدخول الخاصة به، وعن أي نشاط يتم من خلال حسابه.
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">4.3 سوء الاستخدام</h3>
                                            <p className="text-muted-foreground" dir="rtl">
                                                يجوز للمنصة تعليق أو إنهاء أي حساب يشارك في سوء الاستخدام أو انتهاك الشروط.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">5. المواعيد وإعادة الجدولة والإلغاء</h2>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">5.1 الحجز</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                يمكن للمستخدمين حجز المواعيد وفقًا للأوقات المتاحة المعروضة على المنصة.
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">5.2 إعادة الجدولة</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                يمكن إعادة جدولة المواعيد <strong>فقط إذا تبقى أكثر من 24 ساعة قبل الموعد المحدد</strong>. لا يُسمح بإعادة الجدولة خلال 24 ساعة قبل الموعد.
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">5.3 الإلغاء</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                يمكن إلغاء المواعيد <strong>فقط إذا تبقى أكثر من 24 ساعة قبل الموعد المحدد</strong>. لا يُسمح بالإلغاء خلال 24 ساعة قبل الموعد.
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">5.4 عدم الحضور</h3>
                                            <p className="text-muted-foreground" dir="rtl">
                                                إذا لم يحضر المستخدم الموعد دون إلغاء، يصبح الموعد غير قابل للتعديل أو الاسترجاع.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">6. خدمات المختبر</h2>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>يمكن للمختبرات تحميل نتائج الفحوصات مباشرة على <strong>حساب المستخدم</strong>.</li>
                                                <li>المنصة لا تقوم بتفسير أو تعديل نتائج الفحوصات.</li>
                                                <li>المختبر مسؤول عن دقة الفحوصات ووقت المعالجة وتوافر الخدمة.</li>
                                            </ul>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">7. المدفوعات</h2>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>يتم تحديد الرسوم من قبل مقدم الرعاية الطبية أو المختبر.</li>
                                                <li>طرق الدفع تعتمد على نوع الخدمة المحجوزة.</li>
                                                <li>أي استرداد (إن وجد) يخضع لسياسة مقدم الخدمة وقاعدة الـ24 ساعة للإلغاء.</li>
                                            </ul>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">8. الخصوصية وحماية البيانات</h2>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">8.1 جمع البيانات</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                نجمع المعلومات اللازمة لإنشاء الحسابات وإدارة الحجوزات وتقديم الخدمات.
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">8.2 استخدام البيانات</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                قد تُستخدم المعلومات لتأكيد المواعيد، ومشاركة نتائج المختبر على حساب المستخدم، وإرسال الإشعارات، وتحسين أداء المنصة.
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">8.3 مشاركة البيانات</h3>
                                            <p className="text-muted-foreground mb-3" dir="rtl">
                                                قد تُشارك البيانات فقط مع: مقدمي الرعاية الطبية المرتبطين بمواعيد المستخدم، المختبرات التي تقوم بإجراء الفحوصات المطلوبة، مزودي الخدمات الضروريين لتشغيل المنصة (مثل خدمات الرسائل القصيرة أو البريد الإلكتروني). لا يتم بيع أي معلومات شخصية للمستخدمين.
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200" dir="rtl">8.4 الأمان</h3>
                                            <p className="text-muted-foreground" dir="rtl">
                                                يتم تطبيق إجراءات تقنية وإدارية لحماية البيانات، لكن لا يوجد نظام رقمي خالٍ تمامًا من المخاطر.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">9. مسؤوليات المستخدم</h2>
                                            <p className="text-muted-foreground mb-2" dir="rtl">يوافق المستخدم على:</p>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>استخدام المنصة بشكل قانوني</li>
                                                <li>اتباع تعليمات مقدم الرعاية الصحية</li>
                                                <li>عدم سوء الاستخدام أو الاحتيال أو محاولة تعطيل المنصة</li>
                                            </ul>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">10. قيود المنصة</h2>
                                            <p className="text-muted-foreground" dir="rtl">
                                                لا تضمن المنصة توافر أو دقة أو أداء مقدمي الرعاية الطبية أو المختبرات. لا تتحمل المنصة مسؤولية النتائج الطبية أو الأخطاء أو التأخيرات.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">11. التعديلات</h2>
                                            <p className="text-muted-foreground" dir="rtl">
                                                يجوز للمنصة تحديث الخدمات أو الميزات أو هذه الشروط في أي وقت. استمرار الاستخدام يعني قبول التحديثات.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">12. تحديد المسؤولية</h2>
                                            <p className="text-muted-foreground mb-2" dir="rtl">بأقصى حد يسمح به القانون:</p>
                                            <ul className="list-disc space-y-2 text-muted-foreground list-inside ms-4" dir="rtl">
                                                <li>المنصة غير مسؤولة عن الاستشارات الطبية أو التشخيص أو النتائج العلاجية أو التأخيرات أو الأخطاء من مقدمي الخدمات أو المختبرات.</li>
                                                <li>المنصة غير مسؤولة عن مشكلات ناجمة عن خطأ المستخدم أو مشاكل تقنية أو أعطال الأجهزة أو خدمات الأطراف الخارجية.</li>
                                            </ul>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">13. القانون والاختصاص القضائي</h2>
                                            <p className="text-muted-foreground" dir="rtl">
                                                تحكم هذه الشروط القوانين في <strong>الجمهورية العربية السورية</strong>. أي نزاعات تخضع للاختصاص الحصري لمحاكم الجمهورية العربية السورية.
                                            </p>
                                        </section>

                                        <section dir="rtl">
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white" dir="rtl">14. الاتصال</h2>
                                            <p className="text-muted-foreground" dir="rtl">
                                                يمكن للمستخدمين التواصل مع الدعم من خلال القنوات المتوفرة داخل المنصة.
                                            </p>
                                        </section>
                                    </>
                                ) : (
                                    <>
                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">1. {t('terms_introduction') || 'Introduction'}</h2>
                                            <p className="text-muted-foreground leading-relaxed">
                                                {t('terms_intro_text') || 'By using this platform ("the Platform"), you agree to these Terms & Conditions ("Terms"). If you do not agree, you must stop using the Platform.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">2. {t('terms_definitions') || 'Definitions'}</h2>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li><strong>{t('terms_platform') || 'Platform:'}</strong> {t('terms_platform_def') || 'The mobile application and website providing access to medical and laboratory services.'}</li>
                                                <li><strong>{t('terms_user_patient') || 'User / Patient:'}</strong> {t('terms_user_def') || 'Any individual using the Platform.'}</li>
                                                <li><strong>{t('terms_medical_provider') || 'Medical Provider:'}</strong> {t('terms_provider_def') || 'Any doctor, clinic, or healthcare professional offering services through the Platform.'}</li>
                                                <li><strong>{t('terms_laboratory') || 'Laboratory ("Lab"):'}</strong> {t('terms_lab_def') || 'Any lab providing diagnostic or testing services through the Platform.'}</li>
                                                <li><strong>{t('terms_appointment') || 'Appointment:'}</strong> {t('terms_appointment_def') || 'A scheduled consultation or lab visit booked by the User.'}</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">3. {t('terms_scope') || 'Scope of Services'}</h2>
                                            <p className="text-muted-foreground mb-2">{t('terms_platform_facilitates') || 'The Platform facilitates:'}</p>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('terms_booking_consultations') || 'Booking medical consultations'}</li>
                                                <li>{t('terms_booking_lab_tests') || 'Booking laboratory tests'}</li>
                                                <li>{t('terms_managing_appointments') || 'Accessing and managing appointments'}</li>
                                                <li>{t('terms_viewing_results') || 'Viewing lab results uploaded to the User\'s account'}</li>
                                            </ul>
                                            <p className="text-muted-foreground mt-3">
                                                {t('terms_no_medical_advice') || 'The Platform does not provide medical advice or diagnosis; all medical-related services are delivered exclusively by the Medical Providers or Laboratories.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">4. {t('terms_user_account') || 'User Account'}</h2>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">4.1 {t('terms_info_accuracy') || 'Information Accuracy'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('terms_info_accuracy_text') || 'Users must provide accurate and complete information when creating an account or booking any service.'}
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">4.2 {t('terms_security') || 'Security'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('terms_security_text') || 'Users are responsible for keeping their login credentials confidential and for all activity conducted through their account.'}
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">4.3 {t('terms_misuse') || 'Misuse'}</h3>
                                            <p className="text-muted-foreground">
                                                {t('terms_misuse_text') || 'The Platform may suspend or terminate any account involved in misuse or violation of these Terms.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">5. {t('terms_appointments') || 'Appointments, Rescheduling, and Cancellation'}</h2>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">5.1 {t('terms_booking') || 'Booking'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('terms_booking_text') || 'Users may book appointments based on available time slots shown on the Platform.'}
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">5.2 {t('terms_rescheduling') || 'Rescheduling'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('terms_rescheduling_text') || 'Appointments may be rescheduled only when more than 24 hours remain before the scheduled time. Rescheduling within 24 hours of the appointment is not permitted.'}
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">5.3 {t('terms_cancellation') || 'Cancellation'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('terms_cancellation_text') || 'Appointments may be canceled only when more than 24 hours remain before the scheduled time. Cancellations within 24 hours are not permitted.'}
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">5.4 {t('terms_no_show') || 'No-Show'}</h3>
                                            <p className="text-muted-foreground">
                                                {t('terms_no_show_text') || 'Missing an appointment without cancellation results in the appointment becoming non-modifiable and non-refundable.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">6. {t('terms_lab_services') || 'Laboratory Services'}</h2>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('terms_lab_upload') || 'Laboratories may upload test results directly to the User\'s account.'}</li>
                                                <li>{t('terms_lab_no_interpretation') || 'The Platform does not interpret or alter lab results.'}</li>
                                                <li>{t('terms_lab_responsibility') || 'Labs are solely responsible for test accuracy, processing times, and availability.'}</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">7. {t('terms_payments') || 'Payments'}</h2>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('terms_fees_determined') || 'Fees are determined by the Medical Provider or Laboratory.'}</li>
                                                <li>{t('terms_payment_methods') || 'Payment methods may vary depending on the service.'}</li>
                                                <li>{t('terms_refunds') || 'Refunds (if applicable) follow each provider\'s policy and the 24-hour cancellation rule.'}</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">8. {t('terms_privacy') || 'Privacy & Data Protection'}</h2>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">8.1 {t('terms_data_collection') || 'Data Collection'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('terms_data_collection_text') || 'The Platform collects information needed to create accounts, manage bookings, and deliver services.'}
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">8.2 {t('terms_data_use') || 'Data Use'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('terms_data_use_text') || 'User information may be used to confirm appointments, share lab results to the user\'s account, send notifications, and improve Platform functionality.'}
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">8.3 {t('terms_data_sharing') || 'Data Sharing'}</h3>
                                            <p className="text-muted-foreground mb-3">
                                                {t('terms_data_sharing_text') || 'User data may be shared only with: Medical Providers involved in the User\'s appointments, Laboratories performing requested tests, and Third-party providers necessary for Platform operations (e.g., SMS or email services).'}
                                            </p>
                                            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">8.4 {t('terms_security_measures') || 'Security'}</h3>
                                            <p className="text-muted-foreground">
                                                {t('terms_security_measures_text') || 'Reasonable technical and administrative measures are used to protect data; however, no digital system is fully risk-free.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">9. {t('terms_user_responsibilities') || 'User Responsibilities'}</h2>
                                            <p className="text-muted-foreground mb-2">{t('terms_users_agree') || 'Users agree to:'}</p>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('terms_use_lawfully') || 'Use the Platform lawfully'}</li>
                                                <li>{t('terms_follow_instructions') || 'Follow instructions provided by Medical Providers'}</li>
                                                <li>{t('terms_avoid_misuse') || 'Avoid misuse, fraud, or attempts to disrupt Platform functionality'}</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">10. {t('terms_limitations') || 'Platform Limitations'}</h2>
                                            <p className="text-muted-foreground">
                                                {t('terms_limitations_text') || 'The Platform does not guarantee availability, accuracy, or performance of Medical Providers or Laboratories. The Platform is not responsible for medical outcomes, provider errors, or delays.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">11. {t('terms_modifications') || 'Modifications'}</h2>
                                            <p className="text-muted-foreground">
                                                {t('terms_modifications_text') || 'The Platform may update features, services, or these Terms at any time. Continued use constitutes acceptance of updated Terms.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">12. {t('terms_liability') || 'Limitation of Liability'}</h2>
                                            <p className="text-muted-foreground mb-2">
                                                {t('terms_liability_intro') || 'To the maximum extent permitted by law:'}
                                            </p>
                                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ms-4">
                                                <li>{t('terms_liability_medical') || 'The Platform is not liable for medical advice, diagnostic outcomes, treatment results, delays, or errors by providers or labs.'}</li>
                                                <li>{t('terms_liability_technical') || 'The Platform is not responsible for issues caused by User mistakes, technical problems, device failures, or external service providers.'}</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">13. {t('terms_governing_law') || 'Governing Law & Jurisdiction'}</h2>
                                            <p className="text-muted-foreground">
                                                {t('terms_governing_law_text') || 'These Terms are governed by the laws of the Syrian Arab Republic. All disputes shall fall under the exclusive jurisdiction of the courts of the Syrian Arab Republic.'}
                                            </p>
                                        </section>

                                        <section>
                                            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">14. {t('terms_contact') || 'Contact'}</h2>
                                            <p className="text-muted-foreground">
                                                {t('terms_contact_text') || 'Users may contact support through the communication channels provided within the Platform.'}
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

