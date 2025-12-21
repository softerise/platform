# MODULE_BOOK_CONTENT_AI_PIPELINE_BLUEPRINT
## Version 1.1 | Status: DRAFT | Created: 2024 | Updated: 2024

---

# 0. HEADER

| Attribute | Value |
|-----------|-------|
| Module Name | Book Content AI Pipeline |
| Version | 1.1 |
| Status | DRAFT |
| Owner | Softerise |
| Dependencies | User Auth Module |
| Consumers | Mobile App Feature Module, Back Office Feature Module |
| Database | PostgreSQL (Render) via Prisma |
| Primary LLM | Claude Sonnet 4 |
| Fallback LLM | GPT-4 |

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial blueprint |
| 1.1 | 2024 | Book registration flow, Chapter management, S3 skills_summary, UI updates |

---

# 1. MODULE IDENTITY

## 1.1 Name & Purpose

**Name:** Book Content AI Pipeline Module

**Purpose:** Soft skill kitaplarını 7 adımlı AI pipeline üzerinden işleyerek dinlenebilir audio kurslara ve interaktif practice session'lara dönüştüren content production sistemi.

**Core Value:** 
```
BOOK (Title+Description) → [S1 Evaluation] → DIAMOND/GOLD? → [Add Chapters] → [Pipeline S2-S7] → AUDIO COURSE + PRACTICES
```

## 1.2 Scope

### IN (Responsibilities)

| Responsibility | Description |
|----------------|-------------|
| Book Registration | Title + Description ile kitap kaydı ve S1 değerlendirmesi |
| Chapter Management | Chapter bazlı içerik ekleme |
| Pipeline Orchestration | S2-S7 step execution flow yönetimi |
| LLM Integration | Claude/GPT-4 API calls, fallback handling |
| Step Execution | S1-S7 handler'ları, isolated execution |
| State Management | Checkpoint save/recovery, pipeline state |
| Validation | JSON, Schema, Business rule validation |
| Human Review Gates | S2 (zorunlu), S7 (zorunlu) approval flows |
| Content Storage | Book, Chapter, Course, Episode, Practice data persistence |
| Error Handling | Retry logic, escalation, stuck handling |
| Monitoring | Progress tracking, alerting, dashboards |
| BackOffice UI Specs | Book management, Pipeline management screen requirements |

### OUT (Not Responsible)

| Exclusion | Reason |
|-----------|--------|
| PDF/EPUB Parsing | MVP: Manuel text input (chapter bazlı) |
| TTS/Audio Rendering | Ayrı delivery concern |
| Course Delivery | Mobile App Module sorumluluğu |
| Recommendation Engine | Kapsam dışı |
| Token/Cost Tracking | Olmayacak |
| Course Versioning | One book = one course |
| Deploy Sonrası Rollback | Mümkün değil |

## 1.3 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Book Approval Rate | >60% | DIAMOND+GOLD / Total Registered |
| Pipeline Completion Rate | >80% | Completed / Started |
| Average Pipeline Duration | <40 min | End-to-end time (S2-S7) |
| S7 First-Pass Approval | >70% | Approved without revision |
| Step Retry Rate | <15% | Retries / Total executions |
| Stuck Pipeline Rate | <5% | Stuck / Started |

---

# 2. DOMAIN MODEL

## 2.1 Entity Relationship Diagram
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIPS                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────┐ 1:N  ┌─────────────┐
│  Book   │─────▶│ BookChapter │
└────┬────┘      └─────────────┘
     │
     │ 1:1 (when pipeline starts)
     ▼
┌─────────────┐ 1:N  ┌───────────────┐
│ PipelineRun │─────▶│ StepExecution │
└──────┬──────┘      └───────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│ HumanReview │
└─────────────┘
       │
       │ 1:1 (on APPROVED)
       ▼
┌──────────────┐
│    Course    │
└──────┬───────┘
       │
       ├─────────────┬─────────────┐
       │ 1:N         │ 1:N         │
       ▼             ▼             │
┌──────────┐  ┌────────────┐       │
│ Episode  │  │ Practice   │       │
└────┬─────┘  │ Session    │       │
     │        └─────┬──────┘       │
┌────┴────┐         │              │
│         │         │ 1:N          │
▼         ▼         ▼              │
┌───────┐ ┌───────┐ ┌──────────┐   │
│Draft  │ │Content│ │ Question │   │
│(S4)   │ │(S5)   │ └────┬─────┘   │
└───────┘ └───────┘      │         │
                         │ 1:N     │
                         ▼         │
                    ┌────────┐     │
                    │ Answer │     │
                    └────────┘     │
