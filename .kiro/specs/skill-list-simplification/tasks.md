# Implementation Plan

- [x] 1. Update validation constraints and types
  - Update CONSTRAINTS.DESCRIPTION_MAX from 1000 to 1024 characters in validation.ts
  - Create MinimalSkillResponse interface in shared types
  - Create ExtendedListSkillsOptions interface extending ListSkillsOptions
  - _Requirements: 3.1, 3.2, 4.1_

- [ ]* 1.1 Write property test for description length validation
  - **Property 7: Description length validation on create and update**
  - **Validates: Requirements 3.1, 3.2**

- [ ]* 1.2 Write property test for validation error messages
  - **Property 8: Validation error message clarity**
  - **Validates: Requirements 3.3**

- [x] 2. Enhance skill service for response format control
  - Modify SkillService.listSkills() method signature to accept ExtendedListSkillsOptions
  - Implement logic to return MinimalSkillResponse[] when detailed=false (default)
  - Implement logic to return SkillWithVersion[] when detailed=true
  - Update default behavior to show only active skills unless show_inactive=true
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [ ]* 2.1 Write property test for minimal response format
  - **Property 1: Minimal response format by default**
  - **Validates: Requirements 1.1, 2.1, 4.3**

- [ ]* 2.2 Write property test for active skills filtering
  - **Property 2: Active skills only by default**
  - **Validates: Requirements 1.2, 2.5**

- [ ]* 2.3 Write property test for detailed response format
  - **Property 4: Detailed response format**
  - **Validates: Requirements 2.2**

- [x] 3. Update MCP route handler for new parameters
  - Modify skill_list tool definition to include detailed and show_inactive parameters
  - Update handleSkillList function to parse new parameters
  - Implement response format selection based on detailed parameter
  - Update parameter mapping from show_inactive to activeOnly logic
  - _Requirements: 2.2, 2.3, 2.4_

- [ ]* 3.1 Write property test for parameter combination behavior
  - **Property 6: Parameter combination behavior**
  - **Validates: Requirements 2.4**

- [ ]* 3.2 Write property test for show inactive parameter
  - **Property 5: Show inactive parameter behavior**
  - **Validates: Requirements 2.3**

- [x] 4. Implement description length constraints in responses
  - Add description truncation logic in service layer for responses
  - Ensure all skill list responses respect 1024 character limit
  - Update existing validation to enforce 1024 character limit on create/update
  - _Requirements: 1.3, 3.4_

- [ ]* 4.1 Write property test for description length in responses
  - **Property 3: Description length constraint in responses**
  - **Validates: Requirements 1.3**

- [ ]* 4.2 Write property test for description truncation fallback
  - **Property 9: Description truncation fallback**
  - **Validates: Requirements 3.4**

- [x] 5. Add parameter validation for boolean types
  - Implement validation for detailed parameter as boolean
  - Implement validation for show_inactive parameter as boolean
  - Add appropriate error responses for invalid parameter types
  - _Requirements: 4.2_

- [ ]* 5.1 Write property test for boolean parameter validation
  - **Property 11: Boolean parameter validation**
  - **Validates: Requirements 4.2**

- [ ]* 5.2 Write property test for null description acceptance
  - **Property 10: Null description acceptance**
  - **Validates: Requirements 3.5**

- [x] 6. Ensure field naming consistency
  - Verify consistent field names between minimal and detailed responses
  - Ensure data types remain consistent across response formats
  - Update response serialization to maintain structure consistency
  - _Requirements: 4.5_

- [ ]* 6.1 Write property test for field naming consistency
  - **Property 12: Field naming consistency**
  - **Validates: Requirements 4.5**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update API documentation and tool descriptions
  - Update skill_list tool description to reflect new default behavior
  - Document parameter usage and response format differences
  - Add examples for minimal vs detailed responses
  - _Requirements: 4.4_