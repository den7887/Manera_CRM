-- CRM "Manera" - Row Level Security Policies
-- Created: 2024-11-21

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Get current user role
-- ============================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- USERS POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Admin and Owner can read all users
CREATE POLICY "Admin and Owner can read all users"
  ON users FOR SELECT
  USING (get_user_role() IN ('admin', 'owner'));

-- Owner can manage all users
CREATE POLICY "Owner can manage users"
  ON users FOR ALL
  USING (get_user_role() = 'owner');

-- ============================================
-- TEACHERS POLICIES
-- ============================================

-- Everyone can view active teachers
CREATE POLICY "Anyone can view active teachers"
  ON teachers FOR SELECT
  USING (is_active = true);

-- Admin and Owner can manage teachers
CREATE POLICY "Admin and Owner can manage teachers"
  ON teachers FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- PARENTS POLICIES
-- ============================================

-- Parents can read their own data
CREATE POLICY "Parents can read own data"
  ON parents FOR SELECT
  USING (user_id = auth.uid());

-- Parents can update their own data
CREATE POLICY "Parents can update own data"
  ON parents FOR UPDATE
  USING (user_id = auth.uid());

-- Admin and Owner can read all parents
CREATE POLICY "Admin and Owner can read all parents"
  ON parents FOR SELECT
  USING (get_user_role() IN ('admin', 'owner'));

-- Admin and Owner can manage parents
CREATE POLICY "Admin and Owner can manage parents"
  ON parents FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- STUDENTS POLICIES
-- ============================================

-- Parents can read their own students
CREATE POLICY "Parents can read own students"
  ON students FOR SELECT
  USING (
    parent_id IN (
      SELECT id FROM parents WHERE user_id = auth.uid()
    )
  );

-- Teachers can read students in their groups
CREATE POLICY "Teachers can read their students"
  ON students FOR SELECT
  USING (
    get_user_role() = 'teacher' AND
    id IN (
      SELECT gm.student_id FROM group_members gm
      JOIN groups g ON g.id = gm.group_id
      JOIN teachers t ON t.id = g.teacher_id
      WHERE t.user_id = auth.uid()
    )
  );

-- Admin and Owner can read all students
CREATE POLICY "Admin and Owner can read all students"
  ON students FOR SELECT
  USING (get_user_role() IN ('admin', 'owner'));

-- Admin and Owner can manage students
CREATE POLICY "Admin and Owner can manage students"
  ON students FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- GROUPS POLICIES
-- ============================================

-- Everyone can view active groups
CREATE POLICY "Anyone can view active groups"
  ON groups FOR SELECT
  USING (is_active = true);

-- Admin and Owner can manage groups
CREATE POLICY "Admin and Owner can manage groups"
  ON groups FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- GROUP MEMBERS POLICIES
-- ============================================

-- Parents can see their students' groups
CREATE POLICY "Parents can see their students groups"
  ON group_members FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE user_id = auth.uid()
      )
    )
  );

-- Teachers can see their groups' members
CREATE POLICY "Teachers can see their groups members"
  ON group_members FOR SELECT
  USING (
    get_user_role() = 'teacher' AND
    group_id IN (
      SELECT g.id FROM groups g
      JOIN teachers t ON t.id = g.teacher_id
      WHERE t.user_id = auth.uid()
    )
  );

-- Admin and Owner can manage group members
CREATE POLICY "Admin and Owner can manage group members"
  ON group_members FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- SCHEDULES POLICIES
-- ============================================

-- Everyone can view active schedules
CREATE POLICY "Anyone can view schedules"
  ON schedules FOR SELECT
  USING (is_active = true);

-- Admin and Owner can manage schedules
CREATE POLICY "Admin and Owner can manage schedules"
  ON schedules FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- PRICING POLICIES
-- ============================================

-- Everyone can view active pricing
CREATE POLICY "Anyone can view pricing"
  ON pricing FOR SELECT
  USING (is_active = true);

-- Admin and Owner can manage pricing
CREATE POLICY "Admin and Owner can manage pricing"
  ON pricing FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- SUBSCRIPTIONS POLICIES
-- ============================================

-- Parents can read their students' subscriptions
CREATE POLICY "Parents can read own students subscriptions"
  ON subscriptions FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE user_id = auth.uid()
      )
    )
  );

