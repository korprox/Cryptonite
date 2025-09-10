import React from 'react';
import { Text, View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/main" />;
}