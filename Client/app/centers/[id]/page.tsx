import MainLayout from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building, Save, Trash2, Users, BookOpen, Calendar, MapPin, Mail, Phone } from "lucide-react"

export default function CenterDetailsPage({ params }: { params: { id: string } }) {
  // In a real app, you would fetch the center data based on the ID
  const center = {
    id: params.id,
    name: "Downtown Learning Center",
    description:
      "A premier education center located in the heart of downtown, offering a wide range of courses for students of all ages and backgrounds.",
    location: "123 Main St, New York, NY 10001",
    status: "active",
    established: "2018-05-15",
    contact: {
      email: "downtown@eduhub.com",
      phone: "(212) 555-1234",
      website: "https://downtown.eduhub.com",
    },
    stats: {
      students: 145,
      classes: 12,
      instructors: 8,
      classrooms: 6,
    },
    courses: [
      "Mathematics",
      "Science",
      "English",
      "History",
      "Computer Science",
      "Art",
      "Music",
      "Foreign Languages",
      "Test Preparation",
    ],
  }

  return (
    <MainLayout breadcrumbs={[{ label: "Centers", href: "/centers" }, { label: center.name }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{center.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    center.status === "active" ? "success" : center.status === "inactive" ? "destructive" : "outline"
                  }
                >
                  {center.status}
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">ID: {center.id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-3">
            <Tabs defaultValue="details">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle>Center Information</CardTitle>
                  <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="courses">Courses</TabsTrigger>
                    <TabsTrigger value="staff">Staff</TabsTrigger>
                  </TabsList>
                </div>
                <CardDescription>View and edit center information</CardDescription>
              </CardHeader>

              <TabsContent value="details" className="m-0">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Center Name</Label>
                        <Input id="name" defaultValue={center.name} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" defaultValue={center.location} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="established">Established Date</Label>
                        <Input id="established" type="date" defaultValue={center.established} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select defaultValue={center.status}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={center.contact.email} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" defaultValue={center.contact.phone} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" defaultValue={center.contact.website} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" defaultValue={center.description} rows={4} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="courses" className="m-0">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Available Courses</h3>
                      <Button size="sm">Add Course</Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {center.courses.map((course, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                        >
                          <span>{course}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="staff" className="m-0">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Staff Members</h3>
                      <Button size="sm">Add Staff</Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                              Position
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                          <tr>
                            <td className="px-4 py-3 text-sm">John Smith</td>
                            <td className="px-4 py-3 text-sm">Center Director</td>
                            <td className="px-4 py-3 text-sm">john.smith@eduhub.com</td>
                            <td className="px-4 py-3 text-sm">
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm">Sarah Johnson</td>
                            <td className="px-4 py-3 text-sm">Lead Instructor</td>
                            <td className="px-4 py-3 text-sm">sarah.johnson@eduhub.com</td>
                            <td className="px-4 py-3 text-sm">
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm">Michael Brown</td>
                            <td className="px-4 py-3 text-sm">Administrator</td>
                            <td className="px-4 py-3 text-sm">michael.brown@eduhub.com</td>
                            <td className="px-4 py-3 text-sm">
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Center Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm">Students</span>
                    </div>
                    <span className="font-medium">{center.stats.students}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                      <span className="text-sm">Classes</span>
                    </div>
                    <span className="font-medium">{center.stats.classes}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm">Instructors</span>
                    </div>
                    <span className="font-medium">{center.stats.instructors}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm">Classrooms</span>
                    </div>
                    <span className="font-medium">{center.stats.classrooms}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <span className="text-sm">{center.location}</span>
                  </div>

                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm">{center.contact.email}</span>
                  </div>

                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm">{center.contact.phone}</span>
                  </div>

                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm">Established: {new Date(center.established).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
