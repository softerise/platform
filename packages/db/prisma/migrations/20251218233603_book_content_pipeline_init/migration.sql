-- CreateEnum
CREATE TYPE "S1Verdict" AS ENUM ('DIAMOND', 'GOLD', 'REJECTED');

-- CreateEnum
CREATE TYPE "S1VerdictConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('CREATED', 'RUNNING', 'PAUSED', 'WAITING_REVIEW', 'FAILED', 'STUCK', 'APPROVED', 'DEPLOYED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PipelineStep" AS ENUM ('S2_IDEA_INSPIRATION', 'S3_COURSE_OUTLINE', 'S4_EPISODE_DRAFT', 'S5_EPISODE_CONTENT', 'S6_PRACTICE_CONTENT', 'S7_FINAL_EVALUATION');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('S1_BOOK_VERIFICATION', 'S2_IDEA_INSPIRATION', 'S3_COURSE_OUTLINE', 'S4_EPISODE_DRAFT', 'S5_EPISODE_CONTENT', 'S6_PRACTICE_CONTENT', 'S7_FINAL_EVALUATION');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'EXHAUSTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('APPROVED', 'DEPLOYED');

-- CreateEnum
CREATE TYPE "EpisodeType" AS ENUM ('FOUNDATIONAL', 'CORE', 'APPLICATION', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('DRAFT', 'CONTENT_READY', 'PRODUCTION_READY');

-- CreateEnum
CREATE TYPE "PracticeLevel" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "PracticeStakes" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "QuestionFormat" AS ENUM ('IMMEDIATE_RESPONSE', 'STRATEGIC_CHOICE', 'INTERNAL_PROCESS', 'BEHAVIORAL_ACTION', 'COMMUNICATION_APPROACH', 'FOLLOW_UP', 'PERSPECTIVE_TAKING');

-- CreateEnum
CREATE TYPE "AnswerQuality" AS ENUM ('BEST', 'ACCEPTABLE', 'POOR');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('IDEA_APPROVAL', 'FINAL_APPROVAL', 'STUCK_RESOLUTION', 'PARTIAL_SUCCESS_DECISION');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'CONTINUE_PARTIAL', 'CANCEL', 'RESTART');

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "book_link" VARCHAR(500),
    "language" VARCHAR(10) NOT NULL,
    "s1_verdict" "S1Verdict",
    "s1_score" DOUBLE PRECISION,
    "s1_verdict_confidence" "S1VerdictConfidence",
    "s1_primary_spi_id" VARCHAR(50),
    "s1_primary_spi_name" VARCHAR(100),
    "is_pipeline_eligible" BOOLEAN NOT NULL DEFAULT false,
    "chapters_locked" BOOLEAN NOT NULL DEFAULT false,
    "s1_output" JSONB,
    "created_by" UUID NOT NULL,
    "evaluated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_chapters" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "chapter_title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "word_count" INTEGER NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "book_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_runs" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "status" "PipelineStatus" NOT NULL DEFAULT 'CREATED',
    "current_step" "PipelineStep",
    "current_step_number" INTEGER,
    "total_steps" INTEGER NOT NULL DEFAULT 7,
    "progress" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "initiated_by" UUID,
    "revision_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "checkpoint_data" JSONB,
    "configuration" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_executions" (
    "id" UUID NOT NULL,
    "pipeline_run_id" UUID,
    "book_id" UUID,
    "step_type" "StepType" NOT NULL,
    "step_number" INTEGER NOT NULL,
    "episode_number" INTEGER,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "duration_ms" INTEGER,
    "prompt_version" VARCHAR(50),
    "llm_provider" VARCHAR(50),
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "error_message" TEXT,
    "input_snapshot" JSONB,
    "output_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "step_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "human_reviews" (
    "id" UUID NOT NULL,
    "pipeline_run_id" UUID NOT NULL,
    "step_type" "StepType" NOT NULL,
    "review_type" "ReviewType" NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "reviewed_by" UUID NOT NULL,
    "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,
    "selected_idea_id" VARCHAR(50),
    "review_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "human_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "pipeline_run_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "core_promise" TEXT,
    "language" VARCHAR(10) NOT NULL,
    "total_episodes" INTEGER NOT NULL,
    "total_duration_minutes" INTEGER,
    "total_practice_sessions" INTEGER,
    "status" "CourseStatus" NOT NULL DEFAULT 'APPROVED',
    "approved_at" TIMESTAMPTZ,
    "approved_by" UUID,
    "deployed_at" TIMESTAMPTZ,
    "target_persona" JSONB,
    "skills_summary" JSONB,
    "spi_mapping" JSONB,
    "quality_scores" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "type" "EpisodeType" NOT NULL,
    "learning_objective" TEXT,
    "estimated_duration_minutes" DECIMAL(6,2),
    "total_word_count" INTEGER,
    "text_content" TEXT,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'DRAFT',
    "draft_data" JSONB,
    "content_data" JSONB,
    "outline_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "practice_id" INTEGER NOT NULL,
    "level" "PracticeLevel" NOT NULL,
    "level_order" INTEGER NOT NULL,
    "skills_tested" TEXT[],
    "stakes" "PracticeStakes" NOT NULL,
    "scenario_situation" TEXT,
    "scenario_context" TEXT,
    "session_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "practice_session_id" UUID NOT NULL,
    "question_id" VARCHAR(50) NOT NULL,
    "question_order" INTEGER NOT NULL,
    "question_format" "QuestionFormat" NOT NULL,
    "skill_focus" VARCHAR(100),
    "question_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer_id" VARCHAR(50) NOT NULL,
    "answer_order" INTEGER NOT NULL,
    "answer_text" TEXT NOT NULL,
    "answer_quality" "AnswerQuality" NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "books_title_key" ON "books"("title");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "books"("title");

-- CreateIndex
CREATE INDEX "books_is_pipeline_eligible_idx" ON "books"("is_pipeline_eligible");

-- CreateIndex
CREATE INDEX "books_created_by_idx" ON "books"("created_by");

-- CreateIndex
CREATE INDEX "books_created_at_idx" ON "books"("created_at");

-- CreateIndex
CREATE INDEX "book_chapters_book_id_idx" ON "book_chapters"("book_id");

-- CreateIndex
CREATE INDEX "book_chapters_chapter_number_idx" ON "book_chapters"("chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "book_chapters_book_id_chapter_number_key" ON "book_chapters"("book_id", "chapter_number");

-- CreateIndex
CREATE INDEX "pipeline_runs_book_id_idx" ON "pipeline_runs"("book_id");

-- CreateIndex
CREATE INDEX "pipeline_runs_status_idx" ON "pipeline_runs"("status");

-- CreateIndex
CREATE INDEX "pipeline_runs_initiated_by_idx" ON "pipeline_runs"("initiated_by");

-- CreateIndex
CREATE INDEX "pipeline_runs_started_at_idx" ON "pipeline_runs"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_runs_book_id_key" ON "pipeline_runs"("book_id");

-- CreateIndex
CREATE INDEX "step_executions_pipeline_run_id_idx" ON "step_executions"("pipeline_run_id");

-- CreateIndex
CREATE INDEX "step_executions_book_id_idx" ON "step_executions"("book_id");

-- CreateIndex
CREATE INDEX "step_executions_step_type_idx" ON "step_executions"("step_type");

-- CreateIndex
CREATE INDEX "step_executions_status_idx" ON "step_executions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "courses_pipeline_run_id_key" ON "courses"("pipeline_run_id");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "courses_book_id_idx" ON "courses"("book_id");

-- CreateIndex
CREATE INDEX "courses_pipeline_run_id_idx" ON "courses"("pipeline_run_id");

-- CreateIndex
CREATE INDEX "episodes_course_id_idx" ON "episodes"("course_id");

-- CreateIndex
CREATE INDEX "episodes_episode_number_idx" ON "episodes"("episode_number");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_course_id_episode_number_key" ON "episodes"("course_id", "episode_number");

-- CreateIndex
CREATE INDEX "practice_sessions_course_id_idx" ON "practice_sessions"("course_id");

-- CreateIndex
CREATE INDEX "practice_sessions_level_idx" ON "practice_sessions"("level");

-- CreateIndex
CREATE INDEX "questions_practice_session_id_idx" ON "questions"("practice_session_id");

-- CreateIndex
CREATE INDEX "answers_question_id_idx" ON "answers"("question_id");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "backoffice_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "backoffice_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "backoffice_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_executions" ADD CONSTRAINT "step_executions_pipeline_run_id_fkey" FOREIGN KEY ("pipeline_run_id") REFERENCES "pipeline_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_executions" ADD CONSTRAINT "step_executions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_pipeline_run_id_fkey" FOREIGN KEY ("pipeline_run_id") REFERENCES "pipeline_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "backoffice_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_pipeline_run_id_fkey" FOREIGN KEY ("pipeline_run_id") REFERENCES "pipeline_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "backoffice_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_practice_session_id_fkey" FOREIGN KEY ("practice_session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
