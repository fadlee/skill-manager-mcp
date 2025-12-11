# Design Document

## Overview

This design optimizes the MCP skill_list API response to reduce token usage while maintaining essential functionality. The current implementation returns comprehensive skill data that can be streamlined for AI agents consuming the API. The optimization focuses on returning minimal data by default while providing an option for detailed responses when needed.

## Architecture

The optimization will be implemented at the service and API response layer:

1. **Service Layer Enhancement**: Extend the existing `SkillService.listSkills()` method to support response format selection
2. **Response Type Creation**: Create new minimal response types alongside existing comprehensive types
3. **API Parameter Handling**: Add support for `detailed` and `show_inactive` parameters in MCP routes
4. **Validation Enhancement**: Update validation to enforce 1024-character description limits

## Components and Interfaces

### New Response Types

```typescript
// Minimal skill response for token optimization
interface MinimalSkillResponse {
  name: string;
  description: string | null;
}

// Extended list options with response format control
interface ExtendedListSkillsOptions extends ListSkillsOptions {
  detailed?: boolean;
  showInactive?: boolean;
}
```

### Service Interface Updates

```typescript
interface SkillService {
  // Enhanced list method with format control
  listSkills(options: ExtendedListSkillsOptions): Promise<SkillWithVersion[] | MinimalSkillResponse[]>;
  
  // Existing methods remain unchanged
  createSkill(input: CreateSkillInput): Promise<SkillDetail>;
  updateSkill(input: UpdateSkillInput): Promise<SkillDetail>;
  // ... other methods
}
```

### MCP Tool Definition Updates

The `skill_list` tool will be updated to support new parameters:

```typescript
{
  name: 'skill_list',
  description: 'List skills (minimal format by default, active skills only)',
  inputSchema: {
    type: 'object',
    properties: {
      detailed: { 
        type: 'boolean', 
        description: 'Return detailed response with all fields (default: false)' 
      },
      show_inactive: { 
        type: 'boolean', 
        description: 'Include inactive skills (default: false)' 
      },
      limit: { type: 'number', description: 'Maximum number of results' },
      offset: { type: 'number', description: 'Number of results to skip' },
      query: { type: 'string', description: 'Search query for skill name' },
    },
  },
}
```

## Data Models

### Current vs Optimized Response

**Current Full Response (per skill):**
```json
{
  "id": "uuid",
  "name": "skill-name",
  "description": "long description...",
  "active": true,
  "latest_version": 1,
  "created_at": 1234567890,
  "updated_at": 1234567890
}
```

**New Minimal Response (per skill):**
```json
{
  "name": "skill-name",
  "description": "description (max 1024 chars)"
}
```

**Token Savings Calculation:**
- Current response: ~150-200 tokens per skill (depending on description length)
- Minimal response: ~20-50 tokens per skill
- **Estimated 70-80% token reduction**

### Description Length Constraint

All skill descriptions will be limited to 1024 characters:
- Database storage remains unchanged
- Validation enforced at creation and update
- Existing descriptions exceeding limit will be truncated in responses

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing the prework analysis, several properties can be consolidated to eliminate redundancy:

- Properties 1.1, 2.1, and 4.3 all test minimal response format - can be combined into one comprehensive property
- Properties 1.2 and 2.5 both test active-only filtering - can be combined
- Properties 3.1 and 3.2 both test description length validation - can be combined into one property covering both create and update operations

**Property 1: Minimal response format by default**
*For any* skill list request without detailed=true parameter, the response should contain only name and description fields for each skill
**Validates: Requirements 1.1, 2.1, 4.3**

**Property 2: Active skills only by default**
*For any* skill list request without show_inactive=true parameter, the response should contain only skills where active=true
**Validates: Requirements 1.2, 2.5**

**Property 3: Description length constraint in responses**
*For any* skill in a list response, the description field should not exceed 1024 characters
**Validates: Requirements 1.3**

**Property 4: Detailed response format**
*For any* skill list request with detailed=true parameter, the response should contain all skill fields including id, active status, timestamps, and version information
**Validates: Requirements 2.2**

**Property 5: Show inactive parameter behavior**
*For any* skill list request with show_inactive=true parameter, the response should include both active and inactive skills
**Validates: Requirements 2.3**

**Property 6: Parameter combination behavior**
*For any* skill list request with both detailed=true and show_inactive=true parameters, the response should contain detailed information for both active and inactive skills
**Validates: Requirements 2.4**

**Property 7: Description length validation on create and update**
*For any* skill creation or update request with description longer than 1024 characters, the server should return a validation error
**Validates: Requirements 3.1, 3.2**

**Property 8: Validation error message clarity**
*For any* validation error due to description length, the error message should clearly indicate the 1024 character limit
**Validates: Requirements 3.3**

**Property 9: Description truncation fallback**
*For any* stored skill description, the length should never exceed 1024 characters regardless of input
**Validates: Requirements 3.4**

**Property 10: Null description acceptance**
*For any* skill creation or update request with null or empty description, the request should be accepted without validation errors
**Validates: Requirements 3.5**

**Property 11: Boolean parameter validation**
*For any* skill list request with invalid boolean values for detailed or show_inactive parameters, the server should return appropriate validation errors
**Validates: Requirements 4.2**

**Property 12: Field naming consistency**
*For any* skill list response format (minimal or detailed), field names and data types should remain consistent
**Validates: Requirements 4.5**

## Error Handling

### Validation Errors
- Description length validation will return HTTP 400 with clear error messages
- Invalid parameter types will return HTTP 400 with parameter-specific errors
- Existing error handling patterns will be maintained for consistency

### Breaking Change Implementation
- The minimal response format will become the new default immediately
- No backward compatibility layer needed - this is a direct optimization

## Testing Strategy

### Unit Testing
- Test parameter parsing and validation logic
- Test response format selection based on parameters
- Test description length validation in create/update operations
- Test error message formatting for validation failures

### Property-Based Testing
The testing strategy will use **fast-check** (JavaScript/TypeScript property-based testing library) with a minimum of 100 iterations per property test.

Each property-based test will be tagged with comments explicitly referencing the correctness property:
- Format: `**Feature: skill-list-simplification, Property {number}: {property_text}**`

Property-based tests will cover:
- Response format validation across different parameter combinations
- Description length constraints with randomly generated strings
- Parameter validation with various input types
- Field consistency across response formats

Unit tests will complement property tests by covering:
- Specific edge cases like empty skill lists
- Integration between service and API layers
- Error response formatting

### Implementation Approach
1. **Implementation-first development**: Implement the feature before writing corresponding tests
2. **Incremental validation**: Validate core functionality early through code
3. **Comprehensive coverage**: Both unit and property tests provide complete validation

The dual testing approach ensures:
- Unit tests catch concrete bugs and verify specific examples
- Property tests verify universal properties across all valid inputs
- Together they provide comprehensive coverage of the optimization feature