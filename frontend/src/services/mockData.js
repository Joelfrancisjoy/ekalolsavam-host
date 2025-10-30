// Mock data for frontend-only deployment
export const mockEvents = [
  {
    id: 1,
    name: "Bharatanatyam",
    description: "Classical Indian dance form",
    category: "dance",
    date: "2024-01-15",
    start_time: "09:00",
    end_time: "11:00",
    venue: 1,
    max_participants: 50,
    judges: [1, 2],
    volunteers: [3, 4],
    is_published: true,
    venue_details: { id: 1, name: "Main Auditorium" },
    judges_details: [
      { id: 1, username: "judge1", first_name: "Dr. Priya", last_name: "Sharma" },
      { id: 2, username: "judge2", first_name: "Prof. Raj", last_name: "Kumar" }
    ],
    volunteers_details: [
      { id: 3, username: "vol1", first_name: "Anita", last_name: "Singh" },
      { id: 4, username: "vol2", first_name: "Vikram", last_name: "Patel" }
    ]
  },
  {
    id: 2,
    name: "Light Music",
    description: "Contemporary and light classical music",
    category: "music",
    date: "2024-01-15",
    start_time: "14:00",
    end_time: "16:00",
    venue: 2,
    max_participants: 30,
    judges: [1, 3],
    volunteers: [4, 5],
    is_published: true,
    venue_details: { id: 2, name: "Music Hall" },
    judges_details: [
      { id: 1, username: "judge1", first_name: "Dr. Priya", last_name: "Sharma" },
      { id: 3, username: "judge3", first_name: "Dr. Meera", last_name: "Nair" }
    ],
    volunteers_details: [
      { id: 4, username: "vol2", first_name: "Vikram", last_name: "Patel" },
      { id: 5, username: "vol3", first_name: "Sneha", last_name: "Reddy" }
    ]
  },
  {
    id: 3,
    name: "Essay Writing (Malayalam)",
    description: "Creative writing in Malayalam language",
    category: "literary",
    date: "2024-01-16",
    start_time: "10:00",
    end_time: "12:00",
    venue: 3,
    max_participants: 100,
    judges: [2, 4],
    volunteers: [3, 6],
    is_published: true,
    venue_details: { id: 3, name: "Library Hall" },
    judges_details: [
      { id: 2, username: "judge2", first_name: "Prof. Raj", last_name: "Kumar" },
      { id: 4, username: "judge4", first_name: "Dr. Lakshmi", last_name: "Menon" }
    ],
    volunteers_details: [
      { id: 3, username: "vol1", first_name: "Anita", last_name: "Singh" },
      { id: 6, username: "vol4", first_name: "Arjun", last_name: "Krishnan" }
    ]
  }
];

export const mockVenues = [
  { id: 1, name: "Main Auditorium", capacity: 200 },
  { id: 2, name: "Music Hall", capacity: 100 },
  { id: 3, name: "Library Hall", capacity: 150 },
  { id: 4, name: "Open Grounds", capacity: 500 }
];

export const mockUsers = [
  { id: 1, username: "admin", first_name: "Admin", last_name: "User", role: "admin", email: "admin@example.com" },
  { id: 2, username: "judge1", first_name: "Dr. Priya", last_name: "Sharma", role: "judge", email: "priya@example.com" },
  { id: 3, username: "judge2", first_name: "Prof. Raj", last_name: "Kumar", role: "judge", email: "raj@example.com" },
  { id: 4, username: "vol1", first_name: "Anita", last_name: "Singh", role: "volunteer", email: "anita@example.com" },
  { id: 5, username: "vol2", first_name: "Vikram", last_name: "Patel", role: "volunteer", email: "vikram@example.com" }
];

export const mockRegistrations = [
  {
    id: 1,
    event: 1,
    participant: 1,
    first_name: "John",
    last_name: "Doe",
    chess_number: "CH001",
    registration_date: "2024-01-10T10:00:00Z",
    participant_details: {
      first_name: "John",
      last_name: "Doe",
      school: { name: "ABC School" },
      section: "Class 10A"
    },
    event_details: mockEvents[0]
  },
  {
    id: 2,
    event: 2,
    participant: 2,
    first_name: "Jane",
    last_name: "Smith",
    chess_number: "CH002",
    registration_date: "2024-01-11T14:30:00Z",
    participant_details: {
      first_name: "Jane",
      last_name: "Smith",
      school: { name: "XYZ School" },
      section: "Class 9B"
    },
    event_details: mockEvents[1]
  }
];

export const mockResults = [
  {
    id: 1,
    event: 1,
    participant: 1,
    position: 1,
    score: 95,
    event_details: mockEvents[0],
    participant_details: mockRegistrations[0].participant_details
  },
  {
    id: 2,
    event: 2,
    participant: 2,
    position: 2,
    score: 88,
    event_details: mockEvents[1],
    participant_details: mockRegistrations[1].participant_details
  }
];

// Helper function to check if backend is available
export const isBackendAvailable = () => {
  // For demo purposes, assume backend is not available if no API_URL is set
  return !!process.env.REACT_APP_API_URL;
};

// Simulate API delay
export const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));