```

## 2.2 Entities

### 2.2.1 Book

**Purpose:** Kaynak kitap materyali ve S1 değerlendirme sonucu

| Field | Type | Constraints | Storage | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PK | Column | Unique identifier |
| title | VARCHAR(500) | NOT NULL, UNIQUE | Column | Kitap başlığı (unique) |
| description | TEXT | NOT NULL | Column | Kitap açıklaması (S1 input) |
| bookLink | VARCHAR(1000) | NULL | Column | Kitap linki (Amazon, etc.) |
| language | VARCHAR(10) | DEFAULT 'en' | Column | Dil kodu |
| s1Verdict | ENUM | NULL | Column | S1 değerlendirme sonucu |
| s1Score | INTEGER | NULL | Column | S1 skoru (0-100) |
| s1VerdictConfidence | ENUM | NULL | Column | S1 confidence level |
| s1PrimarySpiId | INTEGER | NULL | Column | Primary SPI ID |
| s1PrimarySpiName | VARCHAR(255) | NULL | Column | Primary SPI name |
| isPipelineEligible | BOOLEAN | DEFAULT false | Column | DIAMOND/GOLD = true |
| chaptersLocked | BOOLEAN | DEFAULT false | Column | Pipeline başlayınca true |
| s1Output | JSONB | NULL | JSONB | S1 full output |
| createdAt | TIMESTAMP | NOT NULL | Column | Oluşturulma tarihi |
| createdBy | UUID | FK→User | Column | Oluşturan kullanıcı |
| evaluatedAt | TIMESTAMP | NULL | Column | S1 tamamlanma tarihi |

**S1Verdict ENUM:**
```
DIAMOND | GOLD | REJECTED
```

**S1VerdictConfidence ENUM:**
```
HIGH | MEDIUM | LOW
```

**Invariants:**
- Title must be unique across all books
- isPipelineEligible = true only if s1Verdict IN (DIAMOND, GOLD)
- chaptersLocked = true once any pipeline starts

---

### 2.2.2 BookChapter

**Purpose:** Kitap chapter içeriği (chapter bazlı eklenir)

| Field | Type | Constraints | Storage | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PK | Column | Unique identifier |
| bookId | UUID | FK→Book, NOT NULL | Column | Parent book |
| chapterNumber | INTEGER | NOT NULL | Column | Sıra numarası |
| chapterTitle | VARCHAR(500) | NULL | Column | Chapter başlığı |
| content | TEXT | NOT NULL | Column | Chapter içeriği |
| wordCount | INTEGER | NULL | Column | Kelime sayısı (auto-calculated) |
| createdAt | TIMESTAMP | NOT NULL | Column | Oluşturulma tarihi |
| createdBy | UUID | FK→User | Column | Ekleyen kullanıcı |

**Invariants:**
- chapterNumber unique per bookId
- content minimum 500 words
- Cannot add/edit/delete when Book.chaptersLocked = true

---

### 2.2.3 PipelineRun

**Purpose:** Tek bir pipeline execution instance'ı

| Field | Type | Constraints | Storage | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PK | Column | Unique identifier |
| bookId | UUID | FK→Book, NOT NULL | Column | İlişkili kitap |
| status | ENUM | NOT NULL | Column | Pipeline durumu |
| currentStep | ENUM | NULL | Column | Şu anki step (S2-S7) |
| currentStepNumber | INTEGER | NULL | Column | Step numarası (2-7) |
| totalSteps | INTEGER | DEFAULT 6 | Column | Toplam step sayısı (S2-S7) |
| progress | INTEGER | 0-100 | Column | İlerleme yüzdesi |
| startedAt | TIMESTAMP | NOT NULL | Column | Başlangıç zamanı |
| completedAt | TIMESTAMP | NULL | Column | Tamamlanma zamanı |
| initiatedBy | UUID | FK→User | Column | Başlatan kullanıcı |
| revisionCount | INTEGER | DEFAULT 0 | Column | Revision döngü sayısı |
| errorMessage | TEXT | NULL | Column | Son hata mesajı |
| checkpointData | JSONB | NULL | JSONB | Recovery checkpoint |
| configuration | JSONB | NULL | JSONB | Pipeline config |

**Status ENUM:**
```
CREATED | RUNNING | PAUSED | WAITING_REVIEW | FAILED | STUCK | APPROVED | DEPLOYED | CANCELLED
```

**CurrentStep ENUM:**
```
S2_IDEA_INSPIRATION | S3_COURSE_OUTLINE | S4_EPISODE_DRAFT | 
S5_EPISODE_CONTENT | S6_PRACTICE_CONTENT | S7_FINAL_EVALUATION
```

**Note:** S1 is executed at Book Registration, not as part of PipelineRun.

**Invariants:**
- revisionCount ≤ 3
- Only RUNNING status allows step execution
- No return from DEPLOYED status

---

### 2.2.4 StepExecution

**Purpose:** Her step'in (S1-S7) execution kaydı

| Field | Type | Constraints | Storage | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PK | Column | Unique identifier |
| pipelineRunId | UUID | FK→PipelineRun, NULL | Column | İlişkili pipeline (NULL for S1) |
| bookId | UUID | FK→Book | Column | İlişkili kitap (for S1) |
| stepType | ENUM | NOT NULL | Column | Step tipi (S1-S7) |
| stepNumber | INTEGER | 1-7 | Column | Step numarası |
| episodeNumber | INTEGER | NULL | Column | Episode number (for S4/S5) |
| status | ENUM | NOT NULL | Column | Execution durumu |
| retryCount | INTEGER | DEFAULT 0 | Column | Retry sayısı |
| startedAt | TIMESTAMP | NULL | Column | Başlangıç |
| completedAt | TIMESTAMP | NULL | Column | Bitiş |
| durationMs | INTEGER | NULL | Column | Süre (ms) |
| promptVersion | VARCHAR(50) | NULL | Column | Kullanılan prompt versiyonu |
| llmProvider | VARCHAR(20) | NULL | Column | claude/gpt-4 |
| inputTokens | INTEGER | NULL | Column | Input token sayısı |
| outputTokens | INTEGER | NULL | Column | Output token sayısı |
| errorMessage | TEXT | NULL | Column | Hata mesajı |
| inputSnapshot | JSONB | NULL | JSONB | Step input'u |
| outputData | JSONB | NULL | JSONB | Step output'u (full JSON) |

**StepType ENUM:**
```
S1_BOOK_VERIFICATION | S2_IDEA_INSPIRATION | S3_COURSE_OUTLINE | 
S4_EPISODE_DRAFT | S5_EPISODE_CONTENT | S6_PRACTICE_CONTENT | S7_FINAL_EVALUATION
```

**Status ENUM:**
```
PENDING | RUNNING | SUCCESS | FAILED | EXHAUSTED | SKIPPED
```

**Step-Specific Queryable Fields (Extracted from outputData):**

**S1 Fields:**
| Field | Type | Description |
|-------|------|-------------|
| s1Verdict | ENUM | DIAMOND/GOLD/REJECTED |
| s1VerdictConfidence | ENUM | HIGH/MEDIUM/LOW |
| s1FinalScore | INTEGER | 0-100 |
| s1PrimarySpiId | INTEGER | Primary SPI ID |
| s1ProceedToS2 | BOOLEAN | Eligibility flag |

**S2 Fields:**
| Field | Type | Description |
|-------|------|-------------|
| s2TopIdeaId | VARCHAR | Selected idea ID |
| s2TopIdeaTitle | VARCHAR | Selected idea title |
| s2TopIdeaScore | INTEGER | Idea score |
| s2TopIdeaVerdict | ENUM | DIAMOND_IDEA/GOLD_IDEA/etc |
| s2ProceedToS3 | BOOLEAN | Continue flag |

**S3 Fields:**
| Field | Type | Description |
|-------|------|-------------|
| s3TotalEpisodes | INTEGER | Episode count |
| s3OverallQuality | ENUM | ALL_PASS/NEEDS_REVISION |
| s3ProceedToS4 | BOOLEAN | Continue flag |

**S7 Fields:**
| Field | Type | Description |
|-------|------|-------------|
| s7Verdict | ENUM | APPROVED/APPROVED_WITH_NOTES/etc |
| s7VerdictConfidence | ENUM | HIGH/MEDIUM/LOW |
| s7TotalScore | INTEGER | 0-100 |
| s7AllGatesPassed | BOOLEAN | Gates status |
| s7DeploymentReady | BOOLEAN | Deploy flag |

---

### 2.2.5 Course

**Purpose:** Pipeline output'u olarak oluşan onaylanmış kurs

| Field | Type | Constraints | Storage | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PK | Column | Unique identifier |
| pipelineRunId | UUID | FK→PipelineRun, UNIQUE | Column | Source pipeline |
| bookId | UUID | FK→Book | Column | Source book |
| title | VARCHAR(500) | NOT NULL | Column | Kurs başlığı |
| corePromise | TEXT | NOT NULL | Column | Core promise |
| language | VARCHAR(10) | NOT NULL | Column | Dil kodu |
| totalEpisodes | INTEGER | NOT NULL | Column | Episode sayısı |
| totalDurationMinutes | INTEGER | NULL | Column | Toplam süre |
| totalPracticeSessions | INTEGER | DEFAULT 9 | Column | Practice sayısı |
| status | ENUM | NOT NULL | Column | APPROVED/DEPLOYED |
| approvedAt | TIMESTAMP | NULL | Column | Onay tarihi |
| approvedBy | UUID | FK→User | Column | Onaylayan |
| deployedAt | TIMESTAMP | NULL | Column | Deploy tarihi |
| targetPersona | JSONB | NOT NULL | JSONB | Hedef persona |
| skillsSummary | JSONB | NOT NULL | JSONB | Skills from S3 |
| spiMapping | JSONB | NULL | JSONB | SPI mapping |
| qualityScores | JSONB | NULL | JSONB | S7 quality scores |
| metadata | JSONB | NULL | JSONB | Ek metadata |

**Status ENUM:**
```
APPROVED | DEPLOYED
```

---

### 2.2.6 Episode

**Purpose:** Kurs içindeki audio lesson unit

| Field | Type | Constraints | Storage | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PK | Column | Unique identifier |
| courseId | UUID | FK→Course | Column | İlişkili kurs |
| episodeNumber | INTEGER | 1-8 | Column | Sıra numarası |
| title | VARCHAR(500) | NOT NULL | Column | Episode başlığı |
| type | ENUM | NOT NULL | Column | Episode tipi |
| learningObjective | TEXT | NOT NULL | Column | Öğrenme hedefi |
| estimatedDurationMinutes | DECIMAL | NULL | Column | Tahmini süre |
| totalWordCount | INTEGER | NULL | Column | Kelime sayısı |
| textContent | TEXT | NOT NULL | Column | Final script (TTS için) |
| status | ENUM | NOT NULL | Column | Draft/Final status |
| draftData | JSONB | NULL | JSONB | S4 full output |
| contentData | JSONB | NULL | JSONB | S5 full output |
| outlineData | JSONB | NULL | JSONB | S3 episode data |

**Type ENUM:**
```
FOUNDATIONAL | CORE | APPLICATION | INTEGRATION
```

**Status ENUM:**
```
DRAFT | CONTENT_READY | PRODUCTION_READY
```

---

### 2.2.7 PracticeSession

**Purpose:** Interactive exercise session

| Field | Type | Constraints | Storage | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PK | Column | Unique identifier |
| courseId | UUID | FK→Course | Column | İlişkili kurs |
| practiceId | VARCHAR(50) | NOT NULL | Column | e.g., PRACTICE_BASIC_1 |
| level | ENUM | NOT NULL | Column | Difficulty level |
| levelOrder | INTEGER | 1-9 | Column | Sıralama |
| skillsTested | VARCHAR[] | NOT NULL | Column | Test edilen beceriler |
| stakes | ENUM | NOT NULL | Column | LOW/MEDIUM/HIGH |
| scenarioSituation | TEXT | NOT NULL | Column | Senaryo durumu |
| scenarioContext | TEXT | NULL | Column | Senaryo context |
| sessionData | JSONB | NOT NULL | JSONB | Full session data |

**Level ENUM:**
```
BASIC | INTERMEDIATE | ADVANCED
```

**Stakes ENUM:**
```
LOW | MEDIUM | HIGH
```

---

### 2.2.8 Question

**Purpose:** Practice session içindeki sorular

| Field | Type | Constraints | Storage | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PK | Column | Unique identifier |
| practiceSessionId | UUID | FK→PracticeSession | Column | İlişkili session |
| questionId | VARCHAR(10) | NOT NULL | Column | Q1, Q2, Q3 |
| questionOrder | INTEGER | 1-3 | Column | Sıralama |
| questionFormat | ENUM | NOT NULL | Column | Soru formatı |
| skillFocus | VARCHAR(255) | NULL | Column | Odak beceri |
| questionText | TEXT | NOT NULL | Column | Soru metni |

**QuestionFormat ENUM:**
```
IMMEDIATE_RESPONSE | STRATEGIC_CHOICE | INTERNAL_PROCESS | 
BEHAVIORAL_ACTION | COMMUNICATION_APPROACH | FOLLOW_UP | PERSPECTIVE_TAKING
```

---

### 2.2.9 Answer

**Purpose:** Soru cevap seçenekleri

| Field | Type | Constraints | Storage | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PK | Column | Unique identifier |
| questionId | UUID | FK→Question | Column | İlişkili soru |
| answerId | VARCHAR(5) | NOT NULL | Column | A, B, C |
| answerOrder | INTEGER | 1-3 | Column | Sıralama |
| answerText | TEXT | NOT NULL | Column | Cevap metni |
| answerQuality | ENUM | NOT NULL | Column | BEST/ACCEPTABLE/POOR |
| isCorrect | BOOLEAN | NOT NULL | Column | Doğru cevap mı |
| feedback | TEXT | NOT NULL | Column | Feedback (30-50 words) |

**AnswerQuality ENUM:**
```
BEST | ACCEPTABLE | POOR
```

---

### 2.2.10 HumanReview

**Purpose:** Human review action kaydı

| Field | Type | Constraints | Storage | Description |
|-------|------|-------------|---------|-------------|
| id | UUID | PK | Column | Unique identifier |
| pipelineRunId | UUID | FK→PipelineRun | Column | İlişkili pipeline |
| stepType | ENUM | NOT NULL | Column | Review yapılan step |
| reviewType | ENUM | NOT NULL | Column | Review tipi |
| decision | ENUM | NOT NULL | Column | Karar |
| reviewedBy | UUID | FK→User | Column | Reviewer |
| reviewedAt | TIMESTAMP | NOT NULL | Column | Review zamanı |
| comments | TEXT | NULL | Column | Yorumlar |
| selectedIdeaId | VARCHAR(50) | NULL | Column | S2 için seçilen idea |
| reviewData | JSONB | NULL | JSONB | Ek review data |

**ReviewType ENUM:**
```
IDEA_APPROVAL | FINAL_APPROVAL | STUCK_RESOLUTION | PARTIAL_SUCCESS_DECISION
```

**Decision ENUM:**
```
APPROVED | REJECTED | CONTINUE_PARTIAL | CANCEL | RESTART
```

---

## 2.3 Value Objects

### 2.3.1 TargetPersona
```json
{
  "who": "string - Hedef kitle tanımı",
  "level": "JUNIOR | MID_LEVEL | SENIOR | EXECUTIVE",
  "situation": "string - Kullanım bağlamı",
  "struggle": "string - Yaşanan zorluk",
  "desiredOutcome": "string - İstenen sonuç"
}
```

### 2.3.2 SkillsSummary
```json
{
  "foundationalSkills": [
    "Recognize when conversation becomes crucial",
    "Distinguish facts from conclusions"
  ],
  "combinedSkills": [
    "Apply STATE method with empathy",
    "Balance honesty with respect"
  ],
  "integratedSkills": [
    "Navigate high-stakes feedback conversations end-to-end"
  ],
  "totalSkillsCount": 7
}
```

### 2.3.3 QualityScores
```json
{
  "contentEngagement": { "score": 0, "max": 25 },
  "pedagogicalSoundness": { "score": 0, "max": 25 },
  "practiceEffectiveness": { "score": 0, "max": 25 },
  "productionPolish": { "score": 0, "max": 25 },
  "totalScore": 0,
  "maxScore": 100
}
```

### 2.3.4 CheckpointData
```json
{
  "lastCompletedStep": "S2 | S3 | ... | S7",
  "lastCompletedEpisode": 0,
  "stepOutputs": {
    "S2": { "executionId": "uuid" },
    "S3": { "executionId": "uuid" }
  },
  "episodeProgress": {
    "S4": [1, 2, 3],
    "S5": [1, 2]
  },
  "savedAt": "ISO_8601"
}
```

---

# 3. DECISION LOGIC

## 3.1 Decision Rules

### DR-01: Book Registration & S1 Evaluation
```
WHEN user registers new Book with title + description
IF Book.title already exists in database
THEN REJECT with "DUPLICATE_TITLE" error
ELSE 
  CREATE Book record with status EVALUATING
  CALL S1 LLM with (title, description) only
  STORE S1 output in Book record
  SET Book.s1Verdict, s1Score, s1VerdictConfidence, s1PrimarySpiId
  IF s1Verdict IN (DIAMOND, GOLD) 
    THEN SET isPipelineEligible = true
  ELSE 
    SET isPipelineEligible = false
  EMIT BookEvaluated event
