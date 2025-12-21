# Course Module

## Overview

The Course module manages fully populated courses created from the Book Content AI Pipeline. When a pipeline completes successfully (reaches APPROVED status), the course is populated with all episode and practice content derived from the pipeline's S3, S5, S6, and S7 step outputs.

## Module Structure

```
modules/course/
├── course.module.ts           # NestJS module definition
├── course.controller.ts       # REST API endpoints
├── course.service.ts          # Business logic & pipeline population
├── course.repository.ts       # Database operations
├── dto/
│   └── course-response.dto.ts # All DTOs and validation schemas
└── MODULE.md                  # This documentation
```

## Key Features

### 1. Course Population from Pipeline

When a pipeline reaches APPROVED status, `CourseService.populateFromPipeline()` is called to:

1. Extract S3 output (course outline, skills summary, target persona)
2. Extract S5 outputs (episode content, audio scripts, key points)
3. Extract S6 outputs (practice sessions, questions, answers)
4. Extract S7 output (quality scores)
5. Update course metadata
6. Create Episode records
7. Create PracticeSession, Question, and Answer records

### 2. Data Relationships

```
Course
├── Episodes (1:N)
│   └── Content from S5 production_output
└── PracticeSessions (1:N)
    └── Questions (1:N)
        └── Answers (1:N)
```

### 3. Practice Content Structure

- **3 Levels**: BASIC, INTERMEDIATE, ADVANCED
- **3 Sessions per Level**: 9 total sessions
- **3 Questions per Session**: 27 total questions
- **3 Answers per Question**: 81 total answers

## API Endpoints

### Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses` | List all courses (paginated) |
| GET | `/courses/:id` | Get course details with optional episodes/practice |

### Episodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses/:id/episodes` | Get all episodes for a course |
| GET | `/courses/:id/episodes/:num` | Get specific episode with full content |

### Practice Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses/:id/practice` | Get all practice sessions (filterable by level) |
| GET | `/courses/:id/practice/:sessionId` | Get specific session with questions/answers |

## Query Parameters

### GET /courses

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | CourseStatus | - | Filter by status (APPROVED, DEPLOYED) |
| bookId | UUID | - | Filter by source book |
| page | number | 1 | Page number |
| pageSize | number | 20 | Items per page (max 100) |

### GET /courses/:id

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| includeEpisodes | boolean | true | Include episode list |
| includePractice | boolean | false | Include practice sessions |

### GET /courses/:id/practice

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| level | PracticeLevel | - | Filter by level (BASIC, INTERMEDIATE, ADVANCED) |

## Response Examples

### Course Summary

```json
{
  "id": "uuid",
  "title": "Course Title",
  "description": "Core promise from idea",
  "language": "tr",
  "totalEpisodes": 6,
  "totalDuration": 42,
  "qualityScore": 85,
  "status": "APPROVED",
  "book": { "id": "uuid", "title": "Book Title" },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "approvedAt": "2024-01-02T00:00:00.000Z"
}
```

### Episode Detail

```json
{
  "id": "uuid",
  "episodeNumber": 1,
  "title": "Episode Title",
  "episodeType": "FOUNDATIONAL",
  "learningObjective": "Learning objective text",
  "wordCount": 1500,
  "estimatedDuration": 7.5,
  "textContent": "Full audio script...",
  "keyPoints": [
    { "point": "Key point 1", "purpose": "TOOL", "confirmed": true }
  ]
}
```

### Practice Session Detail

```json
{
  "id": "uuid",
  "practiceId": 11,
  "level": "BASIC",
  "levelOrder": 1,
  "skillsTested": ["Skill 1", "Skill 2"],
  "scenario": {
    "situation": "Workplace scenario",
    "context": "Context details",
    "stakes": "LOW"
  },
  "questionCount": 3,
  "questions": [
    {
      "id": "uuid",
      "questionId": "Q1",
      "questionOrder": 1,
      "questionFormat": "IMMEDIATE_RESPONSE",
      "skillFocus": "Skill focus",
      "questionText": "Question text?",
      "answers": [
        {
          "id": "uuid",
          "answerId": "A",
          "answerOrder": 1,
          "answerText": "Answer text",
          "answerQuality": "BEST",
          "isCorrect": true,
          "feedback": "Feedback text"
        }
      ]
    }
  ]
}
```

## Access Control

All endpoints require authentication and one of these roles:
- `SUPER_ADMIN`
- `CONTENT_MANAGER`

## Dependencies

- **PipelineModule**: For accessing pipeline step outputs during course population
- **CoreModule**: For authentication guards and Prisma service

## Integration with Pipeline

The `PipelineOrchestratorService` calls `CourseService.populateFromPipeline()` when:
1. S7 final evaluation is approved
2. Pipeline status changes to APPROVED

This ensures the course is fully populated with all generated content before the pipeline is marked complete.

