"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/providers/auth-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { toArabicNumerals } from "@/lib/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Search,
    Filter,
    User,
    Star,
    MapPin,
    DollarSign,
    Calendar,
    Building2,
    Briefcase,
    Award,
    Clock,
    Phone,
    Mail,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Stethoscope,
    XCircle
} from "lucide-react"
import { toast } from "sonner"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import BookingModal from "@/components/BookingModal"

interface Doctor {
    id: string
    name: string
    first_name?: string
    last_name?: string
    first_name_ar?: string
    last_name_ar?: string
    name_ar?: string
    specialty: string
    specialty_ar?: string
    specialty_ku?: string
    specialty_en?: string
    consultation_fee: number
    rating: number
    experience_years: number
    bio?: string
    profile_picture?: string
    email?: string
    phone?: string
    qualifications?: string
}

interface Center {
    id: string
    name: string
    name_ar?: string
    address: string
    phone?: string
}

interface DoctorDetails extends Doctor {
    centers: Center[]
}

export default function PatientDoctorsPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const { t, isRTL, locale } = useLocale()
    const router = useRouter()

    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [specialtyFilter, setSpecialtyFilter] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalDoctors, setTotalDoctors] = useState(0)
    const itemsPerPage = 12

    const [selectedDoctor, setSelectedDoctor] = useState<DoctorDetails | null>(null)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
    const [bookingDoctorId, setBookingDoctorId] = useState<string | undefined>(undefined)

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev)
    }

    // Redirect if not authenticated or not a patient
    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== 'patient')) {
            router.push('/login')
        }
    }, [authLoading, isAuthenticated, user, router])

    // Fetch doctors when locale changes to refresh localized data
    useEffect(() => {
        if (isAuthenticated && user?.role === 'patient') {
            fetchDoctors()
        }
    }, [currentPage, searchQuery, specialtyFilter, isAuthenticated, user, locale])

    const fetchDoctors = async () => {
        try {
            setLoading(true)

            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                ...(searchQuery && { search: searchQuery }),
                ...(specialtyFilter && { specialty: specialtyFilter })
            })

            // Try fallback route first for Vercel compatibility
            let response = await fetch(`/api/doctors-list?${queryParams}`)

            // If fallback fails, try the original dynamic route
            if (!response.ok) {
                console.log('Fallback route failed, trying original route')
                response = await fetch(`/api/patient-dashboard/doctors?${queryParams}`)
            }

            const data = await response.json()

            if (response.ok && data.success) {
                setDoctors(data.doctors || [])
                setTotalDoctors(data.total || 0)
                setTotalPages(Math.ceil((data.total || 0) / itemsPerPage))
            } else {
                toast.error(data.message || 'Failed to load doctors')
            }
        } catch (error) {
            console.error('Error fetching doctors:', error)
            toast.error('Failed to load doctors')
        } finally {
            setLoading(false)
        }
    }

    const fetchDoctorDetails = async (doctorId: string) => {
        try {
            setLoadingDetails(true)

            // Try fallback route first for Vercel compatibility
            try {
                console.log('🔍 Trying doctor-details fallback route for:', doctorId)
                const response = await fetch(`/api/doctor-details?doctorId=${doctorId}`)
                const data = await response.json()

                if (response.ok && data.success) {
                    console.log('✅ Doctor details fetched successfully via fallback')
                    setSelectedDoctor(data.doctor)
                    setShowDetailsModal(true)
                    setLoadingDetails(false)
                    return
                }
            } catch (fallbackError) {
                console.log('❌ Fallback failed, trying dynamic route')
            }

            // Fallback to dynamic route
            const response = await fetch(`/api/patient-dashboard/doctors/${doctorId}`)
            const data = await response.json()

            if (response.ok && data.success) {
                setSelectedDoctor(data.doctor)
                setShowDetailsModal(true)
            } else {
                toast.error(data.message || 'Failed to load doctor details')
            }
        } catch (error) {
            console.error('Error fetching doctor details:', error)
            toast.error('Failed to load doctor details')
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleBookAppointment = (doctorId: string) => {
        setShowDetailsModal(false)
        setBookingDoctorId(doctorId)
        setIsBookingModalOpen(true)
    }

    const getDoctorInitials = (doctor: Doctor) => {
        const firstName = doctor.first_name || doctor.name?.split(' ')[0] || 'D'
        const lastName = doctor.last_name || doctor.name?.split(' ')[1] || 'R'
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }

    const getLocalizedDoctorName = (doctor: Doctor) => {
        if (locale === 'ar') {
            if (doctor.name_ar) return doctor.name_ar
            if (doctor.first_name_ar && doctor.last_name_ar) {
                return `${doctor.first_name_ar} ${doctor.last_name_ar}`
            }
            if (doctor.first_name_ar) return doctor.first_name_ar
        }
        return doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()
    }

    const getLocalizedCenterName = (center: Center) => {
        if (locale === 'ar' && center.name_ar) {
            return center.name_ar
        }
        return center.name
    }

    const getLocalizedSpecialty = (doctor: Doctor) => {
        if (locale === 'ar' && doctor.specialty_ar) {
            return doctor.specialty_ar
        }
        if (locale === 'ku' && doctor.specialty_ku) {
            return doctor.specialty_ku
        }
        // For English, use 'specialty' field which is the English name
        return doctor.specialty
    }

    const getUniqueSpecialties = () => {
        const specialties = doctors.map(d => d.specialty).filter(Boolean)
        return [...new Set(specialties)]
    }

    if (authLoading || (isAuthenticated && user?.role !== 'patient')) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F12] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-gray-600 dark:text-gray-400">{t('loading') || 'Loading...'}</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`min-h-screen bg-background relative overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

            {/* Main Content - No transform, sidebar overlays on top */}
            <div>
                {/* Header */}
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <Header onMenuToggle={toggleSidebar} />
                </div>

                {/* Page Content */}
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Page Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground">
                            {t('find_doctors') || t('doctors') || 'Find Doctors'}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {t('browse_doctors_desc') || t('doctors_subtitle') || 'Browse our network of qualified healthcare professionals'}
                        </p>
                    </div>

                    {/* Search and Filter */}
                    <Card className="mb-6 border-0 shadow-xl shadow-blue-500/5">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Search */}
                                <div className="md:col-span-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <Input
                                            type="text"
                                            placeholder={t('search_doctors_placeholder') || 'Search by name, specialty...'}
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value)
                                                setCurrentPage(1)
                                            }}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                {/* Specialty Filter */}
                                <div>
                                    <select
                                        value={specialtyFilter}
                                        onChange={(e) => {
                                            setSpecialtyFilter(e.target.value)
                                            setCurrentPage(1)
                                        }}
                                        className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">{t('all_specialties') || 'All Specialties'}</option>
                                        {getUniqueSpecialties().map((specialty) => {
                                            // Find a doctor with this specialty to get localized name
                                            const doctorWithSpecialty = doctors.find(d => d.specialty === specialty);
                                            const localizedName = doctorWithSpecialty ? getLocalizedSpecialty(doctorWithSpecialty) : specialty;
                                            return (
                                                <option key={specialty} value={specialty}>
                                                    {localizedName}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Results count */}
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                {t('showing_results') || 'Showing'} {toArabicNumerals(doctors.length, locale)} {t('of') || 'of'} {toArabicNumerals(totalDoctors, locale)} {t('doctors') || 'doctors'}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Doctors Grid */}
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
                    ) : doctors.length === 0 ? (
                        <Card className="border-0 shadow-xl">
                            <CardContent className="p-12 text-center">
                                <Stethoscope className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {t('no_doctors_found') || 'No Doctors Found'}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {t('try_different_search') || 'Try adjusting your search criteria'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {doctors.map((doctor) => (
                                    <Card
                                        key={doctor.id}
                                        className="border-0 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                                        onClick={() => fetchDoctorDetails(doctor.id)}
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex flex-col items-center text-center">
                                                {/* Avatar */}
                                                <Avatar className="w-20 h-20 mb-4 border-4 border-blue-100 dark:border-blue-900">
                                                    <AvatarImage src={doctor.profile_picture} alt={doctor.name} />
                                                    <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                                                        {getDoctorInitials(doctor)}
                                                    </AvatarFallback>
                                                </Avatar>

                                                {/* Name */}
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                                    {getLocalizedDoctorName(doctor)}
                                                </h3>

                                                {/* Specialty */}
                                                <Badge variant="secondary" className="mb-3">
                                                    {getLocalizedSpecialty(doctor)}
                                                </Badge>

                                                {/* Rating & Experience */}
                                                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                        <span>{toArabicNumerals(doctor.rating?.toFixed(1) || '0.0', locale)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Briefcase className="w-4 h-4 text-blue-500" />
                                                        <span>{toArabicNumerals(doctor.experience_years || 0, locale)}{t('year_short') || 'y'}</span>
                                                    </div>
                                                </div>

                                                {/* Consultation Fee */}
                                                <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400 font-semibold">
                                                    <DollarSign className="w-4 h-4" />
                                                    <span>${toArabicNumerals(doctor.consultation_fee || 0, locale)}</span>
                                                </div>

                                                {/* Action Button */}
                                                <Button
                                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        fetchDoctorDetails(doctor.id)
                                                    }}
                                                >
                                                    {t('view_profile') || 'View Profile'}
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

                    {/* Doctor Details Modal */}
                    <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            {loadingDetails ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                </div>
                            ) : selectedDoctor ? (
                                <>
                                    <DialogHeader>
                                        <div className="flex items-start gap-4">
                                            <Avatar className="w-20 h-20 border-4 border-blue-100 dark:border-blue-900">
                                                <AvatarImage src={selectedDoctor.profile_picture} alt={selectedDoctor.name} />
                                                <AvatarFallback className="bg-blue-600 text-white text-xl font-semibold">
                                                    {getDoctorInitials(selectedDoctor)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <DialogTitle className="text-2xl">{getLocalizedDoctorName(selectedDoctor)}</DialogTitle>
                                                <DialogDescription className="text-lg mt-1">
                                                    {getLocalizedSpecialty(selectedDoctor)}
                                                </DialogDescription>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                        <span className="font-medium">{toArabicNumerals(selectedDoctor.rating?.toFixed(1) || '0.0', locale)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                                        <Briefcase className="w-4 h-4" />
                                                        <span>{toArabicNumerals(selectedDoctor.experience_years || 0, locale)} {t('years_experience') || 'years experience'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </DialogHeader>

                                    <Tabs defaultValue="overview" className="mt-6">
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="overview">{t('overview') || 'Overview'}</TabsTrigger>
                                            <TabsTrigger value="centers">{t('centers') || 'Centers'}</TabsTrigger>
                                            <TabsTrigger value="contact">{t('contact') || 'Contact'}</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="overview" className="space-y-4 mt-4">
                                            {/* Bio */}
                                            {selectedDoctor.bio && (
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                                        {t('about') || 'About'}
                                                    </h3>
                                                    <p className="text-gray-600 dark:text-gray-400">
                                                        {selectedDoctor.bio}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Qualifications */}
                                            {selectedDoctor.qualifications && (
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                        <Award className="w-4 h-4" />
                                                        {t('qualifications') || 'Qualifications'}
                                                    </h3>
                                                    <p className="text-gray-600 dark:text-gray-400">
                                                        {selectedDoctor.qualifications}
                                                    </p>
                                                </div>
                                            )}

                                            {!selectedDoctor.bio && !selectedDoctor.qualifications && (
                                                <p className="text-gray-500 dark:text-gray-400 italic text-center py-4">
                                                    {t('no_additional_info') || 'No additional information available'}
                                                </p>
                                            )}

                                            {/* Consultation Fee */}
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4" />
                                                    {t('consultation_fee') || 'Consultation Fee'}
                                                </h3>
                                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                    ${toArabicNumerals(selectedDoctor.consultation_fee || 0, locale)}
                                                </p>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="centers" className="mt-4">
                                            {selectedDoctor.centers && selectedDoctor.centers.length > 0 ? (
                                                <div className="space-y-3">
                                                    {selectedDoctor.centers.map((center) => (
                                                        <Card key={center.id} className="border-0 shadow-md">
                                                            <CardContent className="p-4">
                                                                <div className="flex items-start gap-3">
                                                                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1" />
                                                                    <div className="flex-1">
                                                                        <h4 className="font-semibold text-gray-900 dark:text-white">
                                                                            {getLocalizedCenterName(center)}
                                                                        </h4>
                                                                        <div className="flex items-start gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                                            <span>{center.address}</span>
                                                                        </div>
                                                                        {center.phone && (
                                                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                                                <Phone className="w-4 h-4" />
                                                                                <span>{toArabicNumerals(center.phone, locale)}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                                                    {t('no_centers_assigned') || 'No medical centers assigned'}
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="contact" className="mt-4">
                                            <div className="space-y-4">
                                                {selectedDoctor.email && (
                                                    <div className="flex items-center gap-3">
                                                        <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                        <div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {t('email') || 'Email'}
                                                            </p>
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {selectedDoctor.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedDoctor.phone && (
                                                    <div className="flex items-center gap-3">
                                                        <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                        <div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {t('phone') || 'Phone'}
                                                            </p>
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {toArabicNumerals(
                                                                    // Clean phone number: remove any _DOCTOR_ or UUID suffixes
                                                                    selectedDoctor.phone.split('_DOCTOR_')[0].split('_')[0],
                                                                    locale
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {!selectedDoctor.email && !selectedDoctor.phone && (
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
                                            onClick={() => handleBookAppointment(selectedDoctor.id)}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Calendar className="w-4 h-4 mr-2" />
                                            {t('book_appointment') || 'Book Appointment'}
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
                            setBookingDoctorId(undefined)
                        }}
                        initialMode="doctor"
                        preSelectedDoctorId={bookingDoctorId}
                    />
                </div>
            </div>
        </div>
    )
}