```

### DR-02: Pipeline Start Eligibility
```
WHEN user requests pipeline start for Book
IF Book.isPipelineEligible = false
THEN REJECT with "BOOK_NOT_ELIGIBLE"
ELSE IF Book has NO chapters (BookChapter count = 0)
THEN REJECT with "NO_CHAPTERS"
ELSE IF Book has active pipeline (status IN [RUNNING, PAUSED, WAITING_REVIEW])
THEN REJECT with "ACTIVE_PIPELINE_EXISTS"
ELSE IF Book has completed pipeline (status IN [APPROVED, DEPLOYED])
THEN REJECT with "BOOK_ALREADY_HAS_COURSE"
ELSE 
  SET Book.chaptersLocked = true
  CREATE PipelineRun with status = CREATED
  EMIT PipelineCreated, ChaptersLocked events
  START pipeline from S2
```

### DR-03: Chapter Management
```
WHEN user adds/edits/deletes chapter for Book
IF Book.chaptersLocked = true
THEN REJECT with "CHAPTERS_LOCKED"
ELSE IF Book.isPipelineEligible = false
THEN REJECT with "BOOK_NOT_ELIGIBLE"
ELSE ALLOW operation
  UPDATE Book chapter list
  EMIT ChapterAdded/ChapterUpdated/ChapterDeleted event
```

### DR-04: Step Transition
```
WHEN StepExecution completes with SUCCESS
IF currentStep = S2 AND requiresHumanReview = TRUE
THEN pipeline.status = WAITING_REVIEW, WAIT for human approval
ELSE IF currentStep = S7 AND s7Verdict IN [APPROVED, APPROVED_WITH_NOTES]
THEN pipeline.status = APPROVED
ELSE IF currentStep = S7 AND s7Verdict = REVISION_REQUIRED
THEN increment revisionCount, return to revision step
ELSE IF currentStep = S7 AND s7Verdict = REJECTED
THEN pipeline.status = FAILED
ELSE advance to next step
```

### DR-05: Retry Decision
```
WHEN StepExecution fails
IF retryCount < MAX_RETRY (2)
AND error.type IN [LLM_API_ERROR, VALIDATION_ERROR, BUSINESS_RULE_VIOLATION]
THEN retry with exponential backoff
ELSE IF retryCount >= MAX_RETRY
THEN StepExecution.status = EXHAUSTED, pipeline.status = FAILED
```

### DR-06: Revision Loop Decision
```
WHEN S7.verdict = REVISION_REQUIRED
IF pipeline.revisionCount < MAX_REVISION (3)
THEN increment revisionCount, return to specified step, re-run downstream
ELSE pipeline.status = STUCK, flag for human escalation
```

### DR-07: Parallel Episode Processing
```
WHEN S3 completes with SUCCESS
FOR S4 processing:
  - Process up to MAX_CONCURRENT (5) episodes in parallel
  - Each episode is independent StepExecution
  - Wait for all S4 episodes before starting S5
FOR S5 processing:
  - Same parallel strategy
  - Wait for all S5 episodes before S6
```

### DR-08: Human Review Gate (S2)
```
WHEN S2 completes with SUCCESS
ALWAYS pause pipeline
SET pipeline.status = WAITING_REVIEW
WAIT for HumanReview with decision IN [APPROVED, REJECTED]
IF APPROVED: continue to S3
IF REJECTED: pipeline.status = CANCELLED
```

### DR-09: Human Review Gate (S7)
```
WHEN S7 completes
IF s7Verdict IN [APPROVED, APPROVED_WITH_NOTES]
THEN pause for final human confirmation
IF human confirms: pipeline.status = APPROVED
IF human requests changes: treat as REVISION_REQUIRED
```

### DR-10: Partial Success Handling
```
WHEN S4 or S5 processing completes
IF some episodes SUCCESS and some FAILED (after retries)
THEN pause pipeline
SET pipeline.status = WAITING_REVIEW
PRESENT options to human:
  - CONTINUE_PARTIAL: proceed with successful episodes only
  - CANCEL: terminate pipeline
IF CONTINUE_PARTIAL: update totalEpisodes, continue
```

### DR-11: Checkpoint Save
```
AFTER each successful StepExecution
AND AFTER each successful episode completion (S4/S5)
SAVE checkpoint to pipeline.checkpointData:
  - lastCompletedStep
  - lastCompletedEpisode (if applicable)
  - step outputs references
```

### DR-12: Recovery Decision
```
WHEN pipeline.status = PAUSED AND recovery requested
LOAD checkpoint from pipeline.checkpointData
DETERMINE resume point:
  - If mid-S4: resume from last completed episode + 1
  - If mid-S5: resume from last completed episode + 1
  - Else: resume from lastCompletedStep + 1
SET pipeline.status = RUNNING
CONTINUE execution
```

### DR-13: Force Restart Decision
```
WHEN force restart requested for pipeline
IF pipeline.status IN [PAUSED, FAILED, STUCK]
THEN:
  - Clear checkpointData
  - Reset revisionCount to 0
  - Delete all StepExecutions (except S1 which is on Book)
  - SET pipeline.status = RUNNING
  - Start from S2
```

### DR-14: LLM Fallback Decision
```
WHEN calling LLM API
TRY primary provider (Claude Sonnet 4)
IF fails with retriable error AND retryCount < 2
THEN retry primary
ELSE IF fails
THEN switch to fallback provider (GPT-4)
IF fallback fails
THEN mark step as FAILED
```

### DR-15: Validation Failure Decision
```
WHEN LLM returns response
EXECUTE validation layers:
1. JSON syntax check
2. Schema validation  
3. Business validation

IF any layer fails AND retryCount < MAX_VALIDATION_RETRY (2)
THEN retry LLM call with error feedback in prompt
ELSE mark step as FAILED with validation error
```

### DR-16: Timeout Decision
```
WHEN pipeline.startedAt + 2 hours < NOW
AND pipeline.status = RUNNING
THEN:
  - Save checkpoint
  - SET pipeline.status = PAUSED
  - CREATE alert: PIPELINE_TIMEOUT
```

### DR-17: Stuck Progress Detection
```
EVERY 5 minutes check active pipelines
IF pipeline.lastProgressUpdate + 15 minutes < NOW
AND pipeline.status = RUNNING
THEN CREATE alert: PIPELINE_STUCK_PROGRESS
```

### DR-18: Deploy Decision
```
WHEN deploy requested for pipeline
IF pipeline.status = APPROVED
AND Course exists with status = APPROVED
THEN:
  - SET Course.status = DEPLOYED
  - SET Course.deployedAt = NOW
  - SET pipeline.status = DEPLOYED
