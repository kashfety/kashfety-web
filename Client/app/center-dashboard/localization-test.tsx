"use client"

import { useLocale } from '@/components/providers/locale-provider';

export function LocalizationTest() {
    const { locale, isRTL, t } = useLocale();

    return (
        <div className={`p-4 border rounded-lg ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <h3 className="font-bold mb-2">Localization Test</h3>
            <p>Current Locale: {locale}</p>
            <p>Is RTL: {isRTL ? 'Yes' : 'No'}</p>
            <p>Direction: {isRTL ? 'Right-to-Left' : 'Left-to-Right'}</p>
            <p>Sample Translation: {t('cd_welcome_back')}</p>

            {/* Test Arabic vs English name display */}
            <div className="mt-4 p-2 bg-gray-100 rounded">
                <h4>Sample Center Names:</h4>
                <div className="space-y-1">
                    <p>English: Medical Center</p>
                    <p>Arabic: المركز الطبي</p>
                    <p>Current Display: {locale === 'ar' ? 'المركز الطبي' : 'Medical Center'}</p>
                </div>
            </div>

            {/* Test sample test type names */}
            <div className="mt-4 p-2 bg-gray-100 rounded">
                <h4>Sample Test Type Names:</h4>
                <div className="space-y-1">
                    <p>English: Blood Test</p>
                    <p>Arabic: فحص الدم</p>
                    <p>Current Display: {locale === 'ar' ? 'فحص الدم' : 'Blood Test'}</p>
                </div>
            </div>
        </div>
    );
}