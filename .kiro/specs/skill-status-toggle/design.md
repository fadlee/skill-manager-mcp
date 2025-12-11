# Design Document

## Overview

This feature enhances the Skill Manager application by adding interactive toggle controls that allow users to change a skill's active status directly from both the skill list and skill detail views. The implementation leverages the existing backend API endpoint (`PATCH /api/skills/:id`) and extends the frontend components with optimistic updates and proper error handling.

## Architecture

The toggle functionality follows the existing application patterns:

- **Frontend**: React components with custom hooks for state management
- **API Layer**: Existing `updateSkillStatus` function in the API client
- **Backend**: Existing PATCH endpoint and service layer (no changes needed)
- **State Management**: Local component state with optimistic updates and error recovery

## Components and Interfaces

### New Components

#### SkillStatusToggle Component
A reusable toggle component that can be used in both list and detail views.

**Props:**
```typescript
interface SkillStatusToggleProps {
  skillId: string;
  currentStatus: boolean;
  onStatusChange: (newStatus: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
}
```

**Features:**
- Visual toggle switch (not just a button)
- Loading state during API calls
- Error state with retry capability
- Accessible keyboard navigation
- Responsive design

### Enhanced Hooks

#### useSkillStatusToggle Hook
A custom hook that manages the toggle state and API interactions.

**Interface:**
```typescript
interface UseSkillStatusToggleReturn {
  isToggling: boolean;
  error: string | null;
  toggleStatus: (skillId: string, currentStatus: boolean) => Promise<void>;
  clearError: () => void;
}
```

**Features:**
- Optimistic updates
- Error handling with rollback
- Loading state management
- Debouncing to prevent rapid clicks

### Modified Components

#### SkillCard Component (in SkillList)
- Add SkillStatusToggle component
- Handle status updates with optimistic UI updates
- Prevent card click when toggle is clicked

#### SkillDetail Component
- Add SkillStatusToggle component near skill metadata
- Update status display immediately on successful toggle
- Handle error states gracefully

## Data Models

No new data models are required. The existing `Skill` interface already includes the `active` boolean field.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties will ensure the toggle functionality works correctly:

Property 1: Toggle status switching
*For any* skill with a current active status, clicking the toggle control should result in the status being switched to the opposite value
**Validates: Requirements 1.1, 2.1**

Property 2: Successful toggle UI updates
*For any* successful toggle operation, all UI elements displaying the skill's status should immediately reflect the new status value
**Validates: Requirements 1.2, 2.2, 3.4**

Property 3: Failed toggle error handling
*For any* failed toggle operation, the UI should revert to the original status and display an error message
**Validates: Requirements 1.3, 2.3**

Property 4: Loading state display
*For any* toggle operation in progress, the toggle control should show a loading state and be disabled
**Validates: Requirements 1.4, 2.4, 3.3**

Property 5: Active status visual representation
*For any* skill with active status true, the status indicator should display green styling with "Active" text
**Validates: Requirements 3.1**

Property 6: Inactive status visual representation
*For any* skill with active status false, the status indicator should display red styling with "Inactive" text
**Validates: Requirements 3.2**

Property 7: Error message with retry options
*For any* toggle operation that fails, the system should display a clear error message with retry functionality
**Validates: Requirements 3.5**

Property 8: Cross-view status synchronization
*For any* skill status change in one view, all other views displaying that skill should immediately reflect the new status
**Validates: Requirements 4.1**

Property 9: Multiple sequential toggles
*For any* sequence of toggle operations on different skills, each skill should end up in the correct final state without interference
**Validates: Requirements 4.2**

Property 10: Filtered results updates
*For any* skill list filtered by active status, toggling a skill's status should immediately update the filtered results to include or exclude the skill as appropriate
**Validates: Requirements 4.3**

Property 11: UI state preservation
*For any* toggle operation, the user's current scroll position and selections in the skill list should be preserved
**Validates: Requirements 4.4**

Property 12: Backend persistence
*For any* successful toggle operation, the corresponding API call should be made to persist the status change
**Validates: Requirements 4.5**

## Error Handling

### Toggle Operation Errors
- **Network Errors**: Display "Connection failed. Please try again." with retry button
- **Server Errors**: Display "Server error. Please try again later." with retry button
- **Validation Errors**: Display specific validation message from API
- **Timeout Errors**: Display "Request timed out. Please try again." with retry button

### Error Recovery
- Automatic rollback of optimistic UI updates on failure
- Clear error messages after successful retry
- Preserve user context during error states
- Graceful degradation when API is unavailable

### Loading States
- Disable toggle control during operation
- Show spinner or loading indicator
- Prevent multiple simultaneous toggles on same skill
- Timeout protection for long-running requests

## Testing Strategy

### Unit Testing
The testing approach will use both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests** will verify specific examples, edge cases, and error conditions
- **Property-based tests** will verify universal properties that should hold across all inputs
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

**Unit Testing Requirements:**
- Test toggle component rendering in different states (active, inactive, loading, error)
- Test error message display and retry functionality
- Test integration between toggle component and parent components
- Test API client error handling and retry logic

**Property-Based Testing Requirements:**
- Use React Testing Library with property-based testing for React components
- Configure each property-based test to run a minimum of 100 iterations
- Tag each property-based test with a comment explicitly referencing the correctness property in the design document
- Use this exact format: '**Feature: skill-status-toggle, Property {number}: {property_text}**'
- Each correctness property will be implemented by a SINGLE property-based test

### Integration Testing
- Test complete toggle workflow from UI interaction to API call
- Test cross-component state synchronization
- Test error scenarios with mocked API failures
- Test optimistic updates and rollback behavior

### Accessibility Testing
- Verify keyboard navigation works correctly
- Test screen reader compatibility
- Ensure proper ARIA labels and roles
- Test focus management during state changes

## Implementation Notes

### Optimistic Updates
The toggle functionality will use optimistic updates to provide immediate feedback:

1. **Immediate UI Update**: Change status indicator immediately when toggle is clicked
2. **API Call**: Make PATCH request to backend
3. **Success Handling**: Keep the optimistic update
4. **Error Handling**: Revert to original state and show error message

### Debouncing
Implement debouncing to prevent rapid successive toggles:
- 300ms debounce period
- Disable toggle during debounce period
- Cancel pending requests if new toggle is initiated

### State Management
- Use local component state for toggle-specific state (loading, error)
- Update parent component state for skill status changes
- Leverage existing hooks pattern (`useSkills`, `useSkill`) for data management

### Performance Considerations
- Minimize re-renders by using React.memo for toggle component
- Use callback refs to avoid unnecessary effect dependencies
- Implement proper cleanup for cancelled requests
- Cache toggle state to prevent flickering during updates

### Responsive Design
- Toggle component adapts to different screen sizes
- Touch-friendly toggle targets on mobile devices
- Proper spacing and alignment in both list and detail views
- Consistent visual hierarchy across breakpoints