nex# Implementation Plan

- [x] 1. Create reusable SkillStatusToggle component
  - Create `src/react-app/components/SkillStatusToggle.tsx` with toggle switch UI
  - Implement props interface for skillId, currentStatus, onStatusChange, disabled, size
  - Add loading state with spinner indicator
  - Add error state display with retry button
  - Implement keyboard accessibility (Enter/Space to toggle)
  - Style with Tailwind CSS for active/inactive states (green/red indicators)
  - _Requirements: 1.1, 1.4, 2.1, 2.4, 3.1, 3.2, 3.3_

- [ ]* 1.1 Write property test for toggle status switching
  - **Property 1: Toggle status switching**
  - **Validates: Requirements 1.1, 2.1**

- [ ]* 1.2 Write property test for visual status representation
  - **Property 5: Active status visual representation**
  - **Property 6: Inactive status visual representation**
  - **Validates: Requirements 3.1, 3.2**

- [x] 2. Create useSkillStatusToggle custom hook
  - Create `src/react-app/hooks/useSkillStatusToggle.ts`
  - Implement optimistic updates with rollback on error
  - Add debouncing (300ms) to prevent rapid successive toggles
  - Handle loading states and error management
  - Integrate with existing `updateSkillStatus` API function
  - Add proper cleanup for cancelled requests
  - _Requirements: 1.2, 1.3, 2.2, 2.3, 4.5_

- [ ]* 2.1 Write property test for successful toggle UI updates
  - **Property 2: Successful toggle UI updates**
  - **Validates: Requirements 1.2, 2.2, 3.4**

- [ ]* 2.2 Write property test for failed toggle error handling
  - **Property 3: Failed toggle error handling**
  - **Validates: Requirements 1.3, 2.3**

- [ ]* 2.3 Write property test for loading state display
  - **Property 4: Loading state display**
  - **Validates: Requirements 1.4, 2.4, 3.3**

- [x] 3. Integrate toggle component into SkillCard (SkillList view)
  - Modify `src/react-app/pages/SkillList.tsx` SkillCard component
  - Add SkillStatusToggle component to skill card layout
  - Implement onStatusChange handler to update local skill state
  - Prevent card click event when toggle is clicked (event.stopPropagation)
  - Update skill status optimistically in skills array
  - Handle error states and revert changes on failure
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1_

- [ ]* 3.1 Write property test for cross-view status synchronization
  - **Property 8: Cross-view status synchronization**
  - **Validates: Requirements 4.1**

- [ ]* 3.2 Write property test for multiple sequential toggles
  - **Property 9: Multiple sequential toggles**
  - **Validates: Requirements 4.2**

- [x] 4. Integrate toggle component into SkillDetail view
  - Modify `src/react-app/pages/SkillDetail.tsx` SkillMetadata component
  - Add SkillStatusToggle component near skill name and current status badge
  - Implement onStatusChange handler to update skill detail state
  - Update status badge and related UI elements immediately on successful toggle
  - Handle error states with proper error display
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 4.1 Write property test for error message with retry options
  - **Property 7: Error message with retry options**
  - **Validates: Requirements 3.5**

- [x] 5. Enhance useSkills hook for status filtering
  - Modify `src/react-app/hooks/useSkills.ts` to handle status updates
  - Add method to update individual skill status in skills array
  - Implement filtered results updates when activeOnly filter is applied
  - Preserve user's scroll position and selection during updates
  - _Requirements: 4.1, 4.3, 4.4_

- [ ]* 5.1 Write property test for filtered results updates
  - **Property 10: Filtered results updates**
  - **Validates: Requirements 4.3**

- [ ]* 5.2 Write property test for UI state preservation
  - **Property 11: UI state preservation**
  - **Validates: Requirements 4.4**

- [x] 6. Add error handling and retry functionality
  - Enhance error display in SkillStatusToggle component
  - Implement retry button functionality
  - Add timeout protection for long-running requests
  - Create user-friendly error messages for different error types
  - Add proper error logging for debugging
  - _Requirements: 3.5_

- [ ]* 6.1 Write property test for backend persistence
  - **Property 12: Backend persistence**
  - **Validates: Requirements 4.5**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 7.1 Write unit tests for SkillStatusToggle component
  - Test component rendering in different states (active, inactive, loading, error)
  - Test keyboard navigation and accessibility
  - Test click handlers and event propagation
  - Test error message display and retry functionality
  - _Requirements: 1.1, 1.4, 2.1, 2.4, 3.1, 3.2, 3.3, 3.5_

- [ ]* 7.2 Write unit tests for useSkillStatusToggle hook
  - Test optimistic updates and rollback behavior
  - Test debouncing functionality
  - Test API integration and error handling
  - Test cleanup for cancelled requests
  - _Requirements: 1.2, 1.3, 2.2, 2.3, 4.5_

- [ ]* 7.3 Write integration tests for complete toggle workflow
  - Test end-to-end toggle workflow from UI to API
  - Test cross-component state synchronization
  - Test error scenarios with mocked API failures
  - Test multiple skills toggling simultaneously
  - _Requirements: 4.1, 4.2, 4.3, 4.4_