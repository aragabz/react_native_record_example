import api from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

// User API calls
export const userService = {
  // Get all users
  getUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  // Get user by ID
  getUserById: async (id: number): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  // Create new user
  createUser: async (userData: Omit<User, 'id'>): Promise<User> => {
    const response = await api.post<User>('/users', userData);
    return response.data;
  },

  // Update user
  updateUser: async (id: number, userData: Partial<User>): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, userData);
    return response.data;
  },

  // Delete user
  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  // Get user posts
  getUserPosts: async (userId: number): Promise<Post[]> => {
    const response = await api.get<Post[]>(`/users/${userId}/posts`);
    return response.data;
  },
};

export default userService;