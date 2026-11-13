-- Smart Career Placement & Internship Preparation Dashboard
-- MySQL 8.0+ schema. Run through `npm run db:setup` or the mysql CLI.
-- The script is idempotent and only creates tables that do not already exist.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role_id),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  college VARCHAR(180) DEFAULT NULL,
  branch VARCHAR(80) DEFAULT NULL,
  graduation_year SMALLINT UNSIGNED DEFAULT NULL,
  cgpa DECIMAL(4,2) DEFAULT NULL,
  active_backlogs TINYINT UNSIGNED DEFAULT NULL,
  tenth_percentage DECIMAL(5,2) DEFAULT NULL,
  twelfth_percentage DECIMAL(5,2) DEFAULT NULL,
  target_role VARCHAR(120) DEFAULT NULL,
  phone VARCHAR(30) DEFAULT NULL,
  bio VARCHAR(600) DEFAULT NULL,
  linkedin_url VARCHAR(500) DEFAULT NULL,
  github_url VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_profiles_branch (branch),
  KEY idx_profiles_grad_year (graduation_year),
  KEY idx_profiles_target_role (target_role),
  CONSTRAINT chk_profiles_cgpa CHECK (cgpa IS NULL OR (cgpa >= 0 AND cgpa <= 10)),
  CONSTRAINT chk_profiles_year CHECK (graduation_year IS NULL OR (graduation_year >= 2000 AND graduation_year <= 2100)),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS skills (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category ENUM('programming','framework','database','tool','concept','soft') NOT NULL DEFAULT 'concept',
  description VARCHAR(500) DEFAULT NULL,
  resource_url VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_skills_name (name),
  KEY idx_skills_category (category)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_skills (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  proficiency TINYINT UNSIGNED NOT NULL DEFAULT 3,
  source ENUM('manual','resume') NOT NULL DEFAULT 'manual',
  is_confirmed TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_skill (user_id, skill_id),
  KEY idx_student_skills_skill (skill_id),
  CONSTRAINT chk_proficiency CHECK (proficiency BETWEEN 1 AND 5),
  CONSTRAINT fk_student_skills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_preferred_roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  role_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_preferred_role (user_id, role_name),
  CONSTRAINT fk_preferred_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_projects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT DEFAULT NULL,
  tech_stack VARCHAR(500) DEFAULT NULL,
  link VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_projects_user (user_id),
  CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_certifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  issuer VARCHAR(180) DEFAULT NULL,
  issue_date DATE DEFAULT NULL,
  credential_url VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_certifications_user (user_id),
  CONSTRAINT fk_certifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS opportunities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  company VARCHAR(180) NOT NULL,
  type ENUM('internship','placement','job') NOT NULL DEFAULT 'internship',
  location VARCHAR(150) NOT NULL,
  work_mode ENUM('onsite','remote','hybrid') NOT NULL DEFAULT 'onsite',
  salary_stipend VARCHAR(120) DEFAULT NULL,
  description TEXT NOT NULL,
  min_cgpa DECIMAL(3,2) DEFAULT NULL,
  openings INT UNSIGNED DEFAULT NULL,
  application_deadline DATE NOT NULL,
  other_requirements TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_sample TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_opps_active_deadline (is_active, application_deadline),
  KEY idx_opps_type (type),
  KEY idx_opps_company (company),
  CONSTRAINT fk_opps_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS opportunity_branches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  opportunity_id BIGINT UNSIGNED NOT NULL,
  branch VARCHAR(80) NOT NULL,
  UNIQUE KEY uq_opp_branch (opportunity_id, branch),
  CONSTRAINT fk_opp_branches_opp FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS opportunity_batches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  opportunity_id BIGINT UNSIGNED NOT NULL,
  graduation_year SMALLINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_opp_batch (opportunity_id, graduation_year),
  CONSTRAINT fk_opp_batches_opp FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS opportunity_skills (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  opportunity_id BIGINT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  importance ENUM('required','preferred') NOT NULL DEFAULT 'required',
  min_proficiency TINYINT UNSIGNED NOT NULL DEFAULT 3,
  UNIQUE KEY uq_opp_skill (opportunity_id, skill_id),
  KEY idx_opp_skills_skill (skill_id),
  CONSTRAINT chk_opp_skill_prof CHECK (min_proficiency BETWEEN 1 AND 5),
  CONSTRAINT fk_opp_skills_opp FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  CONSTRAINT fk_opp_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS opportunity_requirements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  opportunity_id BIGINT UNSIGNED NOT NULL,
  type ENUM('max_backlogs','min_tenth_percentage','min_twelfth_percentage') NOT NULL,
  value DECIMAL(6,2) NOT NULL,
  label VARCHAR(180) DEFAULT NULL,
  UNIQUE KEY uq_opp_requirement (opportunity_id, type),
  CONSTRAINT fk_opp_requirements_opp FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resumes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  extracted_text MEDIUMTEXT DEFAULT NULL,
  extracted_data JSON DEFAULT NULL,
  status ENUM('processed','failed') NOT NULL DEFAULT 'processed',
  error_message VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_resumes_user_created (user_id, created_at),
  CONSTRAINT fk_resumes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookmarks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  opportunity_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bookmark (user_id, opportunity_id),
  KEY idx_bookmarks_opp (opportunity_id),
  CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmarks_opp FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS applications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  opportunity_id BIGINT UNSIGNED NOT NULL,
  status ENUM('interested','applied','assessment','interview','selected','rejected') NOT NULL DEFAULT 'interested',
  applied_date DATE DEFAULT NULL,
  assessment_date DATETIME DEFAULT NULL,
  interview_date DATETIME DEFAULT NULL,
  notes VARCHAR(2000) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_application (user_id, opportunity_id),
  KEY idx_applications_status (user_id, status),
  KEY idx_applications_interview (interview_date),
  KEY idx_applications_opp (opportunity_id),
  CONSTRAINT fk_applications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_applications_opp FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS preparation_topics (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  title VARCHAR(180) NOT NULL,
  category ENUM('DSA','Programming','Core CS','Development','Aptitude','Interviews') NOT NULL,
  description VARCHAR(600) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  estimated_minutes INT UNSIGNED NOT NULL DEFAULT 60,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_topics_slug (slug),
  KEY idx_topics_category (category)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS learning_resources (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  topic_id INT UNSIGNED DEFAULT NULL,
  title VARCHAR(200) NOT NULL,
  url VARCHAR(500) NOT NULL,
  provider VARCHAR(120) DEFAULT NULL,
  resource_type ENUM('docs','course','video','practice','article') NOT NULL DEFAULT 'article',
  is_free TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_resources_topic (topic_id),
  CONSTRAINT fk_resources_topic FOREIGN KEY (topic_id) REFERENCES preparation_topics(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS practice_tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  topic_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(1000) DEFAULT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tasks_topic (topic_id),
  CONSTRAINT fk_practice_tasks_topic FOREIGN KEY (topic_id) REFERENCES preparation_topics(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_progress (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  topic_id INT UNSIGNED NOT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_progress (user_id, topic_id),
  KEY idx_progress_topic (topic_id),
  KEY idx_progress_completed (user_id, is_completed),
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_topic FOREIGN KEY (topic_id) REFERENCES preparation_topics(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS practice_task_progress (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  task_id BIGINT UNSIGNED NOT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_practice_task_progress (user_id, task_id),
  KEY idx_task_progress_task (task_id),
  CONSTRAINT fk_task_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_progress_task FOREIGN KEY (task_id) REFERENCES practice_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS practice_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category ENUM('quantitative','logical','verbal') NOT NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  prompt TEXT NOT NULL,
  options JSON NOT NULL,
  correct_option TINYINT UNSIGNED NOT NULL,
  explanation VARCHAR(1000) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_practice_questions_category (category, is_active),
  KEY idx_practice_questions_difficulty (difficulty)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mock_tests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description VARCHAR(600) NOT NULL,
  duration_minutes INT UNSIGNED NOT NULL DEFAULT 30,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mock_tests_slug (slug),
  KEY idx_mock_tests_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mock_test_questions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mock_test_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_mock_test_question (mock_test_id, question_id),
  KEY idx_mock_test_questions_question (question_id),
  CONSTRAINT fk_mock_test_questions_test FOREIGN KEY (mock_test_id) REFERENCES mock_tests(id) ON DELETE CASCADE,
  CONSTRAINT fk_mock_test_questions_question FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS practice_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('aptitude','mock') NOT NULL,
  mock_test_id INT UNSIGNED DEFAULT NULL,
  category ENUM('quantitative','logical','verbal') DEFAULT NULL,
  total_questions INT UNSIGNED NOT NULL DEFAULT 0,
  correct_answers INT UNSIGNED NOT NULL DEFAULT 0,
  score_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  time_spent_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_practice_attempts_user (user_id, submitted_at),
  KEY idx_practice_attempts_test (mock_test_id),
  CONSTRAINT fk_practice_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_practice_attempts_test FOREIGN KEY (mock_test_id) REFERENCES mock_tests(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS practice_attempt_answers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attempt_id BIGINT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  selected_option TINYINT UNSIGNED DEFAULT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_practice_attempt_answer (attempt_id, question_id),
  KEY idx_practice_attempt_answers_question (question_id),
  CONSTRAINT fk_practice_attempt_answers_attempt FOREIGN KEY (attempt_id) REFERENCES practice_attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_practice_attempt_answers_question FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS study_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  target_role VARCHAR(120) NOT NULL,
  generated_by ENUM('rule','ai') NOT NULL DEFAULT 'rule',
  summary VARCHAR(1000) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_plans_user_created (user_id, created_at),
  CONSTRAINT fk_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS study_tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(220) NOT NULL,
  description VARCHAR(1200) DEFAULT NULL,
  skill_id INT UNSIGNED DEFAULT NULL,
  topic_id INT UNSIGNED DEFAULT NULL,
  resource_url VARCHAR(500) DEFAULT NULL,
  priority ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  target_date DATE NOT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME DEFAULT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_study_tasks_plan (plan_id),
  KEY idx_study_tasks_target (target_date),
  CONSTRAINT fk_study_tasks_plan FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_study_tasks_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL,
  CONSTRAINT fk_study_tasks_topic FOREIGN KEY (topic_id) REFERENCES preparation_topics(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS personal_notes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  topic_id INT UNSIGNED DEFAULT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_notes_user (user_id),
  KEY idx_notes_topic (topic_id),
  CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notes_topic FOREIGN KEY (topic_id) REFERENCES preparation_topics(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('deadline','assessment','interview','system') NOT NULL DEFAULT 'system',
  title VARCHAR(180) NOT NULL,
  message VARCHAR(600) NOT NULL,
  link VARCHAR(500) DEFAULT NULL,
  due_at DATETIME DEFAULT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  dedupe_key VARCHAR(190) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notification_key (user_id, dedupe_key),
  KEY idx_notifications_user (user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_skills (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(120) NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  importance ENUM('required','preferred') NOT NULL DEFAULT 'required',
  required_proficiency TINYINT UNSIGNED NOT NULL DEFAULT 3,
  UNIQUE KEY uq_role_skill (role_name, skill_id),
  KEY idx_role_skills_role (role_name),
  KEY idx_role_skills_skill (skill_id),
  CONSTRAINT chk_role_skill_prof CHECK (required_proficiency BETWEEN 1 AND 5),
  CONSTRAINT fk_role_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
