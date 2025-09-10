import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { api } from '../utils/api';

interface User {
  id: string;
  anonymous_id: string;
  display_name: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise&lt;void&gt;;
  logout: () => Promise&lt;void&gt;;
  isAuthenticated: boolean;
}

const AuthContext = createContext&lt;AuthContextType | undefined&gt;(undefined);

export const useAuth = () =&gt; {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState&lt;User | null&gt;(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() =&gt; {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () =&gt; {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (token &amp;&amp; userData) {
        const parsedUser = JSON.parse(userData);
        setUser({ ...parsedUser, token });
      } else {
        // Auto-login for anonymous users
        await login();
      }
    } catch (error) {
      console.log('Auth check error:', error);
      await login(); // Fallback to anonymous login
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () =&gt; {
    try {
      setIsLoading(true);
      
      const response = await api.post('/auth/anonymous', {});

      if (!response.ok) {
        throw new Error('Failed to create anonymous user');
      }

      const userData = await response.json();
      
      await AsyncStorage.setItem('auth_token', userData.token);
      await AsyncStorage.setItem('user_data', JSON.stringify({
        id: userData.id,
        anonymous_id: userData.anonymous_id,
        display_name: userData.display_name,
      }));

      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Ошибка', 'Не удалось войти в приложение');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () =&gt; {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      setUser(null);
      
      // Immediately create new anonymous user
      await login();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    &lt;AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated }}&gt;
      {children}
    &lt;/AuthContext.Provider&gt;
  );
}