import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Ошибка', 'Необходимо разрешение для доступа к галерее');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        if (images.length >= 3) {
          Alert.alert('Ограничение', 'Можно добавить максимум 3 изображения');
          return;
        }
        setImages([...images, `data:image/jpeg;base64,${result.assets[0].base64}`]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите заголовок поста');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Ошибка', 'Введите содержание поста');
      return;
    }

    if (!user?.token) {
      Alert.alert('Ошибка', 'Необходимо войти в систему');
      return;
    }

    setIsSubmitting(true);

    try {
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          images,
          tags: tagsArray,
        }),
      });

      if (response.ok) {
        Alert.alert('Успех', 'Пост опубликован!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        const errorData = await response.json();
        Alert.alert('Ошибка', errorData.detail || 'Не удалось создать пост');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Ошибка', 'Не удалось создать пост');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTopPadding = () => {
    if (Platform.OS === 'android') {
      return (StatusBar.currentHeight || 0) + 10;
    }
    return insets.top;
  };

  return (
    <View style={[styles.container, { paddingTop: getTopPadding() }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Новый пост</Text>
          <TouchableOpacity
            style={[styles.submitButton, (!title.trim() || !content.trim() || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!title.trim() || !content.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#4ecdc4" />
            ) : (
              <Text style={styles.submitButtonText}>Опубликовать</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Заголовок</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="О чем ваш пост?"
              placeholderTextColor="#666"
              maxLength={100}
            />
            <Text style={styles.characterCount}>{title.length}/100</Text>
          </View>

          {/* Content Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Содержание</Text>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Поделитесь своими мыслями, опытом или историей..."
              placeholderTextColor="#666"
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.characterCount}>{content.length}/2000</Text>
          </View>

          {/* Tags Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Теги (через запятую)</Text>
            <TextInput
              style={styles.tagsInput}
              value={tags}
              onChangeText={setTags}
              placeholder="поддержка, история, совет"
              placeholderTextColor="#666"
              maxLength={100}
            />
          </View>

          {/* Images Section */}
          <View style={styles.imagesContainer}>
            <View style={styles.imagesHeader}>
              <Text style={styles.inputLabel}>Изображения ({images.length}/3)</Text>
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handlePickImage}
                disabled={images.length >= 3}
              >
                <Ionicons name="add" size={20} color="#4ecdc4" />
                <Text style={styles.addImageText}>Добавить</Text>
              </TouchableOpacity>
            </View>
            
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.imagesPreview}>
                  {images.map((imageUri, index) => (
                    <View key={index} style={styles.imagePreviewContainer}>
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Guidelines */}
          <View style={styles.guidelines}>
            <Text style={styles.guidelinesTitle}>Правила сообщества:</Text>
            <Text style={styles.guidelinesText}>
              • Будьте уважительны к другим участникам{'\n'}
              • Не публикуйте личную информацию{'\n'}
              • Избегайте оскорблений и угроз{'\n'}
              • Помогайте и поддерживайте друг друга
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#0c0c0c',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4ecdc4',
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    minHeight: 50,
  },
  contentInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    minHeight: 120,
  },
  tagsInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    minHeight: 50,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  imagesContainer: {
    marginBottom: 24,
  },
  imagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4ecdc4',
  },
  addImageText: {
    fontSize: 12,
    color: '#4ecdc4',
    marginLeft: 4,
  },
  imagesPreview: {
    flexDirection: 'row',
  },
  imagePreviewContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginRight: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidelines: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 40,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ecdc4',
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 18,
  },
});