```

---

## 3.2 Business Rules

### BR-01: Title Uniqueness
```
CONSTRAINT: Book.title MUST be unique across all books
ENFORCEMENT: Database unique constraint + API validation
VIOLATION: Reject with "A book with this title already exists"
```

### BR-02: Pipeline Eligibility
```
CONSTRAINT: Only DIAMOND or GOLD verdict books can start pipeline
ENFORCEMENT: isPipelineEligible flag check
VIOLATION: Reject with "Book evaluation score does not meet minimum requirements"
```

### BR-03: Minimum Chapter Requirement
```
CONSTRAINT: Book MUST have at least 1 chapter before pipeline can start
ENFORCEMENT: API validation on pipeline start
VIOLATION: Reject with "Add at least one chapter before starting pipeline"
```

### BR-04: Chapter Immutability
```
CONSTRAINT: Chapters CANNOT be modified once pipeline starts
ENFORCEMENT: chaptersLocked flag check
VIOLATION: Reject with "Chapters are locked while pipeline is active or completed"
```

### BR-05: One Book One Course
```
CONSTRAINT: A Book can have at most ONE pipeline with status IN [APPROVED, DEPLOYED]
ENFORCEMENT: Check before pipeline start
VIOLATION: Reject pipeline start with "Book already has completed course"
```

### BR-06: Chapter Minimum Words
```
CONSTRAINT: Each chapter content MUST have minimum 500 words
ENFORCEMENT: API validation on chapter add/edit
VIOLATION: Reject with "Chapter content must be at least 500 words"
```

### BR-07: Episode Count Range
```
CONSTRAINT: Course.totalEpisodes MUST be between 5 and 8
ENFORCEMENT: S3 validation
VIOLATION: S3 fails validation, retry with adjusted prompt
```

### BR-08: Practice Session Count
```
CONSTRAINT: Course MUST have exactly 9 practice sessions (3 BASIC, 3 INTERMEDIATE, 3 ADVANCED)
ENFORCEMENT: S6 validation
VIOLATION: S6 fails validation
```

### BR-09: Questions Per Session
```
CONSTRAINT: Each PracticeSession MUST have exactly 3 questions
ENFORCEMENT: S6 validation
VIOLATION: S6 fails validation
```

### BR-10: Answers Per Question
```
CONSTRAINT: Each Question MUST have exactly 3 answers (one BEST, one ACCEPTABLE, one POOR)
ENFORCEMENT: S6 validation
VIOLATION: S6 fails validation
```

### BR-11: Word Count Compliance
```
CONSTRAINT: Episode.textContent word count MUST be between 745-1295 words
ENFORCEMENT: S5 validation
VIOLATION: S5 quality check fails, may retry
```

### BR-12: Maximum Revision Cycles
```
CONSTRAINT: Pipeline can have at most 3 revision cycles
ENFORCEMENT: DR-06
VIOLATION: Pipeline enters STUCK status
```

### BR-13: Maximum Step Retries
```
CONSTRAINT: Each step can be retried at most 2 times
ENFORCEMENT: DR-05
VIOLATION: Step enters EXHAUSTED status, pipeline fails
```

### BR-14: Maximum Validation Retries
```
CONSTRAINT: Validation failures can trigger at most 2 retries
ENFORCEMENT: DR-15
VIOLATION: Step fails
```

### BR-15: Concurrent Episode Limit
```
CONSTRAINT: Maximum 5 episodes can be processed in parallel
ENFORCEMENT: DR-07
VIOLATION: Queue additional episodes
```

### BR-16: Pipeline Timeout
```
CONSTRAINT: Pipeline must complete within 2 hours
ENFORCEMENT: DR-16
VIOLATION: Pipeline paused, alert raised
```

### BR-17: Feedback Word Count
```
CONSTRAINT: Answer.feedback MUST be between 30-50 words
ENFORCEMENT: S6 validation
VIOLATION: S6 quality check fails
```

### BR-18: Question Format Variety
```
CONSTRAINT: Each practice session MUST use at least 2 different question formats
ENFORCEMENT: S6 validation
VIOLATION: S6 quality check fails
```

### BR-19: All Skills Coverage
```
CONSTRAINT: All skills in skillsSummary MUST be tested at least twice across practices
ENFORCEMENT: S6 coverage matrix validation against S3 skillsSummary
VIOLATION: S6 quality check fails
```

### BR-20: Learning Objective Format
```
CONSTRAINT: Learning objective MUST follow format "After this episode, learner will be able to [OBSERVABLE BEHAVIOR] in [SPECIFIC SITUATION]"
ENFORCEMENT: S3 validation
VIOLATION: S3 quality check fails
```

### BR-21: Evidence Text Placement
```
CONSTRAINT: Evidence texts CANNOT be placed back-to-back in audio script
ENFORCEMENT: S5 validation
VIOLATION: S5 quality check fails
```

### BR-22: Platform Persona Compliance
```
CONSTRAINT: Audio script MUST maintain platform persona (calm, confident expert)
ENFORCEMENT: S5 quality validation
VIOLATION: S5 quality check fails
```

### BR-23: No Script Drift in Draft
```
CONSTRAINT: S4 draft MUST NOT contain script-style elements (conversational openers, rhetorical questions, etc.)
ENFORCEMENT: S4 no_script_drift validation
VIOLATION: S4 quality check fails
```

### BR-24: Key Point Preservation
```
CONSTRAINT: All S3 key points MUST appear in S4 draft and S5 script
ENFORCEMENT: S4, S5, S7 validation
VIOLATION: Quality check fails
```

### BR-25: Language Consistency
```
CONSTRAINT: All content within a pipeline MUST be in the same language (default: English)
ENFORCEMENT: All steps
VIOLATION: Validation fails
```

### BR-26: User Authorization
```
CONSTRAINT: Only users with role "ContentCreator" or "Admin" can manage books and pipelines
ENFORCEMENT: API authorization
VIOLATION: 403 Forbidden
```

### BR-27: Skills Summary Required
```
CONSTRAINT: S3 output MUST include skills_summary with foundational, combined, and integrated skills
ENFORCEMENT: S3 schema validation
VIOLATION: S3 fails validation
```

---

# 4. API SURFACE

## 4.1 Commands

### CMD-01: RegisterBook
```yaml
Name: RegisterBook
Description: Register a new book and trigger S1 evaluation
Authorization: ContentCreator, Admin
Input:
  title: string (required, unique)
  description: string (required, min 100 chars)
  bookLink: string (optional, URL)
  language: string (default: "en")
Validation:
  - title not empty, unique
  - description min 100 characters
Process:
  - Check title uniqueness
  - Create Book record
  - Execute S1 LLM call
  - Update Book with S1 results
Output:
  bookId: UUID
  s1Verdict: DIAMOND | GOLD | REJECTED
  s1Score: number
  isPipelineEligible: boolean
  s1Output: object (summary)
Events:
  - BookRegistered
  - BookEvaluated
```

### CMD-02: AddChapter
```yaml
Name: AddChapter
Description: Add a chapter to a book
Authorization: ContentCreator, Admin
Input:
  bookId: UUID (required)
  chapterNumber: number (optional, auto-increment)
  chapterTitle: string (optional)
  content: string (required, min 500 words)
Validation:
  - Book exists
  - Book.isPipelineEligible = true
  - Book.chaptersLocked = false
  - Content min 500 words
  - chapterNumber unique per book
Output:
  chapterId: UUID
  chapterNumber: number
  wordCount: number
Events:
  - ChapterAdded
```

### CMD-03: UpdateChapter
```yaml
Name: UpdateChapter
Description: Update an existing chapter
Authorization: ContentCreator, Admin
Input:
  chapterId: UUID (required)
  chapterTitle: string (optional)
  content: string (optional, min 500 words if provided)
Validation:
  - Chapter exists
  - Book.chaptersLocked = false
Output:
  success: boolean
  wordCount: number
Events:
  - ChapterUpdated
```

### CMD-04: DeleteChapter
```yaml
Name: DeleteChapter
Description: Delete a chapter
Authorization: ContentCreator, Admin
Input:
  chapterId: UUID (required)
Validation:
  - Chapter exists
  - Book.chaptersLocked = false
Output:
  success: boolean
Events:
  - ChapterDeleted
```

### CMD-05: StartPipeline
```yaml
Name: StartPipeline
Description: Start content pipeline for a book (S2-S7)
Authorization: ContentCreator, Admin
Input:
  bookId: UUID (required)
Validation:
  - Book exists
  - Book.isPipelineEligible = true
  - Book has at least 1 chapter
  - No active or completed pipeline exists
Process:
  - Lock chapters
  - Create PipelineRun
  - Start from S2
Output:
  pipelineRunId: UUID
  status: CREATED
Events:
  - ChaptersLocked
  - PipelineCreated
  - PipelineStarted
```

### CMD-06: CancelPipeline
```yaml
Name: CancelPipeline
Description: Cancel a running pipeline
Authorization: ContentCreator, Admin (initiator or admin)
Input:
  pipelineRunId: UUID
  reason: string (optional)
Validation:
  - Pipeline exists
  - Pipeline.status IN [RUNNING, PAUSED, WAITING_REVIEW]
Output:
  success: boolean
Events:
  - PipelineCancelled
