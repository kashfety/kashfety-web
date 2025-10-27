# Lab Booking Flow - Developer Quick Reference

## State Variables

### Lab-Specific State
```typescript
const [labCenters, setLabCenters] = useState<Center[]>([]);           // All centers for step 1
const [labTypes, setLabTypes] = useState<LabTestType[]>([]);          // Tests for selected center
const [selectedLabType, setSelectedLabType] = useState<LabTestType | null>(null);
const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
const [labAvailableDates, setLabAvailableDates] = useState<string[]>([]);
```

## Flow Functions

### Step 1: Center Selection
```typescript
prefetchLabCenters()
// Fetches: All centers with lab services
// Sets: labCenters[]
// When: Lab mode is activated

handleLabCenterSelect(center)
// Fetches: Test types for selected center
// Sets: selectedCenter, labTypes[]
// Navigates: Step 1 → Step 2
```

### Step 2: Test Type Selection
```typescript
fetchLabTypesForCenter(centerId)
// Fetches: Services at specific center
// Sets: labTypes[] (unique test types)
// Called by: handleLabCenterSelect()

handleLabTypeSelect(type)
// Fetches: Pricing & available dates
// Sets: selectedLabType, actualConsultationFee
// Navigates: Step 2 → Step 3
```

### Step 3: Date & Time Selection
```typescript
fetchLabAvailableDates(centerId, typeId)
// Fetches: Available dates for booking
// Sets: labAvailableDates[]

fetchLabAvailableSlots(centerId, typeId, date)
// Fetches: Available time slots
// Sets: availableSlots[], bookedSlots[]
```

## API Endpoints

### Used in New Flow
1. **Get All Centers**
   ```typescript
   labService.getCenters({})
   // Returns: { centers: Center[] }
   ```

2. **Get Center Services**
   ```typescript
   labService.getCenterServices(centerId)
   // Returns: { services: [...] }
   ```

3. **Get Available Dates**
   ```typescript
   labService.getAvailableDates(centerId, typeId)
   // Returns: { dates: string[] }
   ```

4. **Get Available Slots**
   ```typescript
   labService.getAvailableSlots(centerId, typeId, dateString)
   // Returns: { available_slots: [...] }
   ```

## Component Rendering Logic

### Step 1 Condition
```typescript
{isLabMode && currentStep === 1 && (
  // Show center selection
)}
```

### Step 2 Condition
```typescript
{isLabMode && currentStep === 2 && selectedCenter && (
  // Show test type selection
)}
```

### Step 3 Condition
```typescript
{currentStep === 3 && isLabMode && selectedLabType && selectedCenter && (
  // Show date/time selection
)}
```

## Navigation Flow

```
Step 1 (Centers)
    ↓ handleLabCenterSelect()
Step 2 (Test Types)  ← Back button (setCurrentStep(1))
    ↓ handleLabTypeSelect()
Step 3 (Date/Time)   ← Back button (setCurrentStep(2))
    ↓ handleConfirmBooking()
Success/Complete
```

## Common Tasks

### Add New Center
No code changes needed - automatically appears in Step 1

### Add New Test Type to Center
1. Add service record linking center → test type
2. Will automatically appear in Step 2 for that center

### Modify Step Flow
- Step numbers: Defined in currentStep state
- Back buttons: Use setCurrentStep(previousStep)
- Skip step: Just increment currentStep in handler

### Debug Issues
1. Check console logs: Each handler logs its actions
2. Verify state: selectedCenter, selectedLabType, currentStep
3. Check API responses: All fetch functions log results
4. Network tab: Verify API calls are correct

## Testing Scenarios

### Happy Path
1. Open modal in lab mode → Should show centers
2. Click a center → Should show that center's tests
3. Click a test → Should show date picker
4. Select date → Should show time slots
5. Select time → Should enable confirm button

### Edge Cases
- No centers available → Show empty state
- No tests at center → Show "no tests" message
- No available dates → Disable calendar
- No available slots → Show "fully booked" message

### Error Handling
- API failure → Empty array set, error logged
- Invalid center/test → Prevented by TypeScript types
- Missing data → Null checks prevent crashes

## Migration Notes

### Old Code Location
Line ~1783: Old complex Step 2 (currentStep === 99)
- Preserved for reference/rollback
- Can be removed after stable deployment

### Breaking Changes
None - API contracts unchanged

### Backward Compatibility
✅ Existing bookings not affected
✅ Doctor flow unchanged
✅ Date/time selection unchanged
