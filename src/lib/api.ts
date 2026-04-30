// API Functions for CRM "Manera"
import { supabase } from './supabase';
import type {
  User,
  Student,
  Teacher,
  Group,
  Schedule,
  Subscription,
  Payment,
  Attendance,
  Task,
  Event,
  Message,
  Pricing,
  Automation,
  AnalyticsMetrics,
} from './supabase';

// ============================================
// AUTHENTICATION
// ============================================

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

// ============================================
// STUDENTS
// ============================================

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      parent:parents(*)
    `)
    .eq('is_active', true)
    .order('full_name');
  
  if (error) throw error;
  return data;
}

export async function getStudentById(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      parent:parents(*),
      subscriptions(*),
      attendance(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createStudent(student: Partial<Student>) {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateStudent(id: string, updates: Partial<Student>) {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('students')
    .update({ is_active: false })
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// TEACHERS
// ============================================

export async function getTeachers() {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('is_active', true)
    .order('full_name');
  
  if (error) throw error;
  return data;
}

export async function getTeacherById(id: string) {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      *,
      groups(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createTeacher(teacher: Partial<Teacher>) {
  const { data, error } = await supabase
    .from('teachers')
    .insert(teacher)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTeacher(id: string, updates: Partial<Teacher>) {
  const { data, error } = await supabase
    .from('teachers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// GROUPS
// ============================================

export async function getGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      teacher:teachers(*),
      members:group_members(
        student:students(*)
      )
    `)
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function getGroupById(id: string) {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      teacher:teachers(*),
      members:group_members(
        student:students(*)
      ),
      schedules(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createGroup(group: Partial<Group>) {
  const { data, error } = await supabase
    .from('groups')
    .insert(group)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateGroup(id: string, updates: Partial<Group>) {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// SCHEDULES
// ============================================

export async function getSchedules() {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      group:groups(*),
      teacher:teachers(*)
    `)
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time');
  
  if (error) throw error;
  return data;
}

export async function createSchedule(schedule: Partial<Schedule>) {
  const { data, error } = await supabase
    .from('schedules')
    .insert(schedule)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateSchedule(id: string, updates: Partial<Schedule>) {
  const { data, error } = await supabase
    .from('schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export async function getSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      student:students(*),
      pricing:pricing(*),
      group:groups(*)
    `)
    .order('start_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getActiveSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      student:students(*),
      pricing:pricing(*),
      group:groups(*)
    `)
    .eq('status', 'active')
    .order('end_date');
  
  if (error) throw error;
  return data;
}

export async function createSubscription(subscription: Partial<Subscription>) {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(subscription)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateSubscription(id: string, updates: Partial<Subscription>) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// PAYMENTS
// ============================================

export async function getPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      student:students(*),
      parent:parents(*),
      subscription:subscriptions(*)
    `)
    .order('payment_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function createPayment(payment: Partial<Payment>) {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updatePayment(id: string, updates: Partial<Payment>) {
  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// ATTENDANCE
// ============================================

export async function getAttendance(filters?: { 
  studentId?: string; 
  groupId?: string; 
  dateFrom?: string; 
  dateTo?: string; 
}) {
  let query = supabase
    .from('attendance')
    .select(`
      *,
      student:students(*),
      group:groups(*),
      schedule:schedules(*)
    `);
  
  if (filters?.studentId) {
    query = query.eq('student_id', filters.studentId);
  }
  
  if (filters?.groupId) {
    query = query.eq('group_id', filters.groupId);
  }
  
  if (filters?.dateFrom) {
    query = query.gte('lesson_date', filters.dateFrom);
  }
  
  if (filters?.dateTo) {
    query = query.lte('lesson_date', filters.dateTo);
  }
  
  const { data, error } = await query.order('lesson_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function markAttendance(attendance: Partial<Attendance>) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(attendance)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// TASKS
// ============================================

export async function getTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_user:users!tasks_assigned_to_fkey(*),
      created_user:users!tasks_created_by_fkey(*)
    `)
    .order('due_date');
  
  if (error) throw error;
  return data;
}

export async function createTask(task: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// EVENTS
// ============================================

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      participants:event_participants(
        student:students(*)
      )
    `)
    .order('event_date');
  
  if (error) throw error;
  return data;
}

export async function createEvent(event: Partial<Event>) {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateEvent(id: string, updates: Partial<Event>) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function registerForEvent(eventId: string, studentId: string) {
  const { data, error } = await supabase
    .from('event_participants')
    .insert({ event_id: eventId, student_id: studentId })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// MESSAGES
// ============================================

export async function getMessages(userId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey(*),
      recipient:users!messages_recipient_id_fkey(*)
    `)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function sendMessage(message: Partial<Message>) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function markMessageAsRead(id: string) {
  const { data, error } = await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// PRICING
// ============================================

export async function getPricing() {
  const { data, error } = await supabase
    .from('pricing')
    .select('*')
    .eq('is_active', true)
    .order('price');
  
  if (error) throw error;
  return data;
}

export async function createPricing(pricing: Partial<Pricing>) {
  const { data, error } = await supabase
    .from('pricing')
    .insert(pricing)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updatePricing(id: string, updates: Partial<Pricing>) {
  const { data, error } = await supabase
    .from('pricing')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// AUTOMATIONS
// ============================================

export async function getAutomations() {
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function createAutomation(automation: Partial<Automation>) {
  const { data, error } = await supabase
    .from('automations')
    .insert(automation)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateAutomation(id: string, updates: Partial<Automation>) {
  const { data, error } = await supabase
    .from('automations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// ANALYTICS
// ============================================

export async function getAnalyticsMetrics(dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from('analytics_metrics')
    .select('*');
  
  if (dateFrom) {
    query = query.gte('metric_date', dateFrom);
  }
  
  if (dateTo) {
    query = query.lte('metric_date', dateTo);
  }
  
  const { data, error } = await query.order('metric_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats() {
  // Get total students
  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  // Get active subscriptions
  const { count: activeSubscriptions } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  // Get revenue this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'completed')
    .gte('payment_date', startOfMonth.toISOString());
  
  const monthlyRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  
  // Get upcoming events
  const { count: upcomingEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'upcoming')
    .gte('event_date', new Date().toISOString());
  
  return {
    totalStudents: totalStudents || 0,
    activeSubscriptions: activeSubscriptions || 0,
    monthlyRevenue,
    upcomingEvents: upcomingEvents || 0,
  };
}