```

### CMD-07: ResumePipeline
```yaml
Name: ResumePipeline
Description: Resume a paused pipeline from checkpoint
Authorization: ContentCreator, Admin
Input:
  pipelineRunId: UUID
Validation:
  - Pipeline exists
  - Pipeline.status = PAUSED
  - checkpointData exists
Output:
  success: boolean
  resumeFrom: step/episode info
Events:
  - PipelineResumed
```

### CMD-08: RestartPipeline
```yaml
Name: RestartPipeline
Description: Force restart pipeline from S2
Authorization: Admin only
Input:
  pipelineRunId: UUID
Validation:
  - Pipeline exists
  - Pipeline.status IN [PAUSED, FAILED, STUCK]
Output:
  success: boolean
Events:
  - PipelineRestarted
```

### CMD-09: SubmitHumanReview
```yaml
Name: SubmitHumanReview
Description: Submit human review decision
Authorization: ContentCreator, Admin
Input:
  pipelineRunId: UUID
  stepType: S2 | S7
  decision: APPROVED | REJECTED | CONTINUE_PARTIAL | CANCEL
  comments: string (optional)
  selectedIdeaId: string (for S2 only, if selecting different idea)
Validation:
  - Pipeline exists
  - Pipeline.status = WAITING_REVIEW
  - stepType matches current pending review
Output:
  success: boolean
  nextAction: string
Events:
  - HumanReviewSubmitted
  - PipelineResumed (if approved)
  - PipelineCancelled (if rejected)
```

### CMD-10: DeployCourse
```yaml
Name: DeployCourse
Description: Deploy an approved course
Authorization: Admin only
Input:
  courseId: UUID
Validation:
  - Course exists
  - Course.status = APPROVED
Output:
  success: boolean
  deployedAt: timestamp
Events:
  - CourseDeployed
```

### CMD-11: ResolveStuckPipeline
```yaml
Name: ResolveStuckPipeline
Description: Resolve a stuck pipeline with human decision
Authorization: Admin only
Input:
  pipelineRunId: UUID
  decision: RESTART | CANCEL | APPROVE_ANYWAY
  comments: string
Validation:
  - Pipeline exists
  - Pipeline.status = STUCK
Output:
  success: boolean
Events:
  - StuckPipelineResolved
  - PipelineRestarted | PipelineCancelled | PipelineApproved
```

### CMD-12: RetryStep
```yaml
Name: RetryStep
Description: Manually retry a failed step
Authorization: Admin only
Input:
  stepExecutionId: UUID
Validation:
  - StepExecution exists
  - StepExecution.status IN [FAILED, EXHAUSTED]
  - Pipeline.status allows retry
Output:
  success: boolean
  newExecutionId: UUID
Events:
  - StepRetryInitiated
```

---

## 4.2 Queries

### QRY-01: ListBooks
```yaml
Name: ListBooks
Description: List all books with filters
Authorization: ContentCreator, Admin
Input:
  verdict: ENUM[] (optional) - DIAMOND, GOLD, REJECTED
  isPipelineEligible: boolean (optional)
  hasChapters: boolean (optional)
  hasPipeline: boolean (optional)
  search: string (optional) - title search
  page: number
  pageSize: number
Output:
  books: Book[] (summary with chapter count, pipeline status)
  total: number
```

### QRY-02: GetBook
```yaml
Name: GetBook
Description: Get book details with chapters
Authorization: ContentCreator, Admin
Input:
  bookId: UUID
Output:
  book: Book (full details)
  chapters: BookChapter[]
  s1Execution: StepExecution (if exists)
  pipelineStatus: string | null
  courseStatus: string | null
```

### QRY-03: GetBookChapters
```yaml
Name: GetBookChapters
Description: Get all chapters for a book
Authorization: ContentCreator, Admin
Input:
  bookId: UUID
Output:
  chapters: BookChapter[]
  totalWordCount: number
```

### QRY-04: GetPipeline
```yaml
Name: GetPipeline
Description: Get pipeline details
Authorization: ContentCreator, Admin
Input:
  pipelineRunId: UUID
Output:
  pipeline: PipelineRun (full details)
  book: Book (basic info)
  currentStep: StepExecution (if running)
  stepHistory: StepExecution[] (summary)
```

### QRY-05: ListPipelines
```yaml
Name: ListPipelines
Description: List pipelines with filters
Authorization: ContentCreator, Admin
Input:
  status: ENUM[] (optional)
  initiatedBy: UUID (optional)
  dateFrom: timestamp (optional)
  dateTo: timestamp (optional)
  page: number
  pageSize: number
Output:
  pipelines: PipelineRun[] (summary with book info)
  total: number
```

### QRY-06: GetStepExecution
```yaml
Name: GetStepExecution
Description: Get step execution details with full output
Authorization: ContentCreator, Admin
Input:
  stepExecutionId: UUID
Output:
  execution: StepExecution (full with outputData)
```

### QRY-07: GetPipelineSteps
```yaml
Name: GetPipelineSteps
Description: Get all step executions for a pipeline
Authorization: ContentCreator, Admin
Input:
  pipelineRunId: UUID
Output:
  steps: StepExecution[] (summary with key output fields)
```

### QRY-08: GetCourse
```yaml
Name: GetCourse
Description: Get course details
Authorization: Any authenticated
Input:
  courseId: UUID
Output:
  course: Course (full details)
```

### QRY-09: ListCourses
```yaml
Name: ListCourses
Description: List courses with filters
Authorization: Any authenticated
Input:
  status: ENUM[] (optional)
  language: string (optional)
  page: number
  pageSize: number
Output:
  courses: Course[] (summary)
  total: number
```

### QRY-10: GetCourseEpisodes
```yaml
Name: GetCourseEpisodes
Description: Get all episodes for a course
Authorization: Any authenticated
Input:
  courseId: UUID
Output:
  episodes: Episode[] (with textContent)
```

### QRY-11: GetCoursePractices
```yaml
Name: GetCoursePractices
Description: Get all practice sessions for a course
Authorization: Any authenticated
Input:
  courseId: UUID
Output:
  practices: PracticeSession[] (with questions and answers)
```

### QRY-12: GetPendingReviews
```yaml
Name: GetPendingReviews
Description: Get pipelines waiting for human review
Authorization: ContentCreator, Admin
Input:
  reviewType: ENUM (optional)
Output:
  pendingReviews: PipelineRun[] (with review context)
```

### QRY-13: GetPipelineProgress
```yaml
Name: GetPipelineProgress
Description: Get real-time progress for a pipeline
Authorization: ContentCreator, Admin
Input:
  pipelineRunId: UUID
Output:
  progress: number (0-100)
  currentStep: string
  currentStepProgress: number
  estimatedRemainingMinutes: number
```

### QRY-14: GetPipelineMetrics
```yaml
Name: GetPipelineMetrics
Description: Get pipeline metrics for dashboard
Authorization: Admin
Input:
  dateFrom: timestamp
  dateTo: timestamp
Output:
  totalRegistered: number
  eligibleBooks: number
  totalStarted: number
  totalCompleted: number
  totalFailed: number
  averageDurationMinutes: number
  stepFailureRates: Map<step, rate>
```

### QRY-15: GetEpisodeDetail
```yaml
Name: GetEpisodeDetail
Description: Get single episode with all data
Authorization: Any authenticated
Input:
  episodeId: UUID
Output:
  episode: Episode (full with draft and content data)
```

---

## 4.3 REST Endpoints

### Book Endpoints

| Endpoint | Method | Command/Query | Auth |
|----------|--------|---------------|------|
| `/api/v1/books` | POST | RegisterBook | ContentCreator, Admin |
| `/api/v1/books` | GET | ListBooks | ContentCreator, Admin |
| `/api/v1/books/:id` | GET | GetBook | ContentCreator, Admin |
| `/api/v1/books/:id/chapters` | GET | GetBookChapters | ContentCreator, Admin |
| `/api/v1/books/:id/chapters` | POST | AddChapter | ContentCreator, Admin |
| `/api/v1/chapters/:id` | PUT | UpdateChapter | ContentCreator, Admin |
| `/api/v1/chapters/:id` | DELETE | DeleteChapter | ContentCreator, Admin |

### Pipeline Endpoints

| Endpoint | Method | Command/Query | Auth |
|----------|--------|---------------|------|
| `/api/v1/pipelines` | POST | StartPipeline | ContentCreator, Admin |
| `/api/v1/pipelines` | GET | ListPipelines | ContentCreator, Admin |
| `/api/v1/pipelines/:id` | GET | GetPipeline | ContentCreator, Admin |
| `/api/v1/pipelines/:id/cancel` | POST | CancelPipeline | ContentCreator, Admin |
| `/api/v1/pipelines/:id/resume` | POST | ResumePipeline | ContentCreator, Admin |
| `/api/v1/pipelines/:id/restart` | POST | RestartPipeline | Admin |
| `/api/v1/pipelines/:id/review` | POST | SubmitHumanReview | ContentCreator, Admin |
| `/api/v1/pipelines/:id/resolve` | POST | ResolveStuckPipeline | Admin |
| `/api/v1/pipelines/:id/steps` | GET | GetPipelineSteps | ContentCreator, Admin |
| `/api/v1/pipelines/:id/progress` | GET | GetPipelineProgress | ContentCreator, Admin |
| `/api/v1/pipelines/pending-reviews` | GET | GetPendingReviews | ContentCreator, Admin |
| `/api/v1/pipelines/metrics` | GET | GetPipelineMetrics | Admin |
| `/api/v1/steps/:id` | GET | GetStepExecution | ContentCreator, Admin |
| `/api/v1/steps/:id/retry` | POST | RetryStep | Admin |

### Course Endpoints

| Endpoint | Method | Command/Query | Auth |
|----------|--------|---------------|------|
| `/api/v1/courses` | GET | ListCourses | Authenticated |
| `/api/v1/courses/:id` | GET | GetCourse | Authenticated |
| `/api/v1/courses/:id/deploy` | POST | DeployCourse | Admin |
| `/api/v1/courses/:id/episodes` | GET | GetCourseEpisodes | Authenticated |
| `/api/v1/courses/:id/practices` | GET | GetCoursePractices | Authenticated |
| `/api/v1/episodes/:id` | GET | GetEpisodeDetail | Authenticated |

---

# 5. CONTRACTS

## 5.1 Command Contracts

### RegisterBookCommand
```typescript
// Input
interface RegisterBookInput {
  title: string;
  description: string;
  bookLink?: string;
  language?: string; // default: "en"
}

