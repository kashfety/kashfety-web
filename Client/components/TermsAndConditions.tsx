"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLocale } from "@/components/providers/locale-provider"

interface TermsAndConditionsProps {
    isOpen: boolean
    onClose: () => void
}

export default function TermsAndConditions({ isOpen, onClose }: TermsAndConditionsProps) {
    const { t, isRTL, locale } = useLocale()

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={`max-w-4xl max-h-[90vh] ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <DialogHeader dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogTitle className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        {t('terms_and_conditions') || 'Terms & Conditions'}
                    </DialogTitle>
                    <DialogDescription className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                        {t('terms_last_updated') || 'Last updated: Please review these terms carefully'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[70vh] pr-4">
                    <div className={`space-y-6 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        <section>
                            <h2 className="text-xl font-semibold mb-3">1. {t('terms_introduction') || 'Introduction'}</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('terms_intro_text') || 'By using this platform ("the Platform"), you agree to these Terms & Conditions ("Terms"). If you do not agree, you must stop using the Platform.'}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">2. {t('terms_definitions') || 'Definitions'}</h2>
                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                                <li><strong>{t('terms_platform') || 'Platform:'}</strong> {t('terms_platform_def') || 'The mobile application and website providing access to medical and laboratory services.'}</li>
                                <li><strong>{t('terms_user_patient') || 'User / Patient:'}</strong> {t('terms_user_def') || 'Any individual using the Platform.'}</li>
                                <li><strong>{t('terms_medical_provider') || 'Medical Provider:'}</strong> {t('terms_provider_def') || 'Any doctor, clinic, or healthcare professional offering services through the Platform.'}</li>
                                <li><strong>{t('terms_laboratory') || 'Laboratory ("Lab"):'}</strong> {t('terms_lab_def') || 'Any lab providing diagnostic or testing services through the Platform.'}</li>
                                <li><strong>{t('terms_appointment') || 'Appointment:'}</strong> {t('terms_appointment_def') || 'A scheduled consultation or lab visit booked by the User.'}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">3. {t('terms_scope') || 'Scope of Services'}</h2>
                            <p className="text-muted-foreground mb-2">{t('terms_platform_facilitates') || 'The Platform facilitates:'}</p>
                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
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
                            <h2 className="text-xl font-semibold mb-3">4. {t('terms_user_account') || 'User Account'}</h2>
                            <h3 className="text-lg font-medium mb-2">4.1 {t('terms_info_accuracy') || 'Information Accuracy'}</h3>
                            <p className="text-muted-foreground mb-3">
                                {t('terms_info_accuracy_text') || 'Users must provide accurate and complete information when creating an account or booking any service.'}
                            </p>
                            <h3 className="text-lg font-medium mb-2">4.2 {t('terms_security') || 'Security'}</h3>
                            <p className="text-muted-foreground mb-3">
                                {t('terms_security_text') || 'Users are responsible for keeping their login credentials confidential and for all activity conducted through their account.'}
                            </p>
                            <h3 className="text-lg font-medium mb-2">4.3 {t('terms_misuse') || 'Misuse'}</h3>
                            <p className="text-muted-foreground">
                                {t('terms_misuse_text') || 'The Platform may suspend or terminate any account involved in misuse or violation of these Terms.'}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">5. {t('terms_appointments') || 'Appointments, Rescheduling, and Cancellation'}</h2>
                            <h3 className="text-lg font-medium mb-2">5.1 {t('terms_booking') || 'Booking'}</h3>
                            <p className="text-muted-foreground mb-3">
                                {t('terms_booking_text') || 'Users may book appointments based on available time slots shown on the Platform.'}
                            </p>
                            <h3 className="text-lg font-medium mb-2">5.2 {t('terms_rescheduling') || 'Rescheduling'}</h3>
                            <p className="text-muted-foreground mb-3">
                                {t('terms_rescheduling_text') || 'Appointments may be rescheduled only when more than 24 hours remain before the scheduled time. Rescheduling within 24 hours of the appointment is not permitted.'}
                            </p>
                            <h3 className="text-lg font-medium mb-2">5.3 {t('terms_cancellation') || 'Cancellation'}</h3>
                            <p className="text-muted-foreground mb-3">
                                {t('terms_cancellation_text') || 'Appointments may be canceled only when more than 24 hours remain before the scheduled time. Cancellations within 24 hours are not permitted.'}
                            </p>
                            <h3 className="text-lg font-medium mb-2">5.4 {t('terms_no_show') || 'No-Show'}</h3>
                            <p className="text-muted-foreground">
                                {t('terms_no_show_text') || 'Missing an appointment without cancellation results in the appointment becoming non-modifiable and non-refundable.'}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">6. {t('terms_lab_services') || 'Laboratory Services'}</h2>
                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                                <li>{t('terms_lab_upload') || 'Laboratories may upload test results directly to the User\'s account.'}</li>
                                <li>{t('terms_lab_no_interpretation') || 'The Platform does not interpret or alter lab results.'}</li>
                                <li>{t('terms_lab_responsibility') || 'Labs are solely responsible for test accuracy, processing times, and availability.'}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">7. {t('terms_payments') || 'Payments'}</h2>
                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                                <li>{t('terms_fees_determined') || 'Fees are determined by the Medical Provider or Laboratory.'}</li>
                                <li>{t('terms_payment_methods') || 'Payment methods may vary depending on the service.'}</li>
                                <li>{t('terms_refunds') || 'Refunds (if applicable) follow each provider\'s policy and the 24-hour cancellation rule.'}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">8. {t('terms_privacy') || 'Privacy & Data Protection'}</h2>
                            <h3 className="text-lg font-medium mb-2">8.1 {t('terms_data_collection') || 'Data Collection'}</h3>
                            <p className="text-muted-foreground mb-3">
                                {t('terms_data_collection_text') || 'The Platform collects information needed to create accounts, manage bookings, and deliver services.'}
                            </p>
                            <h3 className="text-lg font-medium mb-2">8.2 {t('terms_data_use') || 'Data Use'}</h3>
                            <p className="text-muted-foreground mb-3">
                                {t('terms_data_use_text') || 'User information may be used to confirm appointments, share lab results to the user\'s account, send notifications, and improve Platform functionality.'}
                            </p>
                            <h3 className="text-lg font-medium mb-2">8.3 {t('terms_data_sharing') || 'Data Sharing'}</h3>
                            <p className="text-muted-foreground mb-3">
                                {t('terms_data_sharing_text') || 'User data may be shared only with: Medical Providers involved in the User\'s appointments, Laboratories performing requested tests, and Third-party providers necessary for Platform operations (e.g., SMS or email services).'}
                            </p>
                            <h3 className="text-lg font-medium mb-2">8.4 {t('terms_security_measures') || 'Security'}</h3>
                            <p className="text-muted-foreground">
                                {t('terms_security_measures_text') || 'Reasonable technical and administrative measures are used to protect data; however, no digital system is fully risk-free.'}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">9. {t('terms_user_responsibilities') || 'User Responsibilities'}</h2>
                            <p className="text-muted-foreground mb-2">{t('terms_users_agree') || 'Users agree to:'}</p>
                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                                <li>{t('terms_use_lawfully') || 'Use the Platform lawfully'}</li>
                                <li>{t('terms_follow_instructions') || 'Follow instructions provided by Medical Providers'}</li>
                                <li>{t('terms_avoid_misuse') || 'Avoid misuse, fraud, or attempts to disrupt Platform functionality'}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">10. {t('terms_limitations') || 'Platform Limitations'}</h2>
                            <p className="text-muted-foreground">
                                {t('terms_limitations_text') || 'The Platform does not guarantee availability, accuracy, or performance of Medical Providers or Laboratories. The Platform is not responsible for medical outcomes, provider errors, or delays.'}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">11. {t('terms_modifications') || 'Modifications'}</h2>
                            <p className="text-muted-foreground">
                                {t('terms_modifications_text') || 'The Platform may update features, services, or these Terms at any time. Continued use constitutes acceptance of updated Terms.'}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">12. {t('terms_liability') || 'Limitation of Liability'}</h2>
                            <p className="text-muted-foreground mb-2">
                                {t('terms_liability_intro') || 'To the maximum extent permitted by law:'}
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                                <li>{t('terms_liability_medical') || 'The Platform is not liable for medical advice, diagnostic outcomes, treatment results, delays, or errors by providers or labs.'}</li>
                                <li>{t('terms_liability_technical') || 'The Platform is not responsible for issues caused by User mistakes, technical problems, device failures, or external service providers.'}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">13. {t('terms_governing_law') || 'Governing Law & Jurisdiction'}</h2>
                            <p className="text-muted-foreground">
                                {t('terms_governing_law_text') || 'These Terms are governed by the laws of the Syrian Arab Republic. All disputes shall fall under the exclusive jurisdiction of the courts of the Syrian Arab Republic.'}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">14. {t('terms_contact') || 'Contact'}</h2>
                            <p className="text-muted-foreground">
                                {t('terms_contact_text') || 'Users may contact support through the communication channels provided within the Platform.'}
                            </p>
                        </section>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

