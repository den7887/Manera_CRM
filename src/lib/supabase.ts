// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Using mock data.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Helper function to get current user
export async function getCurrentUser() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return user;
}

// Helper function to get user role
export async function getUserRole(): Promise<'parent' | 'teacher' | 'admin' | 'owner' | null> {
  const user = await getCurrentUser();
  return user?.role || null;
}

// Type definitions
export type UserRole = 'parent' | 'teacher' | 'admin' | 'owner';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  parent_id: string;
  full_name: string;
  date_of_birth?: string;
  avatar_url?: string;
  medical_info?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  user_id?: string;
  full_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  specialization?: string[];
  bio?: string;
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  teacher_id?: string;
  level?: string;
  color?: string;
  max_students: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  group_id: string;
  teacher_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  student_id: string;
  pricing_id: string;
  group_id?: string;
  status: 'active' | 'expired' | 'frozen' | 'cancelled';
  lessons_total: number;
  lessons_used: number;
  lessons_remaining?: number;
  start_date: string;
  end_date: string;
  amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  subscription_id?: string;
  student_id: string;
  parent_id?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  group_id: string;
  schedule_id?: string;
  lesson_date: string;
  present: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  created_by?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  max_participants?: number;
  price?: number;
  image_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface Pricing {
  id: string;
  name: string;
  description?: string;
  price: number;
  lessons_count: number;
  validity_days: number;
  is_trial: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Automation {
  id: string;
  name: string;
  description?: string;
  trigger: 'subscription_expiring' | 'missed_payment' | 'low_attendance' | 'birthday' | 'trial_ending';
  trigger_days?: number;
  action_type: string;
  message_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsMetrics {
  id: string;
  metric_date: string;
  total_students: number;
  active_students: number;
  new_students: number;
  churned_students: number;
  total_revenue: number;
  average_attendance: number;
  created_at: string;
}