// Output
interface RegisterBookOutput {
  bookId: string;
  title: string;
  s1Verdict: 'DIAMOND' | 'GOLD' | 'REJECTED';
  s1Score: number;
  s1VerdictConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isPipelineEligible: boolean;
  s1Summary: {
    primarySpiName: string;
    behavioralImpactStatement: string;
    greenFlags: string[];
    redFlags: string[];
  };
  evaluatedAt: string;
}
```

### AddChapterCommand
```typescript
// Input
interface AddChapterInput {
  bookId: string;
  chapterNumber?: number;
  chapterTitle?: string;
  content: string;
}

// Output
interface AddChapterOutput {
  chapterId: string;
  chapterNumber: number;
  wordCount: number;
  createdAt: string;
}
```

### StartPipelineCommand
```typescript
// Input
interface StartPipelineInput {
  bookId: string;
}

// Output
interface StartPipelineOutput {
  pipelineRunId: string;
  bookId: string;
  status: PipelineStatus;
  createdAt: string;
}
```

### SubmitHumanReviewCommand
```typescript
// Input
interface SubmitHumanReviewInput {
  pipelineRunId: string;
  stepType: 'S2' | 'S7';
  decision: 'APPROVED' | 'REJECTED' | 'CONTINUE_PARTIAL' | 'CANCEL';
  comments?: string;
  selectedIdeaId?: string; // For S2 when selecting different idea
}

// Output
interface SubmitHumanReviewOutput {
  success: boolean;
  reviewId: string;
  pipelineStatus: PipelineStatus;
  nextAction: string;
}
```

## 5.2 Query Contracts

### GetBookQuery
```typescript
// Output
interface GetBookOutput {
  id: string;
  title: string;
  description: string;
  bookLink: string | null;
  language: string;
  s1Verdict: S1Verdict | null;
  s1Score: number | null;
  s1VerdictConfidence: Confidence | null;
  isPipelineEligible: boolean;
  chaptersLocked: boolean;
  chapters: ChapterSummary[];
  totalChapters: number;
  totalWordCount: number;
  pipelineStatus: PipelineStatus | null;
  courseStatus: CourseStatus | null;
  createdAt: string;
  createdBy: UserSummary;
}

interface ChapterSummary {
  id: string;
  chapterNumber: number;
  chapterTitle: string | null;
  wordCount: number;
}
```

### GetPipelineQuery
```typescript
// Output
interface GetPipelineOutput {
  id: string;
  bookId: string;
  bookTitle: string;
  status: PipelineStatus;
  currentStep: StepType | null;
  progress: number;
  revisionCount: number;
  startedAt: string;
  completedAt: string | null;
  initiatedBy: UserSummary;
  steps: StepSummary[];
  pendingReview: PendingReviewInfo | null;
  course: CourseSummary | null;
}

interface StepSummary {
  stepType: StepType;
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
  verdict?: string;
  score?: number;
  episodeNumber?: number;
}

