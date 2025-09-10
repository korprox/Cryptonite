import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageBase64(result.assets[0].base64);
    }
  };

  const removeImage = () => {
    setImageBase64('');
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите содержание поста');
      return;
    }

    if (!user?.token) {
      Alert.alert('Ошибка', 'Вы не авторизованы');
      return;
    }

    setIsSubmitting(true);

    try {
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          title: title.trim() || undefined,
          content: content.trim(),
          tags: tagsArray,
          image_base64: imageBase64 || undefined,
        }),
      });

      if (response.ok) {
        const newPost = await response.json();
        Alert.alert('Успех', 'Пост создан!', [
          { text: 'OK', onPress: () => router.push(`/post/${newPost.id}`) }
        ]);
      } else {
        const errorData = await response.text();
        console.error('Error creating post:', errorData);
        Alert.alert('Ошибка', 'Не удалось создать пост');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Ошибка', 'Не удалось создать пост');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top }]}>
      <StatusBar backgroundColor="#0a0a0a" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Создать пост</Text>
        <TouchableOpacity
          style={[styles.publishButton, (!content.trim() || isSubmitting) && styles.publishButtonDisabled]}
          onPress={handleSubmit}
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.publishButtonText}>Опубликовать</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
          <View style={styles.form}>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Заголовок (необязательно)"
              placeholderTextColor="#666"
              maxLength={100}
            />

            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="О чем вы думаете?"
              placeholderTextColor="#666"
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />

            <TextInput
              style={styles.tagsInput}
              value={tags}
              onChangeText={setTags}
              placeholder="Теги (через запятую)"
              placeholderTextColor="#666"
              maxLength={200}
            />

            {imageBase64 ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
                  style={styles.selectedImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={removeImage}
                >
                  <Ionicons name="close-circle" size={24} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                <Ionicons name="image" size={24} color="#4ecdc4" />
                <Text style={styles.imagePickerText}>Добавить изображение</Text>
              </TouchableOpacity>
            )}

            <View style={styles.guidelines}>
              <Text style={styles.guidelinesTitle}>Правила сообщества:</Text>
              <Text style={styles.guidelinesText}>
                • Будьте уважительны к другим участникам{'\n'}
                • Не публикуйте личную информацию{'\n'}
                • Избегайте оскорблений и угроз{'\n'}
                • Помните о поддержке и взаимопомощи
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  publishButton: {
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishButtonDisabled: {
    backgroundColor: '#333',
  },
  publishButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  titleInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  contentInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
  },
  tagsInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  imagePickerButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imagePickerText: {
    color: '#4ecdc4',
    fontSize: 16,
    marginLeft: 8,
  },
  guidelines: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ecdc4',
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 20,
  },
});