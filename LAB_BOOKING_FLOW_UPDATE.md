# Lab Test Booking Flow Update

## Overview
The lab test booking flow has been simplified and reorganized to improve performance and user experience. Instead of fetching all lab test types with all their centers in a complex query, users now follow a simpler two-step process.

## Changes Made

### Previous Flow (Complex)
**Step 1 (only)**: Browse all lab test types with center chips
- Fetched ALL lab test types
- For EACH test type, fetched ALL centers that offer it
- Displayed everything in one overwhelming step
- Complex query with multiple parallel API calls

**Step 2**: Select date & time

### New Flow (Simplified)
**Step 1**: Choose a center/location first
- Displays all centers that offer lab services
- Simple, fast single query
- Clear visual cards with center information

**Step 2**: View available lab test types at that specific center
- Only shows tests available at the selected center
- Faster query - only fetches tests for one center
- Reduced cognitive load for users

**Step 3**: Select date & time (unchanged)
- Same functionality as before
- Back button properly navigates to Step 2

## Technical Implementation

### New State Variables
```typescript
const [labCenters, setLabCenters] = useState<Center[]>([]); // All centers for lab mode step 1
```

### New Functions

#### `prefetchLabCenters()`
- Fetches all centers that offer lab services
- Called when lab mode is activated
- Simple and fast query

#### `fetchLabTypesForCenter(centerId: string)`
- Fetches only the lab test types available at a specific center
- Uses the center's services endpoint
- Extracts unique test types from services

#### `handleLabCenterSelect(center: Center)`
- Handles center selection in Step 1
- Fetches available test types for that center
- Moves to Step 2

#### `handleLabTypeSelect(type: LabTestType)`
- Handles test type selection in Step 2
- Fetches pricing information
- Fetches available dates
- Moves to Step 3

### Modified Functions

#### `useEffect` (modal opening)
- Lab mode now starts at Step 1 (not Step 2)
- Calls `prefetchLabCenters()` instead of `prefetchLabTypesAndCenters()`

#### `handleModeToggle()`
- Both doctor and lab modes now start at Step 1
- Calls `prefetchLabCenters()` when switching to lab mode

#### `resetModal()`
- Added reset for `labCenters` state

### UI Changes

#### Step 1 (New - Lab Center Selection)
```tsx
{isLabMode && currentStep === 1 && (
  // Display center cards with:
  // - Center name
  // - Address
  // - Phone number
  // - Click to select
)}
```

#### Step 2 (Updated - Lab Test Type Selection)
```tsx
{isLabMode && currentStep === 2 && selectedCenter && (
  // Display test type cards with:
  // - Test name
  // - Description
  // - Category badge
  // - Back button to Step 1
)}
```

#### Step 3 (Unchanged - Date & Time Selection)
- Back button correctly returns to Step 2

### Old Code (Preserved but Disabled)
The old complex Step 2 with all test types and center chips is preserved but set to render only when `currentStep === 99` (never shown). This allows for easy rollback if needed.

## Benefits

1. **Performance**: Faster initial load - only fetches centers, not all tests and their centers
2. **User Experience**: Simpler flow - users choose location first (logical)
3. **Scalability**: Easier to maintain and extend
4. **Network Efficiency**: Fewer parallel API calls, smaller payloads
5. **Progressive Disclosure**: Shows only relevant information at each step

## API Endpoints Used

1. `labService.getCenters({})` - Get all lab centers
2. `labService.getCenterServices(centerId)` - Get services/tests for a specific center
3. `labService.getAvailableDates(centerId, typeId)` - Get available dates (unchanged)
4. `labService.getAvailableSlots(centerId, typeId, date)` - Get available time slots (unchanged)

## Testing Checklist

- [ ] Lab mode opens and shows center selection
- [ ] Clicking a center shows available tests
- [ ] Clicking a test shows date/time selection
- [ ] Back buttons navigate correctly
- [ ] Switching between doctor and lab modes works
- [ ] Booking completion works end-to-end
- [ ] Modal reset works properly
- [ ] All data fetching succeeds
- [ ] Error handling works for empty states

## Rollback Plan

If issues arise, simply change the render condition in the UI section:
- Change `{isLabMode && currentStep === 99 && (` to `{isLabMode && currentStep === 2 && (`
- Change the new Step 2 condition from `currentStep === 2` to `currentStep === 999`
- Revert the `useEffect` and `handleModeToggle` to start at Step 2 for lab mode

## Date
October 16, 2025