interface PendingReviewInfo {
  stepType: StepType;
  reviewType: ReviewType;
  waitingSince: string;
  reviewContext: any;
}
```

## 5.3 Event Contracts

### BookRegistered
```typescript
interface BookRegisteredEvent {
  eventType: 'BOOK_REGISTERED';
  timestamp: string;
  payload: {
    bookId: string;
    title: string;
    language: string;
    createdBy: string;
  };
}
```

### BookEvaluated
```typescript
interface BookEvaluatedEvent {
  eventType: 'BOOK_EVALUATED';
  timestamp: string;
  payload: {
    bookId: string;
    title: string;
    s1Verdict: S1Verdict;
    s1Score: number;
    isPipelineEligible: boolean;
    s1ExecutionId: string;
  };
}
```

### ChapterAdded
```typescript
interface ChapterAddedEvent {
  eventType: 'CHAPTER_ADDED';
  timestamp: string;
  payload: {
    chapterId: string;
    bookId: string;
    chapterNumber: number;
    wordCount: number;
    addedBy: string;
  };
}
```

### ChaptersLocked
```typescript
interface ChaptersLockedEvent {
  eventType: 'CHAPTERS_LOCKED';
  timestamp: string;
  payload: {
    bookId: string;
    pipelineRunId: string;
    totalChapters: number;
    totalWordCount: number;
  };
}
```

### PipelineCreated
```typescript
interface PipelineCreatedEvent {
  eventType: 'PIPELINE_CREATED';
  timestamp: string;
  payload: {
    pipelineRunId: string;
    bookId: string;
    bookTitle: string;
    initiatedBy: string;
    language: string;
  };
}
```

### PipelineStarted
```typescript
interface PipelineStartedEvent {
  eventType: 'PIPELINE_STARTED';
  timestamp: string;
  payload: {
    pipelineRunId: string;
    startedAt: string;
    startingStep: 'S2';
  };
}
```

### StepStarted
```typescript
interface StepStartedEvent {
  eventType: 'STEP_STARTED';
  timestamp: string;
  payload: {
    pipelineRunId: string;
    stepExecutionId: string;
    stepType: StepType;
    stepNumber: number;
    episodeNumber?: number;
  };
}
```

### StepCompleted
```typescript
interface StepCompletedEvent {
  eventType: 'STEP_COMPLETED';
  timestamp: string;
  payload: {
    pipelineRunId: string;
    stepExecutionId: string;
    stepType: StepType;
    status: 'SUCCESS' | 'FAILED' | 'EXHAUSTED';
    durationMs: number;
    outputSummary: any;
  };
}
```

### HumanReviewRequired
```typescript
interface HumanReviewRequiredEvent {
  eventType: 'HUMAN_REVIEW_REQUIRED';
  timestamp: string;
  payload: {
    pipelineRunId: string;
    stepType: StepType;
    reviewType: ReviewType;
    reviewContext: any;
  };
}
```

### HumanReviewSubmitted
```typescript
interface HumanReviewSubmittedEvent {
  eventType: 'HUMAN_REVIEW_SUBMITTED';
  timestamp: string;
  payload: {
    pipelineRunId: string;
    reviewId: string;
    stepType: StepType;
    decision: ReviewDecision;
    reviewedBy: string;
  };
}
```

### PipelineCompleted
```typescript
interface PipelineCompletedEvent {
  eventType: 'PIPELINE_COMPLETED';
  timestamp: string;
  payload: {
    pipelineRunId: string;
    finalStatus: 'APPROVED' | 'FAILED' | 'CANCELLED';
    courseId?: string;
    totalDurationMs: number;
    revisionCount: number;
  };
}
```

### CourseDeployed
```typescript
interface CourseDeployedEvent {
  eventType: 'COURSE_DEPLOYED';
  timestamp: string;
  payload: {
    courseId: string;
    pipelineRunId: string;
    bookId: string;
    courseTitle: string;
    totalEpisodes: number;
    deployedBy: string;
  };
}
```

### PipelineStuck
```typescript
interface PipelineStuckEvent {
  eventType: 'PIPELINE_STUCK';
  timestamp: string;
  payload: {
    pipelineRunId: string;
    reason: string;
    revisionCount: number;
    requiresEscalation: boolean;
  };
}
```

### EpisodeProcessed
```typescript
interface EpisodeProcessedEvent {
  eventType: 'EPISODE_PROCESSED';
  timestamp: string;
  payload: {
    pipelineRunId: string;
    stepType: 'S4' | 'S5';
    episodeNumber: number;
    status: 'SUCCESS' | 'FAILED';
    episodeTitle: string;
  };
}
```

---

# 6. CROSS-CUTTING CONCERNS

## 6.1 Audit Requirements

| Action | Audit Fields |
|--------|--------------|
| Book Registration | userId, bookId, title, timestamp |
| Chapter Add/Edit/Delete | userId, chapterId, bookId, action, timestamp |
| Pipeline Start | userId, pipelineId, bookId, timestamp |
| Step Execution | pipelineId, stepType, input hash, output hash, duration |
| Human Review | userId, pipelineId, decision, comments, timestamp |
| Course Deploy | userId, courseId, timestamp |

All audit logs stored in separate audit table with retention of 2 years.

## 6.2 Caching Strategy

| Data | Cache Type | TTL | Invalidation |
|------|------------|-----|--------------|
| Prompt Templates | Memory | 1 hour | Manual refresh |
| Book List | Redis | 5 min | On book change |
| Course List | Redis | 5 min | On deploy |
| Episode Content | Redis | 1 hour | On update |
| Pipeline Progress | None | N/A | Real-time from DB |

## 6.3 Queue/Async Operations

| Operation | Queue Name | Priority | Timeout |
|-----------|------------|----------|---------|
| S1 Evaluation | book-evaluation | HIGH | 2 min |
| Step Execution | pipeline-steps | NORMAL | 5 min |
| Episode Processing | pipeline-episodes | NORMAL | 3 min |
| LLM API Call | llm-requests | HIGH | 2 min |
| Notification | notifications | LOW | 30 sec |

## 6.4 File Storage

| Content | Storage | Path Pattern |
|---------|---------|--------------|
| Prompt Templates | Local FS | `/prompts/STEP_X_PROMPT.md` |
| LLM Raw Responses | PostgreSQL JSONB | In StepExecution.outputData |
| Course Content | PostgreSQL | In Episode.textContent |

---

# 7. OPERATIONAL

## 7.1 Error Taxonomy

| Error Code | Category | Retriable | User Message |
|------------|----------|-----------|--------------|
| BOOK-001 | DUPLICATE_TITLE | No | A book with this title already exists |
| BOOK-002 | BOOK_NOT_FOUND | No | Book not found |
| BOOK-003 | BOOK_NOT_ELIGIBLE | No | Book evaluation score does not meet requirements |
| BOOK-004 | DESCRIPTION_TOO_SHORT | No | Description must be at least 100 characters |
| CHAP-001 | CHAPTERS_LOCKED | No | Chapters are locked while pipeline is active |
| CHAP-002 | CHAPTER_TOO_SHORT | No | Chapter content must be at least 500 words |
| CHAP-003 | DUPLICATE_CHAPTER_NUMBER | No | Chapter number already exists |
| CHAP-004 | NO_CHAPTERS | No | Add at least one chapter before starting pipeline |
| PIP-001 | ACTIVE_PIPELINE_EXISTS | No | Book already has an active pipeline |
| PIP-002 | BOOK_ALREADY_HAS_COURSE | No | Book already has a completed course |
| PIP-003 | PIPELINE_NOT_FOUND | No | Pipeline not found |
| PIP-004 | INVALID_PIPELINE_STATE | No | Cannot perform this action in current state |
| LLM-001 | LLM_API_TIMEOUT | Yes | AI service temporarily unavailable |
| LLM-002 | LLM_API_RATE_LIMIT | Yes | AI service rate limited, retrying |
| LLM-003 | LLM_API_ERROR | Yes | AI service error |
| LLM-004 | LLM_RESPONSE_INVALID | Yes | AI response invalid, retrying |
| VAL-001 | JSON_PARSE_ERROR | Yes | Invalid JSON response |
| VAL-002 | SCHEMA_VALIDATION_FAILED | Yes | Response schema validation failed |
| VAL-003 | BUSINESS_VALIDATION_FAILED | Yes | Business rule validation failed |
| VAL-004 | WORD_COUNT_VIOLATION | Yes | Word count outside allowed range |
| STP-001 | STEP_EXECUTION_FAILED | Depends | Step execution failed |
| STP-002 | STEP_RETRIES_EXHAUSTED | No | Maximum retries reached |
| STP-003 | STEP_TIMEOUT | Yes | Step execution timed out |
| REV-001 | MAX_REVISIONS_EXCEEDED | No | Maximum revision cycles reached |
| REV-002 | INVALID_REVIEW_DECISION | No | Invalid review decision |
| AUTH-001 | UNAUTHORIZED | No | Authentication required |
| AUTH-002 | FORBIDDEN | No | You don't have permission |

## 7.2 Security Rules

| Rule | Implementation |
|------|----------------|
| Authentication | JWT token required for all endpoints |
| Authorization | Role-based: ContentCreator, Admin |
| Rate Limiting | 100 requests/minute per user |
| Input Validation | All inputs sanitized and validated |
| SQL Injection | Prisma parameterized queries |
| XSS Prevention | Output encoding |
| Audit Logging | All actions logged with user context |

## 7.3 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 500ms | For non-LLM endpoints |
| S1 Evaluation Time | < 60s | Book registration to verdict |
| Pipeline Start Time | < 2s | From request to S2 start |
| Step Execution Time (avg) | < 60s | Per step (excluding human review) |
| Episode Processing Time | < 90s | Per episode (S4 or S5) |
| Database Query Time (p95) | < 100ms | For standard queries |
| Concurrent Pipelines | 10 | Supported simultaneously |

## 7.4 Monitoring & Observability

### Metrics to Track

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| book_registered_total | Counter | N/A |
| book_eligible_total | Counter | N/A |
| book_rejected_total | Counter | N/A |
| pipeline_started_total | Counter | N/A |
| pipeline_completed_total | Counter | N/A |
| pipeline_failed_total | Counter | >20% of started |
| pipeline_duration_seconds | Histogram | p95 > 3600s |
| step_execution_duration_seconds | Histogram | p95 > 120s |
| step_retry_total | Counter | >15% retry rate |
| llm_api_latency_seconds | Histogram | p95 > 30s |
| llm_api_errors_total | Counter | >5% error rate |
| human_review_pending_count | Gauge | >10 pending |
| human_review_wait_seconds | Histogram | p95 > 3600s |

### Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| PipelineStuckProgress | No progress for 15 min | WARNING | Notify admin |
| PipelineTimeout | Duration > 2 hours | WARNING | Auto-pause, notify |
| HighStepFailureRate | >20% failure in 1 hour | ERROR | Investigate |
| LLMServiceDegraded | >10% errors in 10 min | ERROR | Check provider status |
| TooManyPendingReviews | >10 reviews pending | WARNING | Notify reviewers |
| HighBookRejectionRate | >50% rejection in 1 day | WARNING | Review book quality |

---

# 8. BACKOFFICE UI REQUIREMENTS

## 8.1 Screen List

| # | Screen | URL | Purpose |
|---|--------|-----|---------|
| 1 | Book List | `/backoffice/books` | List and manage books |
| 2 | Book Detail | `/backoffice/books/:id` | View book, manage chapters |
| 3 | Register Book Modal | (modal) | Register new book for evaluation |
| 4 | Add Chapter Modal | (modal) | Add chapter to book |
| 5 | Pipeline List | `/backoffice/pipelines` | List and manage pipelines |
| 6 | Pipeline Detail | `/backoffice/pipelines/:id` | View pipeline progress and details |
| 7 | S2 Human Review | `/backoffice/pipelines/:id/review/s2` | Idea selection approval |
| 8 | S7 Human Review | `/backoffice/pipelines/:id/review/s7` | Final approval |
| 9 | Course List | `/backoffice/courses` | View deployed courses |
| 10 | Course Detail | `/backoffice/courses/:id` | View course content |
| 11 | Pending Reviews | `/backoffice/reviews` | Quick access to pending reviews |

## 8.2 Screen Specifications

### 8.2.1 Book List Screen

**URL:** `/backoffice/books`

**Components:**

| Component | Type | Description |
|-----------|------|-------------|
| Verdict Filter | Multi-select | DIAMOND, GOLD, REJECTED |
| Status Filter | Multi-select | Awaiting Chapters, Ready, In Pipeline, Completed |
| Search | Text Input | Search by title |
| Book Table | Data Table | Main list |
| New Book Button | Primary Button | Open register modal |

**Table Columns:**

| Column | Sortable | Description |
|--------|----------|-------------|
| Title | Yes | Book title (clickable) |
| Verdict | Yes | 💎 DIAMOND / 🥇 GOLD / ❌ REJECTED |
| Score | Yes | S1 score (0-100) |
| Chapters | Yes | Chapter count |
| Status | No | Awaiting / Ready / In Pipeline / Deployed |
| Created | Yes | Creation date |
| Actions | No | View, Add Chapters (if eligible) |

**Status Logic:**

| Verdict | Chapters | Pipeline | Display |
|---------|----------|----------|---------|
| REJECTED | - | - | ⛔ Not Eligible |
| DIAMOND/GOLD | 0 | None | ⏳ Awaiting Chapters |
| DIAMOND/GOLD | >0 | None | ✅ Ready for Pipeline |
| DIAMOND/GOLD | >0 | Active | 🔄 Pipeline Active |
| DIAMOND/GOLD | >0 | APPROVED | ✅ Course Ready |
| DIAMOND/GOLD | >0 | DEPLOYED | 🚀 Deployed |

---

### 8.2.2 Book Detail Screen

**URL:** `/backoffice/books/:id`

**Sections:**

**Header:**
- Book title
- Verdict badge with score
- Book link (if available)
- Pipeline status
- Action buttons (Add Chapter, Start Pipeline)

**Info Cards:**
- Evaluation Summary (S1 results)
- Chapter Statistics (count, total words)
- Pipeline Info (if exists)

**Tabs:**
- Chapters (list with add/edit/delete)
- S1 Evaluation (detailed S1 output)
- Pipeline History (if any)

**Chapter List:**
- Chapter cards with number, title, word count
- Add Chapter button
- Edit/Delete actions (only if not locked)
- Lock indicator when chaptersLocked = true

**Start Pipeline Section:**
- Visible only when: isPipelineEligible = true, chapters > 0, no active pipeline
- Warning about chapter locking
- Start Pipeline button

---

### 8.2.3 Register Book Modal

**Trigger:** "New Book" button on Book List

**Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Book Title | Text | Yes | Unique, not empty |
| Book Description | Textarea | Yes | Min 100 characters |
| Book Link | URL | No | Valid URL format |
| Language | Dropdown | Yes | Default: English |

**Behavior:**
1. Submit → Check title uniqueness
2. If duplicate → Show error inline
3. If unique → Show loading, call S1
4. S1 complete → Show result modal

**Result Modal:**
- Verdict badge (DIAMOND/GOLD/REJECTED)
- Score display
- Evaluation summary
- If eligible: "Go to Book Detail" button
- If rejected: "Close" button

---

### 8.2.4 Add Chapter Modal

**Trigger:** "Add Chapter" button on Book Detail

**Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Chapter Number | Number | Yes | Auto-filled, adjustable |
| Chapter Title | Text | No | - |
| Content | Textarea | Yes | Min 500 words |

**Live Word Count:** Display current word count with validation indicator

---

### 8.2.5 Pipeline List Screen

**URL:** `/backoffice/pipelines`

**Same as v1.0 but without "New Pipeline" button** (pipelines started from Book Detail)

---

### 8.2.6 Pipeline Detail Screen

**URL:** `/backoffice/pipelines/:id`

**Same as v1.0 with updates:**
- Header shows book info
- Step timeline starts from S2 (S1 shown in Book Detail)
- Link back to Book Detail

---

### 8.2.7 S2 Human Review Screen

**URL:** `/backoffice/pipelines/:id/review/s2`

**Same as v1.0**

---

### 8.2.8 S7 Human Review Screen

**URL:** `/backoffice/pipelines/:id/review/s7`

**Same as v1.0**

---

### 8.2.9 Course List Screen

**URL:** `/backoffice/courses`

**Same as v1.0**

---

### 8.2.10 Course Detail Screen

**URL:** `/backoffice/courses/:id`

**Same as v1.0 with addition:**
- Link to source Book Detail

---

### 8.2.11 Pending Reviews Dashboard

**URL:** `/backoffice/reviews`

**Same as v1.0**

---

## 8.3 Navigation Flow
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           NAVIGATION FLOW                                     │
└──────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────┐
                          │   DASHBOARD     │
                          └────────┬────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   BOOK LIST     │     │  PIPELINE LIST  │     │  COURSE LIST    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ [+ New Book]          │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│  REGISTER BOOK  │              │                       │
│    (Modal)      │              │                       │
└────────┬────────┘              │                       │
         │ (S1 Complete)         │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│  BOOK DETAIL    │◄─────────────┼───────────────────────┤
│  - Add Chapters │              │                       │
│  - Start Pipe   │              │                       │
└────────┬────────┘              │                       │
         │ [Start Pipeline]      │                       │
         ▼                       ▼                       │
         └──────────────▶┌─────────────────┐             │
                         │ PIPELINE DETAIL │             │
                         │ - S2 Review     │             │
                         │ - S7 Review     │             │
                         └────────┬────────┘             │
                                  │ (Approved & Deploy)  │
                                  ▼                      ▼
                         ┌─────────────────┐   ┌─────────────────┐
                         │ COURSE DETAIL   │◄──│  COURSE LIST    │
                         └─────────────────┘   └─────────────────┘
```

