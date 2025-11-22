# RTL Layout Fix: Doctor Profile Settings

## Problem Description
The `DoctorProfileSettings` component was experiencing layout issues when switching to Arabic (RTL) mode. Specifically:
- Sections and text alignment were not consistently mirroring to the right.
- The implementation relied on manual conditional classes (e.g., `isRTL ? 'text-right' : 'text-left'`, `flex-row-reverse`), which is error-prone and hard to maintain.
- Spacing (margins/paddings) was often incorrect because physical properties like `mr-2` (margin-right) were used instead of logical properties.

## Solution Implemented
We refactored the component to leverage the browser's native RTL handling, aligning it with the architecture used in the Landing Page and Medical Records sections.

### 1. Native `dir` Attribute
Instead of manually forcing alignment on every element, we applied the `dir` attribute to the component's root container. This forces the browser to automatically flip the layout (flex-start becomes right, etc.).

```tsx
// Before
<div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>

// After
<div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
```

### 2. Removal of Manual Overrides
We removed redundant conditional classes that were fighting against the native flow:
- Removed `text-right` / `text-left` toggles on inputs and labels.
- Removed `flex-row-reverse` on flex containers.
- Removed manual ordering classes (e.g., `md:order-last`).

### 3. Adoption of Logical Properties
We replaced physical spacing properties with logical properties that adapt to the direction automatically:
- **Margins:** Changed `mr-2` (margin-right) to `me-2` (margin-end).
- **Padding:** Changed `pl-12` (padding-left) to `ps-12` (padding-start).
- **Positioning:** Changed `left-0` to `start-0`.

### Example: Consultation Fee Input
**Before:**
```tsx
<div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} ...`}>
<Input className={`${isRTL ? 'pr-12 text-right' : 'pl-12 text-left'} ...`} />
```

**After:**
```tsx
<div className="absolute inset-y-0 start-0 ps-3 ...">
<Input className="ps-12 text-start ..." />
```

## Benefits
- **Consistency:** The layout now behaves consistently with the rest of the application.
- **Maintainability:** Reduced code complexity by removing dozens of conditional checks.
- **Scalability:** Future additions to the form will automatically inherit the correct direction without extra code.
