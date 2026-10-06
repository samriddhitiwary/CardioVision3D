import * as React from "react"
import { Button } from "../components/ui/Button"
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from "../components/ui/Card"
import { Badge, RiskBadge } from "../components/ui/Badge"
import { Input } from "../components/ui/Input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/Select"
import { SegmentedControl } from "../components/ui/SegmentedControl"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/Tabs"
import { Stepper } from "../components/ui/Stepper"
import { ProgressBar } from "../components/ui/ProgressBar"
import { Skeleton } from "../components/ui/Skeleton"
import { EmptyState } from "../components/ui/EmptyState"
import { Alert } from "../components/ui/Alert"
import { ConfirmDialog } from "../components/ui/Dialog"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/Avatar"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../components/ui/Tooltip"
import { Toaster } from "../components/ui/Toaster"
import { toast } from "sonner"
import { Heart, Activity } from "lucide-react"

export function KitPage() {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [segment, setSegment] = React.useState("yes")

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-12">
      <h1 className="text-3xl font-bold mb-8">UI Kit Components</h1>
      
      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap gap-4 items-center mt-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
            </CardHeader>
            <CardBody>Content goes here. This is a standard card.</CardBody>
            <CardFooter>
              <Button variant="secondary" className="mr-2">Cancel</Button>
              <Button>Save</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Badges & Risk Badges</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
        </div>
        <div className="flex flex-wrap gap-4 items-center mt-4">
          <RiskBadge band="low" />
          <RiskBadge band="moderate" />
          <RiskBadge band="high" />
        </div>
      </section>

      {/* Forms (Input, Select, SegmentedControl) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Forms</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Input label="Standard Input" placeholder="Type here..." />
            <Input label="With Error" error="This field is required" defaultValue="Invalid" />
            <Input label="With Unit" unit="mg/dL" placeholder="0.0" />
            <Input label="Read Only" readOnly value="Cannot edit me" />
          </div>
          <div className="space-y-4">
            <Select>
              <SelectTrigger label="Select Field">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Option 1</SelectItem>
                <SelectItem value="2">Option 2</SelectItem>
                <SelectItem value="3" disabled>Disabled Option</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger label="Select With Error" error="Please select an option">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Option 1</SelectItem>
              </SelectContent>
            </Select>
            <SegmentedControl
              name="test-segment"
              label="Segmented Control"
              value={segment}
              onChange={setSegment}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
                { value: "maybe", label: "Maybe", disabled: true },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Tabs</h2>
        <Tabs defaultValue="tab1" className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tab1">Clinical Data</TabsTrigger>
            <TabsTrigger value="tab2">Analysis</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="p-4 bg-[var(--surface)] border rounded-md mt-2">
            Clinical Data Content
          </TabsContent>
          <TabsContent value="tab2" className="p-4 bg-[var(--surface)] border rounded-md mt-2">
            Analysis Content
          </TabsContent>
        </Tabs>
      </section>

      {/* Progress & Stepper */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Progress & Stepper</h2>
        <div className="space-y-8">
          <ProgressBar value={45} label="Model Confidence" valueLabel="45%" />
          <Stepper 
            steps={[
              { id: "1", title: "Patient Info", state: "complete" },
              { id: "2", title: "Clinical Data", state: "current" },
              { id: "3", title: "Review", state: "upcoming" }
            ]} 
          />
        </div>
      </section>

      {/* Feedback (Alerts, EmptyState, Skeleton, Dialog, Toaster) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Feedback</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Alert variant="info" title="Information">This is an info alert.</Alert>
            <Alert variant="warning" title="Warning">Check your inputs.</Alert>
            <Alert variant="error" title="Error">Something went wrong.</Alert>
            <Alert variant="success" title="Success">Record saved.</Alert>
            <Button onClick={() => toast("This is a sonner toast!")}>Show Toast</Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>Show Confirm Dialog</Button>
            <ConfirmDialog 
              isOpen={confirmOpen}
              title="Delete Patient?"
              description="This action cannot be undone."
              variant="danger"
              onCancel={() => setConfirmOpen(false)}
              onConfirm={() => {
                setConfirmOpen(false)
                toast.success("Deleted successfully")
              }}
            />
          </div>
          <div className="space-y-4">
            <EmptyState 
              icon={Activity} 
              title="No Analysis Found" 
              description="Run an analysis to see the results here."
              action={<Button>Run Analysis</Button>}
            />
            <div className="space-y-2">
              <Skeleton variant="block" />
              <Skeleton variant="line" />
              <Skeleton variant="line" className="w-2/3" />
            </div>
          </div>
        </div>
      </section>

      {/* Table & Overlays (Avatar, Tooltip) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Table & Overlays</h2>
        <div className="flex gap-4 items-center mb-4">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 border rounded-full"><Heart className="w-5 h-5 text-[var(--danger)]" /></div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Heart Rate</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">John Doe</TableCell>
              <TableCell>45</TableCell>
              <TableCell><RiskBadge band="low" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Jane Smith</TableCell>
              <TableCell>62</TableCell>
              <TableCell><RiskBadge band="high" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <Toaster />
    </div>
  )
}