-- Teachers can read their students' subscriptions
CREATE POLICY "Teachers can read their students subscriptions"
  ON subscriptions FOR SELECT
  USING (
    get_user_role() = 'teacher' AND
    student_id IN (
      SELECT gm.student_id FROM group_members gm
      JOIN groups g ON g.id = gm.group_id
      JOIN teachers t ON t.id = g.teacher_id
      WHERE t.user_id = auth.uid()
    )
  );

-- Admin and Owner can manage subscriptions
CREATE POLICY "Admin and Owner can manage subscriptions"
  ON subscriptions FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- PAYMENTS POLICIES
-- ============================================

-- Parents can read their own payments
CREATE POLICY "Parents can read own payments"
  ON payments FOR SELECT
  USING (
    parent_id IN (
      SELECT id FROM parents WHERE user_id = auth.uid()
    )
  );

-- Admin and Owner can read all payments
CREATE POLICY "Admin and Owner can read all payments"
  ON payments FOR SELECT
  USING (get_user_role() IN ('admin', 'owner'));

-- Owner can manage payments
CREATE POLICY "Owner can manage payments"
  ON payments FOR ALL
  USING (get_user_role() = 'owner');

-- ============================================
-- ATTENDANCE POLICIES
-- ============================================

-- Parents can read their students' attendance
CREATE POLICY "Parents can read own students attendance"
  ON attendance FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE user_id = auth.uid()
      )
    )
  );

-- Teachers can manage attendance for their groups
CREATE POLICY "Teachers can manage their groups attendance"
  ON attendance FOR ALL
  USING (
    get_user_role() = 'teacher' AND
    group_id IN (
      SELECT g.id FROM groups g
      JOIN teachers t ON t.id = g.teacher_id
      WHERE t.user_id = auth.uid()
    )
  );

-- Admin and Owner can manage all attendance
CREATE POLICY "Admin and Owner can manage attendance"
  ON attendance FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- TASKS POLICIES
-- ============================================

-- Users can read tasks assigned to them
CREATE POLICY "Users can read assigned tasks"
  ON tasks FOR SELECT
  USING (assigned_to = auth.uid());

-- Users can read tasks created by them
CREATE POLICY "Users can read created tasks"
  ON tasks FOR SELECT
  USING (created_by = auth.uid());

-- Admin and Owner can manage all tasks
CREATE POLICY "Admin and Owner can manage tasks"
  ON tasks FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- EVENTS POLICIES
-- ============================================

-- Everyone can view upcoming events
CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  USING (status = 'upcoming' OR status = 'ongoing');

-- Admin and Owner can manage events
CREATE POLICY "Admin and Owner can manage events"
  ON events FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- EVENT PARTICIPANTS POLICIES
-- ============================================

-- Parents can register their students
CREATE POLICY "Parents can register own students"
  ON event_participants FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE user_id = auth.uid()
      )
    )
  );

-- Parents can view their students' registrations
CREATE POLICY "Parents can view own registrations"
  ON event_participants FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id IN (
        SELECT id FROM parents WHERE user_id = auth.uid()
      )
    )
  );

-- Admin and Owner can manage all registrations
CREATE POLICY "Admin and Owner can manage registrations"
  ON event_participants FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- MESSAGES POLICIES
-- ============================================

-- Users can read messages sent to them
CREATE POLICY "Users can read received messages"
  ON messages FOR SELECT
  USING (recipient_id = auth.uid());

-- Users can read messages sent by them
CREATE POLICY "Users can read sent messages"
  ON messages FOR SELECT
  USING (sender_id = auth.uid());

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Users can update their received messages (mark as read)
CREATE POLICY "Users can update received messages"
  ON messages FOR UPDATE
  USING (recipient_id = auth.uid());

-- ============================================
-- AUTOMATIONS POLICIES
-- ============================================

-- Admin and Owner can read automations
CREATE POLICY "Admin and Owner can read automations"
  ON automations FOR SELECT
  USING (get_user_role() IN ('admin', 'owner'));

-- Admin and Owner can manage automations
CREATE POLICY "Admin and Owner can manage automations"
  ON automations FOR ALL
  USING (get_user_role() IN ('admin', 'owner'));

-- ============================================
-- ANALYTICS METRICS POLICIES
-- ============================================

-- Owner can read all analytics
CREATE POLICY "Owner can read analytics"
  ON analytics_metrics FOR SELECT
  USING (get_user_role() = 'owner');

-- Owner can manage analytics
CREATE POLICY "Owner can manage analytics"
  ON analytics_metrics FOR ALL
  USING (get_user_role() = 'owner');
