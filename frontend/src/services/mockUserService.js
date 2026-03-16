import { mockUsers, delay } from './mockData';

const toPlainUserData = (raw) => {
  if (!raw) return {};
  if (typeof FormData !== 'undefined' && raw instanceof FormData) {
    const data = {};
    raw.forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }
  if (typeof raw === 'object') {
    return { ...raw };
  }
  return {};
};

const mockUserService = {
  login: async (email, password) => {
    await delay();
    // Demo login - accept any email/password
    const user = mockUsers[0]; // Use admin user
    return {
      access: 'mock_access_token',
      refresh: 'mock_refresh_token',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        gender: user.gender || ''
      }
    };
  },

  register: async (userData) => {
    await delay();
    const parsedData = toPlainUserData(userData);
    const newUser = {
      id: mockUsers.length + 1,
      ...parsedData,
      role: parsedData.role || 'student',
      gender: parsedData.gender || ''
    };
    mockUsers.push(newUser);
    return {
      access: 'mock_access_token',
      refresh: 'mock_refresh_token',
      user: newUser
    };
  },

  getCurrentUser: async () => {
    await delay();
    return mockUsers[0]; // Return admin user
  },

  list: async (params = {}) => {
    await delay();
    let users = [...mockUsers];
    
    if (params.role) {
      users = users.filter(u => u.role === params.role);
    }
    
    return users;
  },

  updateUser: async (id, userData) => {
    await delay();
    const index = mockUsers.findIndex(u => u.id === parseInt(id));
    if (index !== -1) {
      mockUsers[index] = { ...mockUsers[index], ...userData };
      return mockUsers[index];
    }
    throw new Error('User not found');
  },

  update: async (id, userData) => {
    await delay();
    const index = mockUsers.findIndex((u) => u.id === parseInt(id));
    if (index !== -1) {
      const patch = toPlainUserData(userData);
      mockUsers[index] = { ...mockUsers[index], ...patch };
      return mockUsers[index];
    }
    throw new Error('User not found');
  },

  deleteUser: async (id) => {
    await delay();
    const index = mockUsers.findIndex(u => u.id === parseInt(id));
    if (index !== -1) {
      mockUsers.splice(index, 1);
      return { success: true };
    }
    throw new Error('User not found');
  },

  refreshToken: async (refreshToken) => {
    await delay();
    return {
      access: 'new_mock_access_token',
      refresh: 'new_mock_refresh_token'
    };
  }
};

export default mockUserService;
