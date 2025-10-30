import { test as base } from '@playwright/test';

export interface TestUser {
  username: string;
  email: string;
  password: string;
  role: 'student' | 'judge' | 'admin' | 'volunteer';
  firstName: string;
  lastName: string;
  school?: string;
  specialization?: string;
}

export interface TestEvent {
  name: string;
  description: string;
  category: 'dance' | 'music' | 'theatre' | 'literary' | 'visual_arts';
  date: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  venue: string;
}

export interface TestData {
  users: {
    admin: TestUser;
    judge: TestUser;
    student: TestUser;
    volunteer: TestUser;
  };
  events: TestEvent[];
  venues: Array<{
    name: string;
    location: string;
    capacity: number;
  }>;
}

const testData: TestData = {
  users: {
    admin: {
      username: 'admin_user',
      email: 'admin@kalolsavam.com',
      password: 'AdminPass123!',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User'
    },
    judge: {
      username: 'judge_user',
      email: 'judge@kalolsavam.com',
      password: 'JudgePass123!',
      role: 'judge',
      firstName: 'Judge',
      lastName: 'User',
      specialization: 'Dance'
    },
    student: {
      username: 'student_user',
      email: 'student@kalolsavam.com',
      password: 'StudentPass123!',
      role: 'student',
      firstName: 'Student',
      lastName: 'User',
      school: 'Test School'
    },
    volunteer: {
      username: 'volunteer_user',
      email: 'volunteer@kalolsavam.com',
      password: 'VolunteerPass123!',
      role: 'volunteer',
      firstName: 'Volunteer',
      lastName: 'User'
    }
  },
  events: [
    {
      name: 'Classical Dance Competition',
      description: 'Traditional classical dance competition for students',
      category: 'dance',
      date: '2024-12-15',
      startTime: '09:00',
      endTime: '12:00',
      maxParticipants: 50,
      venue: 'Main Auditorium'
    },
    {
      name: 'Music Competition',
      description: 'Classical and folk music competition',
      category: 'music',
      date: '2024-12-16',
      startTime: '14:00',
      endTime: '17:00',
      maxParticipants: 30,
      venue: 'Music Hall'
    }
  ],
  venues: [
    {
      name: 'Main Auditorium',
      location: 'Central Campus',
      capacity: 500
    },
    {
      name: 'Music Hall',
      location: 'Arts Block',
      capacity: 200
    }
  ]
};

export const testWithData = base.extend<{
  testData: TestData;
}>({
  testData: async ({}, use) => {
    await use(testData);
  },
});

export { testData };


