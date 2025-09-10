import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PostsTab from '../components/tabs/PostsTab';
import ChatsTab from '../components/tabs/ChatsTab';
import ProfileTab from '../components/tabs/ProfileTab';

const Tab = createBottomTabNavigator();

export default function Index() {
  const insets = useSafeAreaInsets();
  
  // Platform specific top padding
  const getTopPadding = () => {
    if (Platform.OS === 'android') {
      return (StatusBar.currentHeight || 0) + 10;
    }
    return insets.top;
  };
  
  return (
    <View style={[styles.container, { paddingTop: getTopPadding() }]}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1a1a1a',
            borderTopColor: '#333',
            height: 60 + (Platform.OS === 'android' ? 10 : insets.bottom),
            paddingTop: 5,
            paddingBottom: (Platform.OS === 'android' ? 10 : insets.bottom) + 8,
          },
          tabBarActiveTintColor: '#4ecdc4',
          tabBarInactiveTintColor: '#666',
        }}
      >
        <Tab.Screen
          name="Posts"
          component={PostsTab}
          options={{
            tabBarLabel: 'Посты',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="newspaper-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Chats"
          component={ChatsTab}
          options={{
            tabBarLabel: 'Чаты',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileTab}
          options={{
            tabBarLabel: 'Профиль',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
});