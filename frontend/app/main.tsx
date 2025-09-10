import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, StyleSheet } from 'react-native';

import PostsTab from '../components/tabs/PostsTab';
import ChatsTab from '../components/tabs/ChatsTab';
import ProfileTab from '../components/tabs/ProfileTab';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <SafeAreaView style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1a1a1a',
            borderTopColor: '#333',
            height: 60,
            paddingTop: 5,
            paddingBottom: 8,
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
});