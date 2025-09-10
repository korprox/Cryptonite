import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileTab() {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Сменить личность',
      'Вы получите новый анонимный ID. Все ваши посты и сообщения останутся, но вы больше не сможете их редактировать.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Сменить', style: 'destructive', onPress: logout },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'information-circle-outline',
      title: 'О приложении',
      subtitle: 'Версия 1.0.0',
      onPress: () => {
        Alert.alert(
          'Криптонит',
          'Анонимное пространство для поддержки и общения.\n\nВерсия: 1.0.0\nРазработано в 2025'
        );
      },
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Конфиденциальность',
      subtitle: 'Как мы защищаем вашу анонимность',
      onPress: () => {
        Alert.alert(
          'Конфиденциальность',
          '• Полная анонимность - никаких личных данных\n• Временные ID, которые меняются при выходе\n• Локальное хранение только токена\n• Нет трекинга и аналитики'
        );
      },
    },
    {
      icon: 'flag-outline',
      title: 'Правила сообщества',
      subtitle: 'Что можно, а что нельзя',
      onPress: () => {
        Alert.alert(
          'Правила сообщества',
          '✅ Поддержка и взаимопомощь\n✅ Уважение к другим участникам\n✅ Конструктивное общение\n\n❌ Оскорбления и угрозы\n❌ Спам и реклама\n❌ Призывы к насилию\n❌ Личная информация'
        );
      },
    },
    {
      icon: 'warning-outline',
      title: 'Пожаловаться на контент',
      subtitle: 'Сообщить о нарушениях',
      onPress: () => {
        Alert.alert(
          'Как пожаловаться',
          'Используйте кнопку "Пожаловаться" в постах и комментариях. Мы рассматриваем все жалобы и принимаем меры при нарушении правил.'
        );
      },
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Профиль</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color="#4ecdc4" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>
              {user?.display_name || 'Загрузка...'}
            </Text>
            <Text style={styles.userSubtitle}>Анонимный пользователь</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon as any} size={24} color="#4ecdc4" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={20} color="#ff6b6b" />
            <Text style={styles.logoutText}>Сменить личность</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Ваши данные защищены анонимностью
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#333',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  menuSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  logoutSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b6b',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});