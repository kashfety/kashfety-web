"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/providers/auth-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { toArabicNumerals, formatLocalizedNumber } from "@/lib/i18n"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Search,
    MapPin,
    DollarSign,
    Calendar,
    Building2,
    Phone,
    Mail,
    ChevronLeft,
    ChevronRight,
    Loader2,
    TestTube,
    Clock,
    Activity
} from "lucide-react"
import { toast } from "sonner"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import BookingModal from "@/components/BookingModal"

interface LabTest {
    id: string
    name: string
    name_en?: string
    name_ar?: string
    name_ku?: string
    description?: string
    category: 'lab' | 'imaging'
    default_fee: number
}

interface Center {
    id: string
    name: string
    name_ar?: string
    address: string
    phone?: string
    email?: string
    operating_hours?: any
    offers_labs?: boolean
    offers_imaging?: boolean
}

interface CenterWithTests extends Center {
    tests: LabTest[]
}

export default function PatientLabsPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const { t, isRTL, locale } = useLocale()
    const router = useRouter()

    // Helper functions for localized names
    const getLocalizedCenterName = (center: Center) => {
        if (locale === 'ar' && center.name_ar) return center.name_ar
        return center.name
    }

    const getLocalizedTestName = (test: LabTest) => {
        if (locale === 'ar' && test.name_ar) return test.name_ar
        // Kurdish locale not currently supported
        // if (locale === 'ku' && test.name_ku) return test.name_ku
        if (test.name_en) return test.name_en
        return test.name
    }

    const [centers, setCenters] = useState<CenterWithTests[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<'' | 'lab' | 'imaging'>("")
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCenters, setTotalCenters] = useState(0)
    const itemsPerPage = 12

    const [selectedCenter, setSelectedCenter] = useState<CenterWithTests | null>(null)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
    const [bookingCenterId, setBookingCenterId] = useState<string | undefined>(undefined)

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev)
    }

    // Redirect if not authenticated or not a patient
    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== 'patient')) {
            router.push('/login')
        }
    }, [authLoading, isAuthenticated, user, router])

    // Fetch centers
    useEffect(() => {
        if (isAuthenticated && user?.role === 'patient') {
            fetchCenters()
        }
    }, [currentPage, searchQuery, categoryFilter, isAuthenticated, user])

    const fetchCenters = async () => {
        try {
            setLoading(true)

            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                ...(searchQuery && { search: searchQuery }),
                ...(categoryFilter && { category: categoryFilter })
            })

            // Try fallback route first for Vercel compatibility
            let response = await fetch(`/api/labs-list?${queryParams}`)

            // If fallback fails, try the original dynamic route
            if (!response.ok) {
                console.log('Fallback route failed, trying original route')
                response = await fetch(`/api/patient-dashboard/labs?${queryParams}`)
            }

            const data = await response.json()

            if (response.ok && data.success) {
                setCenters(data.centers || [])
                setTotalCenters(data.total || 0)
                setTotalPages(Math.ceil((data.total || 0) / itemsPerPage))
            } else {
                toast.error(data.message || 'Failed to load centers')
            }
        } catch (error) {
            console.error('Error fetching centers:', error)
            toast.error('Failed to load centers')
        } finally {
            setLoading(false)
        }
    }

    const fetchCenterDetails = async (centerId: string) => {
        try {
            setLoadingDetails(true)
            setShowDetailsModal(true)

            // Try fallback route first for Vercel compatibility
            let response = await fetch(`/api/lab-details?centerId=${centerId}`)

            // If fallback fails, try the original dynamic route
            if (!response.ok) {
                console.log('Fallback route failed, trying original route')
                response = await fetch(`/api/patient-dashboard/labs/${centerId}`)
            }

            const data = await response.json()

            if (response.ok && data.success) {
                setSelectedCenter(data.center)
            } else {
                toast.error(data.message || 'Failed to load center details')
                setShowDetailsModal(false)
            }
        } catch (error) {
            console.error('Error fetching center details:', error)
            toast.error('Failed to load center details')
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleBookLabTest = () => {
        if (selectedCenter) {
            setBookingCenterId(selectedCenter.id)
        }
        setShowDetailsModal(false)
        setIsBookingModalOpen(true)
    }

    const getCenterInitials = (center: Center) => {
        const name = getLocalizedCenterName(center)
        const words = name.split(' ')
        if (words.length >= 2) {
            return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
    }

    if (authLoading || (isAuthenticated && user?.role !== 'patient')) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F12] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`min-h-screen bg-background relative overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

            {/* Main Content - No transform, sidebar overlays on top */}
            <div onClick={() => sidebarOpen && toggleSidebar()}>
                {/* Header */}
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <Header onMenuToggle={toggleSidebar} />
                </div>

                {/* Page Content */}
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Page Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground">
                            {t('find_labs') || 'Medical Centers & Labs'}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {t('browse_labs_desc') || 'Find medical centers offering lab tests and imaging services'}
                        </p>
                    </div>

                    {/* Search and Filter */}
                    <Card className="mb-6 border-0 shadow-xl shadow-blue-500/5 relative z-10">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Search */}
                                <div className="md:col-span-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <Input
                                            type="text"
                                            placeholder={t('search_labs_placeholder') || 'Search by center name, location...'}
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value)
                                                setCurrentPage(1)
                                            }}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                {/* Category Filter */}
                                <div className="relative z-20">
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => {
                                            setCategoryFilter(e.target.value as '' | 'lab' | 'imaging')
                                            setCurrentPage(1)
                                        }}
                                        className="w-full h-10 px-3 py-2 rounded-lg border-2 border-[#4DBCC4] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:border-[#4DBCC4] hover:shadow-lg focus:border-[#4DBCC4] focus:ring-2 focus:ring-[#4DBCC4]/30 cursor-pointer transition-all shadow-md font-medium appearance-none"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234DBCC4' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: isRTL ? 'left 0.75rem center' : 'right 0.75rem center',
                                            paddingLeft: isRTL ? '2rem' : '0.75rem',
                                            paddingRight: isRTL ? '0.75rem' : '2rem'
                                        }}
                                    >
                                        <option value="" className="bg-white dark:bg-gray-800">{t('all_services') || 'All Services'}</option>
                                        <option value="lab" className="bg-white dark:bg-gray-800">{t('lab_tests') || 'Lab Tests'}</option>
                                        <option value="imaging" className="bg-white dark:bg-gray-800">{t('imaging') || 'Imaging'}</option>
                                    </select>
                                </div>
                            </div>

                            {/* Results count */}
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                {t('showing_results') || 'Showing'} {toArabicNumerals(centers.length, locale)} {t('of') || 'of'} {toArabicNumerals(totalCenters, locale)} {t('centers') || 'centers'}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Centers Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col items-center">
                                            <div className="w-20 h-20 bg-gray-300 dark:bg-gray-700 rounded-full mb-4" />
                                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2" />
                                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4" />
                                            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-full" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : centers.length === 0 ? (
                        <Card className="border-0 shadow-xl">
                            <CardContent className="p-12 text-center">
                                <TestTube className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {t('no_centers_found') || 'No Centers Found'}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {t('try_different_search') || 'Try adjusting your search criteria'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {centers.map((center) => (
                                    <Card
                                        key={center.id}
                                        className="border-0 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                                        onClick={() => fetchCenterDetails(center.id)}
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex flex-col items-center text-center">
                                                {/* Icon/Avatar */}
                                                <div className="w-20 h-20 mb-4 rounded-full bg-blue-600 flex items-center justify-center">
                                                    <span className="text-white text-lg font-semibold">
                                                        {getCenterInitials(center)}
                                                    </span>
                                                </div>

                                                {/* Name */}
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                    {getLocalizedCenterName(center)}
                                                </h3>

                                                {/* Location */}
                                                <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
                                                    <MapPin className="w-4 h-4" />
                                                    <span className="line-clamp-1">{center.address}</span>
                                                </div>

                                                {/* Services Badges */}
                                                <div className="flex flex-wrap gap-2 mb-4 justify-center">
                                                    {center.offers_labs && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            <TestTube className="w-3 h-3 mr-1" />
                                                            {t('lab_tests') || 'Lab Tests'}
                                                        </Badge>
                                                    )}
                                                    {center.offers_imaging && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            <Activity className="w-3 h-3 mr-1" />
                                                            {t('imaging') || 'Imaging'}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Tests Count */}
                                                {center.tests && center.tests.length > 0 && (
                                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-4">
                                                        {toArabicNumerals(center.tests.length, locale)} {t('tests_available') || 'tests available'}
                                                    </p>
                                                )}

                                                {/* Action Button */}
                                                <Button
                                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        fetchCenterDetails(center.id)
                                                    }}
                                                >
                                                    {t('view_details') || 'View Details'}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-8 flex items-center justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        {t('previous') || 'Previous'}
                                    </Button>

                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => {
                                            const page = i + 1
                                            // Show first, last, current, and pages around current
                                            if (
                                                page === 1 ||
                                                page === totalPages ||
                                                (page >= currentPage - 1 && page <= currentPage + 1)
                                            ) {
                                                return (
                                                    <Button
                                                        key={page}
                                                        variant={currentPage === page ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(page)}
                                                        className={currentPage === page ? "bg-blue-600" : ""}
                                                    >
                                                        {toArabicNumerals(page, locale)}
                                                    </Button>
                                                )
                                            } else if (page === currentPage - 2 || page === currentPage + 2) {
                                                return <span key={page} className="px-2">...</span>
                                            }
                                            return null
                                        })}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        {t('next') || 'Next'}
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Center Details Modal */}
                    <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            {loadingDetails ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                </div>
                            ) : selectedCenter ? (
                                <>
                                    <DialogHeader>
                                        <div className="flex items-start gap-4">
                                            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
                                                <span className="text-white text-xl font-semibold">
                                                    {getCenterInitials(selectedCenter)}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <DialogTitle className="text-2xl">{getLocalizedCenterName(selectedCenter)}</DialogTitle>
                                                <DialogDescription className="text-lg mt-1">
                                                    <MapPin className="w-4 h-4 inline mr-1" />
                                                    {selectedCenter.address}
                                                </DialogDescription>
                                            </div>
                                        </div>
                                    </DialogHeader>

                                    <Tabs defaultValue="overview" className="mt-6">
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="overview">{t('overview') || 'Overview'}</TabsTrigger>
                                            <TabsTrigger value="tests">{t('tests_tab') || 'Tests Available'}</TabsTrigger>
                                            <TabsTrigger value="contact">{t('contact') || 'Contact'}</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="overview" className="space-y-4 mt-4">
                                            {/* Services */}
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                                    {t('services') || 'Services'}
                                                </h3>
                                                <div className="flex gap-2">
                                                    {selectedCenter.offers_labs && (
                                                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                                                            <TestTube className="w-4 h-4 mr-1" />
                                                            {t('lab_tests') || 'Lab Tests'}
                                                        </Badge>
                                                    )}
                                                    {selectedCenter.offers_imaging && (
                                                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                                                            <Activity className="w-4 h-4 mr-1" />
                                                            {t('imaging_services') || 'Imaging Services'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Operating Hours */}
                                            {selectedCenter.operating_hours && (
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                        <Clock className="w-4 h-4" />
                                                        {t('operating_hours') || 'Operating Hours'}
                                                    </h3>
                                                    <p className="text-gray-600 dark:text-gray-400">
                                                        {typeof selectedCenter.operating_hours === 'string'
                                                            ? selectedCenter.operating_hours
                                                            : JSON.stringify(selectedCenter.operating_hours)}
                                                    </p>
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="tests" className="mt-4">
                                            {selectedCenter.tests && selectedCenter.tests.length > 0 ? (
                                                <div className="space-y-3">
                                                    {selectedCenter.tests.map((test) => (
                                                        <Card key={test.id} className="border-0 shadow-md">
                                                            <CardContent className="p-4">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex-1">
                                                                        <h4 className="font-semibold text-gray-900 dark:text-white">
                                                                            {getLocalizedTestName(test)}
                                                                        </h4>
                                                                        {test.description && (
                                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                                                {test.description}
                                                                            </p>
                                                                        )}
                                                                        <Badge variant="outline" className="mt-2">
                                                                            {test.category === 'lab' ? (t('lab_test_singular') || 'Lab Test') : (t('imaging') || 'Imaging')}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className={isRTL ? 'text-left' : 'text-right'}>
                                                                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400" dir="ltr">
                                                                            {formatLocalizedNumber(test.default_fee, locale)} {locale === 'ar' ? 'ل.س' : 'SYP'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                                                    {t('no_tests_available') || 'No tests information available'}
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="contact" className="mt-4">
                                            <div className="space-y-4">
                                                {selectedCenter.phone && (
                                                    <div className="flex items-center gap-3">
                                                        <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                        <div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {t('phone') || 'Phone'}
                                                            </p>
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {toArabicNumerals(selectedCenter.phone, locale)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedCenter.email && (
                                                    <div className="flex items-center gap-3">
                                                        <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                        <div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {t('email') || 'Email'}
                                                            </p>
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {selectedCenter.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedCenter.address && (
                                                    <div className="flex items-start gap-3">
                                                        <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {t('address') || 'Address'}
                                                            </p>
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {selectedCenter.address}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {!selectedCenter.phone && !selectedCenter.email && (
                                                    <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                                                        {t('no_contact_info') || 'No contact information available'}
                                                    </div>
                                                )}
                                            </div>
                                        </TabsContent>
                                    </Tabs>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 mt-6">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowDetailsModal(false)}
                                            className="flex-1"
                                        >
                                            {t('close') || 'Close'}
                                        </Button>
                                        <Button
                                            onClick={handleBookLabTest}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Calendar className="w-4 h-4 mr-2" />
                                            {t('book_lab_test') || 'Book Lab Test'}
                                        </Button>
                                    </div>
                                </>
                            ) : null}
                        </DialogContent>
                    </Dialog>

                    {/* Booking Modal */}
                    <BookingModal
                        isOpen={isBookingModalOpen}
                        onClose={() => {
                            setIsBookingModalOpen(false)
                            setBookingCenterId(undefined)
                        }}
                        initialMode="lab"
                        preSelectedCenterId={bookingCenterId}
                    />
                </div>
            </div>
        </div>
    )
}