---

# 9. S3 OUTPUT ENHANCEMENT: SKILLS_SUMMARY

## 9.1 Requirement

S3 output MUST include `skills_summary` field to enable proper skill coverage validation in S6.

## 9.2 S3 Output Addition

Add to S3 JSON output:
```json
{
  "course_outline": {
    "...existing fields...",
    
    "skills_summary": {
      "foundational_skills": [
        "Recognize when a conversation becomes crucial",
        "Identify personal emotional triggers",
        "Distinguish facts from interpretations"
      ],
      "combined_skills": [
        "Apply STATE method while managing emotions",
        "Balance candor with respect",
        "Create safety while delivering tough messages"
      ],
      "integrated_skills": [
        "Navigate complete high-stakes conversation from opening to resolution"
      ],
      "total_skills_count": 7
    },
    
    "...existing fields..."
  }
}
```

## 9.3 Derivation Rules

| Skill Type | Source | Rule |
|------------|--------|------|
| foundational_skills | FOUNDATIONAL episodes' learning objectives + key points | Skills introduced in episodes 1-2 |
| combined_skills | CORE episodes' learning objectives | Skills that combine 2+ foundational skills |
| integrated_skills | INTEGRATION episode's learning objective | End-to-end application skills |

## 9.4 S6 Usage

S6 uses `skills_summary` for:
1. `skills_inventory` population (direct mapping)
2. `coverage_matrix` validation (each skill tested 2+ times)
3. Practice scenario design (skills_tested field per session)

## 9.5 Validation

**S3 Validation:**
- skills_summary is required
- foundational_skills: min 2 items
- combined_skills: min 2 items
- integrated_skills: min 1 item
- total_skills_count matches sum of arrays

**S6 Validation:**
- All skills from S3.skills_summary must appear in coverage_matrix
- Each skill tested minimum 2 times

---

# 10. STATE MACHINES

## 10.1 Book State Machine
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          BOOK STATE MACHINE                                   │
└──────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │ CREATED  │ (title + description entered)
                              └────┬─────┘
                                   │ registerBook()
                                   ▼
                              ┌──────────┐
                              │EVALUATING│ (S1 running)
                              └────┬─────┘
                                   │ S1 completes
                         ┌─────────┴─────────┐
                         │                   │
                         ▼                   ▼
                  ┌──────────┐        ┌──────────┐
                  │ ELIGIBLE │        │ REJECTED │
                  │(DIAMOND/ │        │          │
                  │  GOLD)   │        │          │
                  └────┬─────┘        └──────────┘
                       │
                       │ addChapter()
                       ▼
                  ┌──────────┐
                  │  READY   │ (has chapters)
                  └────┬─────┘
                       │ startPipeline()
                       ▼
                  ┌──────────┐
                  │  LOCKED  │ (chaptersLocked = true)
                  └────┬─────┘
                       │ pipeline completes
                       ▼
                  ┌──────────┐
                  │ COMPLETE │ (has course)
                  └──────────┘
```

## 10.2 Pipeline Run State Machine
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE RUN STATE MACHINE                             │
└──────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │  CREATED │
                              └────┬─────┘
                                   │ start()
                                   ▼
                              ┌──────────┐
                    ┌────────▶│ RUNNING  │◀────────┐
                    │         └────┬─────┘         │
                    │              │               │
           resume() │    ┌────────┴────────┐      │ retry()
                    │    │                 │      │
                    │    ▼                 ▼      │
               ┌────┴────┐          ┌──────┴─────┐
               │ PAUSED  │          │  WAITING   │
               │(checkpoint)        │(human review)
               └─────────┘          └──────┬─────┘
                    │                      │
                    │              approve/reject
                    │                      │
                    ▼                      ▼
              ┌──────────┐          ┌──────────┐
              │  FAILED  │          │  STUCK   │
              │(max retry)│         │(max revision)
              └──────────┘          └────┬─────┘
                    │                    │
                    │         human escalation
                    │                    │
                    ▼                    ▼
              ┌──────────┐          ┌──────────┐
              │ CANCELLED│          │ APPROVED │
              └──────────┘          └────┬─────┘
                                         │
                                    deploy()
                                         │
                                         ▼
                                   ┌──────────┐
                                   │ DEPLOYED │
                                   └──────────┘
```

---

# 11. OPEN QUESTIONS

| ID | Question | Impact | Status |
|----|----------|--------|--------|
| - | No open questions | - | - |

All questions resolved in discovery phase.

---

# 12. APPENDIX

## 12.1 Glossary

| Term | Definition |
|------|------------|
| Book | Source material registered for evaluation |
| Chapter | Individual content section of a book |
| S1 Evaluation | LLM-based book suitability assessment |
| Pipeline | S2-S7 content production flow |
| Step | Individual processing stage (S1-S7) |
| Episode | Single audio lesson (5-8 minutes) |
| Practice Session | Interactive exercise unit |
| SPI | Softerise Platform Index |
| Evidence Text | Direct quote from source book |
| Human Gate | Review point requiring human approval |
| Checkpoint | Saved state for recovery |
| Skills Summary | Categorized list of skills taught in course |

## 12.2 Decision Log

| Decision ID | Description | Date | Rationale |
|-------------|-------------|------|-----------|
| DEC-01 | Manuel pipeline tetikleme | 2024 | MVP simplicity |
| DEC-07 | One book = one course | 2024 | Avoid complexity |
| DEC-13 | No token tracking | 2024 | Out of scope |
| DEC-25 | No LlamaIndex | 2024 | Stack mismatch, not needed |
| DEC-26 | S1 at book registration | 2024 | Evaluate before chapter effort |
| DEC-27 | Chapter-based content input | 2024 | Manageable input, flexibility |
| DEC-28 | Title uniqueness | 2024 | Prevent duplicates |
| DEC-29 | S3 skills_summary required | 2024 | Enable S6 skill coverage validation |

## 12.3 References

| Document | Location |
|----------|----------|
| Pipeline Framework Doc | SOFTERISE AI-DRIVEN CONTENT PIPELINE |
| S1 Prompt | step1_book_verification_prompt_final.md |
| S2 Prompt | step2_idea_inspiration_prompt_v1.1_final.md |
| S3 Prompt | step3_course_outline_prompt_v1.1_final.md |
| S4 Prompt | step4_episode_draft_prompt_final.md |
| S5 Prompt | step5_episode_content_prompt_v1.1_final.md |
| S6 Prompt | step6_practice_content_prompt_final.md |
| S7 Prompt | step7_final_evaluation_prompt_v1.1_final.md |

---

# END OF BLUEPRINT v1.1